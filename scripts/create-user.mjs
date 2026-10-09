import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { config } from 'dotenv';
import pg from 'pg';

config();

const { Pool } = pg;

const roleMap = new Map([
  ['admin', 'system_admin'],
  ['system_admin', 'system_admin'],
  ['super_admin', 'system_admin'],
  ['research_head', 'research_head'],
  ['student', 'student'],
  ['adviser', 'adviser'],
  ['panel', 'panel'],
  ['panelist', 'panel'],
  ['program_head', 'program_head'],
  ['partner', 'partner'],
  ['tech_transfer', 'tech_transfer'],
  ['library', 'library'],
  ['focal_person', 'focal_person'],
  ['secretary', 'secretary'],
]);

// Mirrors src/lib/rbac (catalog.ts and departments.ts), which this plain Node script can't import:
// institution roles get scope 'INSTITUTION'; department roles get the mapped Department.id, or 'NONE'.
const INSTITUTION_ROLES = new Set(['system_admin', 'research_head', 'admin', 'library', 'tech_transfer']);
const DEPARTMENT_ALIASES = {
  BSIT: 'IT', BSMET: 'MET', BSTCM: 'TCM', BSESM: 'ESM', BSNAME: 'NAME',
  IT: 'IT', MET: 'MET', TCM: 'TCM', ESM: 'ESM', NAME: 'NAME',
  ICT: 'IT', 'TCM OFFICE': 'TCM',
};

function scopeForRole(role, department) {
  if (INSTITUTION_ROLES.has(role)) {
    return { scope: 'INSTITUTION', departmentId: null };
  }

  const departmentId = DEPARTMENT_ALIASES[String(department ?? '').trim().toUpperCase()] ?? null;
  return departmentId ? { scope: departmentId, departmentId } : { scope: 'NONE', departmentId: null };
}

// The account is active and holds exactly this role: other active roles are revoked (this script replaces
// the role, as it always has), the role is granted or reactivated, and both are recorded in the audit log.
async function assignOnlyRole(client, userId, role, department) {
  const { scope, departmentId } = scopeForRole(role, department);
  const source = { source: 'scripts/create-user.mjs' };
  const revoked = await client.query(
    `
      UPDATE "UserRoleAssignment"
      SET "status" = 'revoked', "revokedAt" = NOW(), "revokeReason" = 'Replaced by scripts/create-user.mjs', "updatedAt" = NOW()
      WHERE "userId" = $1 AND "status" = 'active' AND NOT ("role" = $2::"UserRole" AND "scope" = $3)
      RETURNING "role", "scope"
    `,
    [userId, role, scope],
  );

  for (const row of revoked.rows) {
    await client.query(
      `INSERT INTO "AuditLog" ("id", "actorId", "action", "entityType", "entityId", "metadata", "createdAt")
       VALUES ($1, NULL, 'role.revoked', 'User', $2, $3::jsonb, NOW())`,
      [crypto.randomUUID(), userId, JSON.stringify({ ...source, role: row.role, scope: row.scope })],
    );
  }

  await client.query(
    `
      INSERT INTO "UserRoleAssignment" ("id", "userId", "role", "scope", "departmentId", "status", "grantedAt", "createdAt", "updatedAt")
      VALUES ($1, $2, $3::"UserRole", $4, $5, 'active', NOW(), NOW(), NOW())
      ON CONFLICT ("userId", "role", "scope") DO UPDATE
      SET "status" = 'active', "grantedById" = NULL, "grantedAt" = NOW(),
          "revokedById" = NULL, "revokedAt" = NULL, "revokeReason" = NULL, "updatedAt" = NOW()
    `,
    [crypto.randomUUID(), userId, role, scope, departmentId],
  );
  await client.query(
    `INSERT INTO "AuditLog" ("id", "actorId", "action", "entityType", "entityId", "metadata", "createdAt")
     VALUES ($1, NULL, 'role.granted', 'User', $2, $3::jsonb, NOW())`,
    [crypto.randomUUID(), userId, JSON.stringify({ ...source, role, scope, departmentId })],
  );
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function usage() {
  console.log(`
Create a ThesisTrack user in the configured database.

Required:
  --role        system_admin | research_head | program_head | adviser | panel | library | partner | tech_transfer | focal_person | secretary | student
  --email       User email address
  --password    Temporary password, at least 6 characters
  --first-name  First name
  --last-name   Last name
  --department  Department or office

Student-only:
  --student-id  Required when --role student
  --year-level  Required when --role student

Examples:
  npm run db:create-user -- --role system_admin --email admin@example.com --password Admin123 --first-name System --last-name Admin --department IT
  npm run db:create-user -- --role research_head --email research@example.com --password Research123 --first-name Research --last-name Head --department "Research Office"
  npm run db:create-user -- --role adviser --email adviser@example.com --password Adviser123 --first-name Ana --last-name Reyes --department BSIT
  npm run db:create-user -- --update-existing --role system_admin --email admin@example.com --password Admin123 --first-name System --last-name Admin --department IT
`);
}

function required(args, key, label = key) {
  const value = args[key]?.trim();

  if (!value) {
    throw new Error(`Missing required argument: --${label}`);
  }

  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured in .env.');
  }

  const rawRole = required(args, 'role').toLowerCase();
  const role = roleMap.get(rawRole);

  if (!role) {
    throw new Error(`Unsupported role: ${rawRole}`);
  }

  const email = required(args, 'email').toLowerCase();
  const password = required(args, 'password');
  const firstName = required(args, 'first-name', 'first-name');
  const lastName = required(args, 'last-name', 'last-name');
  const department = required(args, 'department');
  const studentId = args['student-id']?.trim() || null;
  const yearLevel = args['year-level']?.trim() || null;

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  if (role === 'student' && (!studentId || !yearLevel)) {
    throw new Error('Student users require --student-id and --year-level.');
  }

  const name = `${firstName} ${lastName}`.trim();
  const passwordHash = await bcrypt.hash(password, 12);
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
    },
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT "id" FROM "User" WHERE "email" = $1', [email]);

    if (existing.rowCount > 0 && args['update-existing'] !== 'true') {
      throw new Error(`A user with email ${email} already exists.`);
    }

    if (role === 'student' && studentId) {
      const existingStudent = await client.query('SELECT "id" FROM "User" WHERE "studentId" = $1', [studentId]);

      if (existingStudent.rowCount > 0) {
        throw new Error(`A student with ID ${studentId} already exists.`);
      }
    }

    if (existing.rowCount > 0) {
      await client.query(
        `
          UPDATE "User"
          SET
            "passwordHash" = $1,
            "name" = $2,
            "firstName" = $3,
            "lastName" = $4,
            "studentId" = $5,
            "department" = $6,
            "yearLevel" = $7,
            "role" = $8::"UserRole",
            "accountStatus" = 'active',
            "updatedAt" = NOW()
          WHERE "email" = $9
        `,
        [
          passwordHash,
          name,
          firstName,
          lastName,
          role === 'student' ? studentId : null,
          department,
          role === 'student' ? yearLevel : null,
          role,
          email,
        ],
      );

      await assignOnlyRole(client, existing.rows[0].id, role, department);
      await client.query('COMMIT');
      console.log(`Updated ${role} user: ${email}`);
      return;
    }

    const id = crypto.randomUUID();
    await client.query(
      `
        INSERT INTO "User" (
          "id",
          "email",
          "passwordHash",
          "name",
          "firstName",
          "lastName",
          "studentId",
          "department",
          "yearLevel",
          "role",
          "accountStatus",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::"UserRole", 'active', NOW())
      `,
      [
        id,
        email,
        passwordHash,
        name,
        firstName,
        lastName,
        role === 'student' ? studentId : null,
        department,
        role === 'student' ? yearLevel : null,
        role,
      ],
    );

    await assignOnlyRole(client, id, role, department);
    await client.query('COMMIT');
    console.log(`Created ${role} user: ${email}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  usage();
  process.exit(1);
});
