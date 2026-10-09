// Guarded helper for the ISOLATED TEST database (Stage 2 of the verification/RBAC work).
//
// Every command first proves the target is the separate test Supabase project, never the hosted
// database in .env (whose URLs are read only to compare against).
//
//   node scripts/test-db.mjs verify [--init-marker]  isolation check; --init-marker tags an EMPTY test DB
//   node scripts/test-db.mjs deploy-existing         apply the existing prisma/migrations to the test DB
//   node scripts/test-db.mjs load-snapshot <file>    load ANONYMIZED users from a pg_dump INSERT file
//   node scripts/test-db.mjs snapshot-check <file>   read-only: snapshot vs database + anonymization proof
//   node scripts/test-db.mjs report                  read-only counts + backfill preview / post-checks
//   node scripts/test-db.mjs apply-reconcile --confirm  apply the proposed schema-drift reconciliation (one transaction)
//   node scripts/test-db.mjs apply-proposed --confirm   apply the proposed account-verification migration (one transaction)
//   node scripts/test-db.mjs drift [--schema current]  read-only diff of the test DB vs the proposed (or current) schema

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST_ENV_FILE = path.join(ROOT, '.env.test');
const MAIN_ENV_FILE = path.join(ROOT, '.env');
const PROPOSED_SCHEMA = 'prisma/proposed/schema.prisma';
const PROPOSED_MIGRATION = path.join(
  ROOT,
  'prisma/proposed/20261005120000_account_verification_and_role_assignments/migration.sql'
);
const RECONCILE_MIGRATION = path.join(ROOT, 'prisma/proposed/20261005110000_reconcile_schema_drift/migration.sql');
const IDENTITY_BUCKET = 'identity-documents';
const REQUIRED_TEST_VARS = ['TEST_DATABASE_URL', 'TEST_DIRECT_URL', 'TEST_SUPABASE_URL', 'TEST_SUPABASE_SERVICE_ROLE_KEY'];
const INSTITUTION_ROLES = ['system_admin', 'research_head', 'admin', 'library', 'tech_transfer'];

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function readEnvFile(file) {
  return existsSync(file) ? dotenv.parse(readFileSync(file)) : null;
}

function maskRef(ref) {
  return ref ? `${ref.slice(0, 4)}…` : '(unknown)';
}

function maskEmail(email) {
  return email ? email.replace(/^(.).*(@.*)$/, '$1***$2') : '(none)';
}

// Supabase project ref from https://<ref>.supabase.co, db.<ref>.supabase.co, or pooler user postgres.<ref>.
function projectRef(value) {
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const hostMatch = url.hostname.match(/^(?:db\.)?([a-z0-9]{20})\.supabase\.(?:co|in)$/i);
  if (hostMatch) return hostMatch[1].toLowerCase();
  const userMatch = decodeURIComponent(url.username || '').match(/^postgres\.([a-z0-9]{20})$/i);
  return userMatch ? userMatch[1].toLowerCase() : null;
}

function databaseIdentity(value) {
  try {
    const url = new URL(value);
    return `${decodeURIComponent(url.username)}@${url.hostname}:${url.port || '5432'}${url.pathname}`;
  } catch {
    return null;
  }
}

// Legacy Supabase service keys are JWTs carrying the project ref; newer sb_secret_ keys are opaque.
function serviceKeyRef(key) {
  const parts = String(key).split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).ref ?? null;
  } catch {
    return null;
  }
}

function sslFor(env) {
  return { rejectUnauthorized: env.TEST_DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' };
}

async function withClient(env, { readOnly }, fn) {
  const client = new pg.Client({ connectionString: env.TEST_DIRECT_URL, ssl: sslFor(env) });
  await client.connect();
  try {
    if (readOnly) {
      // Every transaction on this connection is read-only; any write fails at the server.
      await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    }
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function verifyIsolation({ initMarker = false, quiet = false } = {}) {
  const testEnv = readEnvFile(TEST_ENV_FILE);
  if (!testEnv) fail('.env.test not found. Copy .env.test.example to .env.test and fill in the TEST project values.');

  const missing = REQUIRED_TEST_VARS.filter((name) => !testEnv[name]);
  if (missing.length) fail(`.env.test is missing: ${missing.join(', ')}`);

  const mainEnv = readEnvFile(MAIN_ENV_FILE);
  if (!mainEnv) fail('.env not found, so the test project cannot be proven different from the main one. Refusing.');

  // 1. Every TEST value must identify one Supabase project...
  const testRefs = {
    TEST_DATABASE_URL: projectRef(testEnv.TEST_DATABASE_URL),
    TEST_DIRECT_URL: projectRef(testEnv.TEST_DIRECT_URL),
    TEST_SUPABASE_URL: projectRef(testEnv.TEST_SUPABASE_URL)
  };
  for (const [name, ref] of Object.entries(testRefs)) {
    if (!ref) fail(`Could not identify a Supabase project ref in ${name}.`);
  }
  const distinctTestRefs = new Set(Object.values(testRefs));
  if (distinctTestRefs.size !== 1) fail('TEST_* values point at different Supabase projects.');
  const testRef = [...distinctTestRefs][0];

  const keyRef = serviceKeyRef(testEnv.TEST_SUPABASE_SERVICE_ROLE_KEY);
  if (keyRef && keyRef !== testRef) fail('TEST_SUPABASE_SERVICE_ROLE_KEY belongs to a different project than the test URLs.');

  // 2. ...and it must not be the project (or database) configured in .env.
  const mainRefs = [mainEnv.DATABASE_URL, mainEnv.DIRECT_URL, mainEnv.SUPABASE_URL, mainEnv.NEXT_PUBLIC_SUPABASE_URL]
    .map(projectRef)
    .filter(Boolean);
  if (mainRefs.includes(testRef)) fail('The TEST project is the same Supabase project as .env (the hosted database). Refusing.');

  const mainDatabases = [mainEnv.DATABASE_URL, mainEnv.DIRECT_URL].map(databaseIdentity).filter(Boolean);
  const testDatabases = [testEnv.TEST_DATABASE_URL, testEnv.TEST_DIRECT_URL].map(databaseIdentity).filter(Boolean);
  if (testDatabases.some((identity) => mainDatabases.includes(identity))) {
    fail('A TEST database URL matches a database URL in .env. Refusing.');
  }

  // 3. The database itself must carry the test marker (or be empty, when creating it).
  const state = await withClient(testEnv, { readOnly: true }, async (client) => {
    const { rows: [info] } = await client.query(
      `SELECT current_database() AS db,
              to_regclass('thesistrack_meta.environment') IS NOT NULL AS has_marker,
              to_regclass('public."User"') IS NOT NULL AS has_user_table`
    );
    let marker = null;
    if (info.has_marker) {
      const { rows } = await client.query(`SELECT value FROM thesistrack_meta.environment WHERE key = 'role'`);
      marker = rows[0]?.value ?? null;
    }
    let userCount = 0;
    if (info.has_user_table) {
      const { rows } = await client.query('SELECT count(*)::int AS n FROM "User"');
      userCount = rows[0].n;
    }
    return { ...info, marker, userCount };
  });

  if (state.marker && state.marker !== 'test') fail(`Database marker says "${state.marker}", not "test". Refusing.`);

  if (!state.marker) {
    if (state.userCount > 0) {
      fail('Database has users but no test marker. Confirm it is the test project, then create the marker manually.');
    }
    if (!initMarker) {
      fail('Database has no test marker yet. It is empty, so re-run with: node scripts/test-db.mjs verify --init-marker');
    }
    await withClient(testEnv, { readOnly: false }, (client) =>
      client.query(
        `CREATE SCHEMA IF NOT EXISTS thesistrack_meta;
         CREATE TABLE IF NOT EXISTS thesistrack_meta.environment (key text PRIMARY KEY, value text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
         INSERT INTO thesistrack_meta.environment (key, value) VALUES ('role', 'test') ON CONFLICT (key) DO NOTHING;`
      )
    );
    state.marker = 'test';
  }

  // 4. Identity documents must go to a PRIVATE bucket in the test project.
  let bucketStatus;
  try {
    const response = await fetch(`${testEnv.TEST_SUPABASE_URL.replace(/\/$/, '')}/storage/v1/bucket/${IDENTITY_BUCKET}`, {
      headers: {
        apikey: testEnv.TEST_SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${testEnv.TEST_SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (response.ok) {
      const bucket = await response.json();
      if (bucket.public) fail(`Storage bucket "${IDENTITY_BUCKET}" is PUBLIC. Make it private before continuing.`);
      bucketStatus = 'private ✓';
    } else if (response.status === 401 || response.status === 403) {
      // Opaque sb_secret_ keys carry no project ref, so this is the proof the key belongs to the test project.
      fail(`The test project rejected TEST_SUPABASE_SERVICE_ROLE_KEY (HTTP ${response.status}). Use the TEST project's secret key.`);
    } else {
      bucketStatus = `not found (HTTP ${response.status}) — create it as a private bucket before the registration stage`;
    }
  } catch (error) {
    bucketStatus = `could not check (${error.message})`;
  }

  if (!quiet) {
    console.log('Isolation check passed');
    console.log(`  test project:      ${maskRef(testRef)} (all TEST_* values agree)`);
    console.log(`  main project(s):   ${[...new Set(mainRefs)].map(maskRef).join(', ') || '(none found)'} — different ✓`);
    console.log(`  service key:       ${keyRef ? 'belongs to the test project ✓' : 'opaque key (no project ref to compare)'}`);
    console.log(`  database marker:   ${state.marker} ✓ (database "${state.db}", ${state.userCount} users)`);
    console.log(`  identity bucket:   ${bucketStatus}`);
  }

  return testEnv;
}

function runPrisma(args) {
  const result = spawnSync(['npx', 'prisma', ...args].join(' '), { cwd: ROOT, stdio: 'inherit', shell: true });
  return result.status ?? 1;
}

// The department_map block is read from the proposed migration so the preview and the real
// backfill can never disagree.
function departmentMapSql() {
  const sql = readFileSync(PROPOSED_MIGRATION, 'utf8');
  const match = sql.match(/-- BEGIN department_map[^\n]*\n([\s\S]*?)\n-- END department_map/);
  if (!match) fail('Could not find the department_map block in the proposed migration.');
  return match[1].trim().replace(/,$/, '');
}

async function report() {
  const env = await verifyIsolation({ quiet: true });
  console.log('Read-only report (transaction is READ ONLY)\n');

  await withClient(env, { readOnly: true }, async (client) => {
    const { rows: [{ has_status, has_assignments }] } = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'accountStatus') AS has_status,
              to_regclass('public."UserRoleAssignment"') IS NOT NULL AS has_assignments`
    );

    const print = (title, rows) => {
      console.log(title);
      for (const row of rows) console.log(`  ${Object.values(row).join('  ')}`);
    };

    print('Users by role:', (await client.query(`SELECT role::text, count(*)::int FROM "User" GROUP BY 1 ORDER BY 2 DESC`)).rows);
    print('Users by raw department:', (await client.query(`SELECT coalesce(department, '(null)'), count(*)::int FROM "User" GROUP BY 1 ORDER BY 2 DESC`)).rows);
    print('Suspended users:', (await client.query(`SELECT count(*)::int FROM "User" WHERE "isSuspended"`)).rows);
    print('Department rows:', (await client.query(`SELECT id, "isActive" FROM "Department" ORDER BY id`)).rows);
    if (has_status) {
      print('Users by accountStatus:', (await client.query(`SELECT "accountStatus"::text, count(*)::int FROM "User" GROUP BY 1`)).rows);
    }

    if (!has_assignments) {
      // Preview of exactly what the proposed backfill would insert.
      const { rows } = await client.query(
        `WITH ${departmentMapSql()}
         SELECT u.id, u.role::text AS role, u.department, u.email,
                CASE WHEN u.role::text = ANY($1) THEN 'INSTITUTION'
                     WHEN m."departmentId" IS NOT NULL THEN m."departmentId"
                     ELSE 'NONE' END AS scope
         FROM "User" u
         LEFT JOIN department_map m ON m."raw" = upper(btrim(u.department))
         ORDER BY u.role, u.department NULLS FIRST`,
        [INSTITUTION_ROLES]
      );
      const byOutcome = rows.reduce((acc, row) => {
        const key = row.scope === 'INSTITUTION' || row.scope === 'NONE' ? row.scope : 'department';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      console.log('\nBackfill preview (one active assignment per user):', byOutcome);
      const exceptions = rows.filter((row) => row.scope === 'NONE');
      console.log(`Exceptions — department-scoped role, empty or unmapped department (scope NONE): ${exceptions.length}`);
      for (const row of exceptions) {
        console.log(`  ${row.id}  role=${row.role}  department=${JSON.stringify(row.department)}  ${maskEmail(row.email)}`);
      }

      const legacyLabels = rows.filter((row) => ['ICT', 'TCM OFFICE'].includes((row.department ?? '').trim().toUpperCase()));
      console.log(`\nAccounts mapped through the approved legacy labels (ICT → IT, TCM Office → TCM): ${legacyLabels.length}`);
      for (const row of legacyLabels) {
        console.log(`  ${row.id}  role=${row.role}  ${JSON.stringify(row.department)} → ${row.scope}`);
      }

      // Privilege checks on the preview (all expected 0).
      const isInstitutionRole = (row) => INSTITUTION_ROLES.includes(row.role);
      console.log('\nPrivilege checks (expected 0)');
      console.log(`  department-role accounts given INSTITUTION scope:      ${rows.filter((r) => !isInstitutionRole(r) && r.scope === 'INSTITUTION').length}`);
      console.log(`  institution-role accounts given a department scope:   ${rows.filter((r) => isInstitutionRole(r) && r.scope !== 'INSTITUTION').length}`);
      console.log(`  unmapped accounts given any department:               ${rows.filter((r) => !isInstitutionRole(r) && r.scope !== 'NONE' && !r.department).length}`);
      return;
    }

    // Post-migration checks.
    print('\nAssignments by scope type:', (await client.query(
      `SELECT CASE WHEN scope IN ('INSTITUTION','NONE') THEN scope ELSE 'department' END, status::text, count(*)::int
       FROM "UserRoleAssignment" GROUP BY 1, 2 ORDER BY 1`
    )).rows);
    print('Users with no active assignment (expected 0):', (await client.query(
      `SELECT count(*)::int FROM "User" u
       WHERE NOT EXISTS (SELECT 1 FROM "UserRoleAssignment" a WHERE a."userId" = u.id AND a.status = 'active')`
    )).rows);
    print('Assignments whose role differs from User.role (expected 0 right after backfill):', (await client.query(
      `SELECT count(*)::int FROM "UserRoleAssignment" a JOIN "User" u ON u.id = a."userId" WHERE a.role <> u.role`
    )).rows);
    print('Scope integrity violations (expected 0 each):', (await client.query(
      `SELECT
         count(*) FILTER (WHERE scope = 'NONE' AND "departmentId" IS NOT NULL)::int AS none_with_department,
         count(*) FILTER (WHERE scope = 'INSTITUTION' AND "departmentId" IS NOT NULL)::int AS institution_with_department,
         count(*) FILTER (WHERE scope NOT IN ('NONE', 'INSTITUTION') AND "departmentId" IS DISTINCT FROM scope)::int AS department_scope_mismatch,
         count(*) FILTER (WHERE scope = 'INSTITUTION' AND role::text <> ALL($1))::int AS department_role_with_institution_scope
       FROM "UserRoleAssignment"`,
      [INSTITUTION_ROLES]
    )).rows);
    print('Users with more than one active assignment right after backfill (expected 0):', (await client.query(
      `SELECT count(*)::int FROM (SELECT "userId" FROM "UserRoleAssignment" WHERE status = 'active' GROUP BY 1 HAVING count(*) > 1) t`
    )).rows);
    print('Backfill audit entries:', (await client.query(
      `SELECT action, metadata::text FROM "AuditLog" WHERE action = 'role_assignment.backfilled'`
    )).rows);
  });
}

// Minimal reader for pg_dump INSERT tuples: 'quoted''strings', NULL, true/false, numbers.
function parseTuple(text, start) {
  const values = [];
  let current = '';
  let inString = false;
  let wasString = false;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "'" && text[i + 1] === "'") { current += "'"; i++; }
      else if (ch === "'") inString = false;
      else current += ch;
      continue;
    }
    if (ch === "'") { inString = true; wasString = true; current = ''; continue; }
    if (ch === ',' || ch === ')') {
      const raw = current.trim();
      values.push(wasString ? current : raw.toUpperCase() === 'NULL' ? null : raw);
      current = '';
      wasString = false;
      if (ch === ')') break;
      continue;
    }
    current += ch;
  }
  return values;
}

function readSnapshotUsers(file) {
  if (!file || !existsSync(file)) fail('Pass the path of a pg_dump INSERT file, e.g. safe_data_dump.sql');
  const sql = readFileSync(file, 'utf8');
  const users = [];
  for (const match of sql.matchAll(/INSERT INTO public\."User" \(([^)]*)\) VALUES \(/g)) {
    const columns = match[1].split(',').map((column) => column.trim().replace(/"/g, ''));
    const values = parseTuple(sql, match.index + match[0].length - 1);
    users.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
  }
  if (!users.length) fail('No column-listed INSERT INTO public."User" statements found in that file.');
  return users;
}

// Loads users only, with everything identifying replaced: the test project never holds real emails,
// names, phone numbers, Google/Supabase links or usable password hashes. Ids, roles, departments,
// year levels and suspension flags are kept because the backfill depends on them.
async function loadSnapshot(file) {
  const users = readSnapshotUsers(file);
  const env = await verifyIsolation({ quiet: true });

  // User.passwordHash is NOT NULL in the migrated schema, so store a bcrypt hash of a random secret
  // that is discarded immediately (as the app does for Google sign-ups): no one can ever log in with it.
  const unusablePasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  await withClient(env, { readOnly: false }, async (client) => {
    await client.query('BEGIN');
    try {
      let n = 0;
      for (const user of users) {
        n += 1;
        await client.query(
          `INSERT INTO "User" (id, email, "passwordHash", name, "firstName", "lastName", "studentId", department, "yearLevel",
                               role, "isSuspended", "suspendedAt", "suspendedUntil", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"UserRole", $11, $12, $13, coalesce($14::timestamp, now()), now())
           ON CONFLICT (id) DO NOTHING`,
          [
            user.id,
            `test-user-${n}@example.test`,
            unusablePasswordHash,
            `Test User ${n}`,
            'Test',
            `User ${n}`,
            user.studentId ? `TEST-${String(n).padStart(4, '0')}` : null,
            user.department,
            user.yearLevel,
            user.role,
            user.isSuspended === 'true' || user.isSuspended === 't',
            user.suspendedAt,
            user.suspendedUntil,
            user.createdAt
          ]
        );
      }
      await client.query('COMMIT');
      console.log(`Loaded ${users.length} anonymized users into the test database.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

// Read-only: compares the loaded test users with the snapshot and proves the anonymization held.
// Prints counts and ids only — never the original personal values it is checking for.
async function snapshotCheck(file) {
  const snapshotUsers = readSnapshotUsers(file);
  const env = await verifyIsolation({ quiet: true });

  // The migrated test schema may lack columns the real database has (columns added outside the
  // migration history), so select only what exists and report the difference as schema drift.
  const WANTED = ['id', 'email', 'passwordHash', 'name', 'firstName', 'lastName', 'studentId', 'department', 'yearLevel',
    'role', 'isSuspended', 'googleSub', 'supabaseId', 'contactNumber', 'address', 'birthDate', 'profileImage',
    'displayName', 'section', 'accountSummary', 'office'];
  const { dbUsers, dbColumns } = await withClient(env, { readOnly: true }, async (client) => {
    const { rows: columnRows } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User'`
    );
    const columns = columnRows.map((row) => row.column_name);
    const selectList = WANTED.filter((column) => columns.includes(column))
      .map((column) => (column === 'role' ? 'role::text AS role' : `"${column}"`))
      .join(', ');
    const { rows } = await client.query(`SELECT ${selectList} FROM "User"`);
    return { dbUsers: rows.map((row) => ({ ...Object.fromEntries(WANTED.map((c) => [c, null])), ...row })), dbColumns: columns };
  });

  const snapshotColumns = Object.keys(snapshotUsers[0]);
  console.log('Schema: snapshot User columns vs migrated test schema');
  console.log(`  in snapshot, missing from test schema: ${snapshotColumns.filter((c) => !dbColumns.includes(c)).join(', ') || 'none'}`);
  console.log(`  in test schema, absent from snapshot:  ${dbColumns.filter((c) => !snapshotColumns.includes(c)).join(', ') || 'none'}\n`);

  const byId = new Map(dbUsers.map((user) => [user.id, user]));
  const snapshotIds = new Set(snapshotUsers.map((user) => user.id));

  // 1. Discrepancies between the snapshot and the database.
  const missingFromDb = snapshotUsers.filter((user) => !byId.has(user.id)).map((user) => user.id);
  const extraInDb = dbUsers.filter((user) => !snapshotIds.has(user.id)).map((user) => user.id);
  const fieldMismatches = [];
  for (const source of snapshotUsers) {
    const loaded = byId.get(source.id);
    if (!loaded) continue;
    const expected = {
      role: source.role,
      department: source.department,
      yearLevel: source.yearLevel,
      isSuspended: source.isSuspended === 'true' || source.isSuspended === 't'
    };
    for (const [field, value] of Object.entries(expected)) {
      if ((loaded[field] ?? null) !== (value ?? null)) fieldMismatches.push(`${source.id}.${field}`);
    }
  }

  console.log('Snapshot vs test database');
  console.log(`  snapshot users: ${snapshotUsers.length}   database users: ${dbUsers.length}`);
  console.log(`  in snapshot but missing from database: ${missingFromDb.length}${missingFromDb.length ? ` (${missingFromDb.join(', ')})` : ''}`);
  console.log(`  in database but not in snapshot:      ${extraInDb.length}${extraInDb.length ? ` (${extraInDb.join(', ')})` : ''}`);
  console.log(`  role/department/yearLevel/suspension mismatches: ${fieldMismatches.length}${fieldMismatches.length ? ` (${fieldMismatches.join(', ')})` : ''}`);

  // 2. Anonymization: every identifying column is replaced or empty...
  const snapshotHashes = new Set(snapshotUsers.map((user) => user.passwordHash).filter(Boolean));
  const shape = {
    'email is test-user-N@example.test': (u) => /^test-user-\d+@example\.test$/.test(u.email),
    'name is "Test User N"': (u) => /^Test User \d+$/.test(u.name),
    'firstName/lastName are placeholders': (u) => u.firstName === 'Test' && /^User \d+$/.test(u.lastName ?? ''),
    'studentId is empty or TEST-NNNN': (u) => u.studentId === null || /^TEST-\d{4}$/.test(u.studentId),
    'password hash replaced (no snapshot hash)': (u) => !snapshotHashes.has(u.passwordHash),
    'no Google or Supabase link': (u) => u.googleSub === null && u.supabaseId === null,
    'no contact/address/birth date/photo': (u) =>
      [u.contactNumber, u.address, u.birthDate, u.profileImage, u.displayName, u.section, u.accountSummary, u.office].every((v) => v === null)
  };
  console.log('\nAnonymization (loaded users failing each rule; expected 0)');
  const loadedUsers = dbUsers.filter((user) => snapshotIds.has(user.id));
  for (const [rule, test] of Object.entries(shape)) {
    console.log(`  ${rule.padEnd(40)} ${loadedUsers.filter((user) => !test(user)).length}`);
  }

  // ...and no original value from the snapshot appears anywhere in those columns.
  const SENSITIVE = ['email', 'passwordHash', 'name', 'firstName', 'lastName', 'studentId', 'googleSub', 'supabaseId',
    'contactNumber', 'address', 'birthDate', 'profileImage', 'displayName'];
  const dbValues = new Set();
  for (const user of dbUsers) for (const field of SENSITIVE) if (user[field]) dbValues.add(String(user[field]).toLowerCase());
  console.log('\nOriginal snapshot values found in the test database (expected 0)');
  for (const field of SENSITIVE) {
    const originals = snapshotUsers.map((user) => user[field]).filter((value) => value && value.length > 3);
    const leaked = originals.filter((value) => dbValues.has(String(value).toLowerCase())).length;
    console.log(`  ${field.padEnd(16)} ${leaked} of ${originals.length} original values`);
  }
}

// Applies one proposed migration file to the TEST database in a single explicit transaction: if any
// statement (or a postcondition check) fails, nothing is applied. Not recorded in _prisma_migrations,
// because the file is not part of prisma/migrations yet.
async function applyProposedFile(file, label, confirmed) {
  if (!confirmed) fail(`Applying the ${label} needs --confirm.`);
  const env = await verifyIsolation({ quiet: true });
  const sql = readFileSync(file, 'utf8');

  await withClient(env, { readOnly: false }, async (client) => {
    client.on('notice', (notice) => console.log(`  notice: ${notice.message}`));
    await client.query(`BEGIN;\n${sql}\nCOMMIT;`).catch(async (error) => {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    });
  });
  console.log(`${label} applied to the TEST database (one transaction, committed).`);
}

const [command, ...rest] = process.argv.slice(2);

try {
  switch (command) {
    case 'verify':
      await verifyIsolation({ initMarker: rest.includes('--init-marker') });
      break;
    case 'deploy-existing':
      await verifyIsolation({ quiet: true });
      process.exit(runPrisma(['migrate', 'deploy', '--config', 'prisma.test.config.ts']));
      break;
    case 'load-snapshot':
      await loadSnapshot(rest[0] && path.resolve(rest[0]));
      break;
    case 'snapshot-check':
      await snapshotCheck(rest[0] && path.resolve(rest[0]));
      break;
    case 'report':
      await report();
      break;
    case 'apply-reconcile':
      await applyProposedFile(RECONCILE_MIGRATION, 'Reconciliation migration', rest.includes('--confirm'));
      break;
    case 'apply-proposed':
      await applyProposedFile(PROPOSED_MIGRATION, 'Account-verification migration', rest.includes('--confirm'));
      break;
    case 'drift': {
      // Read-only: `migrate diff` introspects the database and prints differences; it never applies them.
      // --schema current compares with prisma/schema.prisma (pure drift); the default is the proposed schema.
      // Exit code 0 = no differences, 2 = differences found, 1 = error.
      await verifyIsolation({ quiet: true });
      const target = rest.includes('--schema') && rest[rest.indexOf('--schema') + 1] === 'current' ? 'prisma/schema.prisma' : PROPOSED_SCHEMA;
      console.log(`Comparing the TEST database with ${target}`);
      const result = spawnSync(
        ['npx', 'prisma', 'migrate', 'diff', '--config', 'prisma.test.config.ts', '--from-config-datasource', '--to-schema', target, '--script'].join(' '),
        { cwd: ROOT, shell: true, encoding: 'utf8' }
      );
      if (result.status !== 0) {
        console.error(result.stderr || result.stdout);
        fail('prisma migrate diff failed.');
      }
      const statements = (result.stdout.match(/^(CREATE|ALTER|DROP|COMMENT|INSERT|UPDATE|DELETE)\b.*$/gm) || []);
      if (statements.length) {
        console.log(result.stdout);
        console.log(`DRIFT: ${statements.length} difference(s) found.`);
        process.exit(2);
      }
      console.log(result.stdout.trim().split('\n').filter((line) => line.startsWith('--')).join('\n') || '(no statements)');
      console.log('DRIFT: none — the database matches the schema exactly.');
      break;
    }
    default:
      console.log('Usage: node scripts/test-db.mjs <verify [--init-marker] | deploy-existing | load-snapshot <file> | snapshot-check <file> | report | apply-reconcile --confirm | apply-proposed --confirm | drift [--schema current]>');
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  fail(error.message);
}
