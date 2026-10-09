-- ThesisTrack: reconcile the migration history with prisma/schema.prisma.
--
-- STATUS: PROPOSED (review only). Kept in prisma/proposed/ so `prisma migrate deploy` and
-- `prisma generate` never pick it up. Not executed against any database.
--
-- WHY: the 19 migrations in prisma/migrations do not create 53 objects that schema.prisma (and,
-- presumably, the hosted database) already has — they were added outside the migration history
-- (most likely `prisma db push`). A database built only from migrations is missing them, so it
-- cannot run the current app. The list comes from a read-only `prisma migrate diff` of the test
-- database (built from the 19 migrations) against prisma/schema.prisma, cross-checked offline
-- against every migration file.
--
-- ORDER: runs before 20261005120000_account_verification_and_role_assignments.
--
-- SAFETY:
--   * No destructive statements: no DROP, DELETE, TRUNCATE, UPDATE, type change or SET NOT NULL.
--     The one constraint change RELAXES a rule (User.passwordHash becomes nullable, as
--     schema.prisma already declares); no data is altered.
--   * Idempotent. Every object is created only if missing, so on a database that already has
--     them (the expected state of the hosted database) every statement is a no-op.
--   * Fail-closed. The final block checks actual definitions, not just names: every column's type
--     (with precision), NOT NULL and default; each new table's primary key and any extra required
--     column; enum values; each index's table, uniqueness, ordered columns, method, partial/
--     expression status and validity; each foreign key's columns, referenced table and columns,
--     ON DELETE / ON UPDATE and validation. Any mismatch raises an error and rolls everything back.
--   * Atomic. Run as one transaction; if any statement fails, nothing is applied.
--   * Lock-bounded. ALTER TABLE takes a brief exclusive lock even when IF NOT EXISTS makes it a
--     no-op; lock_timeout makes the migration fail (and roll back) instead of stalling the app if
--     a long-running transaction holds one of these tables.

SET LOCAL lock_timeout = '10s';

-- =============================================================================================
-- 1. Enums
-- =============================================================================================

-- New type (CREATE TYPE has no IF NOT EXISTS, so it is guarded; labels are verified in step 6).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'IndustryProjectStatus' AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE "IndustryProjectStatus" AS ENUM ('proposed', 'active', 'completed', 'terminated');
    END IF;
END $$;

-- Missing values on existing types. ADD VALUE IF NOT EXISTS is a no-op when the value exists.
-- (PostgreSQL 12+ allows this inside a transaction; nothing below uses the new values.)
ALTER TYPE "DefenseChairDecision" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "DefenseChairDecision" ADD VALUE IF NOT EXISTS 'new_title_approved';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'focal_person';

-- =============================================================================================
-- 2. Columns on existing tables (ADD COLUMN IF NOT EXISTS is a no-op when the column exists)
-- =============================================================================================
ALTER TABLE "DefenseSchedule" ADD COLUMN IF NOT EXISTS "previousProjectTitle" TEXT;

ALTER TABLE "MilestoneCheckpoint"
    ADD COLUMN IF NOT EXISTS "studentStartDate" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "studentTargetDate" TIMESTAMP(3);

-- isPublished is NOT NULL with a default: if the column is missing, existing projects get false.
ALTER TABLE "Project"
    ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "awards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "sdgs" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT;

-- Constraint relaxation (not destructive): matches `passwordHash String?` in schema.prisma.
-- A no-op if the column is already nullable.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "uploaded_files"
    ADD COLUMN IF NOT EXISTS "activity_id" TEXT,
    ADD COLUMN IF NOT EXISTS "title_draft_id" TEXT;

-- =============================================================================================
-- 3. Tables (CREATE TABLE IF NOT EXISTS is a no-op when the table exists; its columns are still
--    verified in step 6)
-- =============================================================================================
CREATE TABLE IF NOT EXISTS "academic_activities" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT,
    "activityType" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "venue" TEXT,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'Local',
    "achievement" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "relatedMilestone" TEXT,
    "participantsOrBeneficiary" TEXT,
    "addToTimeline" BOOLEAN NOT NULL DEFAULT true,
    "markAsAchievement" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TitleDraft" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedById" TEXT,
    "reviewStatus" "MilestoneCheckpointReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewFeedback" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitleDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProgressReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "submittedById" TEXT,
    "submissionId" TEXT,
    "progressNote" TEXT NOT NULL,
    "accomplishments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "problemsEncountered" TEXT,
    "nextSteps" TEXT,
    "percentageCompleted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IndustryPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT NOT NULL,
    "contactNumber" TEXT,
    "address" TEXT,
    "partnerType" TEXT NOT NULL DEFAULT 'Corporate',
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IndustryPartner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IndustryProject" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "IndustryProjectStatus" NOT NULL DEFAULT 'proposed',
    "moaUrl" TEXT,
    "deploymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IndustryProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ImpactFeedback" (
    "id" TEXT NOT NULL,
    "industryProjectId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImpactFeedback_pkey" PRIMARY KEY ("id")
);

-- =============================================================================================
-- 4. Indexes (IF NOT EXISTS is a no-op when an index with that name exists)
--    A UNIQUE index fails — and rolls the migration back — if duplicate values already exist.
-- =============================================================================================
CREATE INDEX IF NOT EXISTS "academic_activities_projectId_idx" ON "academic_activities"("projectId");
CREATE INDEX IF NOT EXISTS "academic_activities_createdById_idx" ON "academic_activities"("createdById");
CREATE INDEX IF NOT EXISTS "academic_activities_createdAt_idx" ON "academic_activities"("createdAt");
CREATE INDEX IF NOT EXISTS "TitleDraft_groupId_idx" ON "TitleDraft"("groupId");
CREATE INDEX IF NOT EXISTS "TitleDraft_reviewStatus_idx" ON "TitleDraft"("reviewStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "ProgressReport_submissionId_key" ON "ProgressReport"("submissionId");
CREATE INDEX IF NOT EXISTS "ProgressReport_projectId_idx" ON "ProgressReport"("projectId");
CREATE INDEX IF NOT EXISTS "ProgressReport_createdAt_idx" ON "ProgressReport"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "IndustryPartner_email_key" ON "IndustryPartner"("email");
CREATE INDEX IF NOT EXISTS "IndustryPartner_partnerType_idx" ON "IndustryPartner"("partnerType");
CREATE INDEX IF NOT EXISTS "IndustryProject_partnerId_idx" ON "IndustryProject"("partnerId");
CREATE INDEX IF NOT EXISTS "IndustryProject_projectId_idx" ON "IndustryProject"("projectId");
CREATE INDEX IF NOT EXISTS "IndustryProject_status_idx" ON "IndustryProject"("status");
CREATE INDEX IF NOT EXISTS "ImpactFeedback_industryProjectId_idx" ON "ImpactFeedback"("industryProjectId");
CREATE INDEX IF NOT EXISTS "ImpactFeedback_partnerId_idx" ON "ImpactFeedback"("partnerId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseId_key" ON "User"("supabaseId");
CREATE INDEX IF NOT EXISTS "uploaded_files_activity_id_idx" ON "uploaded_files"("activity_id");
CREATE INDEX IF NOT EXISTS "uploaded_files_title_draft_id_idx" ON "uploaded_files"("title_draft_id");

-- =============================================================================================
-- 5. Foreign keys (ADD CONSTRAINT has no IF NOT EXISTS, so each is added only when no constraint
--    with that name exists on the table). Adding one validates existing rows; an orphaned row
--    makes it fail and rolls the migration back rather than leaving bad data unchecked.
-- =============================================================================================
DO $$
DECLARE
    fk record;
BEGIN
    FOR fk IN
        SELECT * FROM (VALUES
            ('uploaded_files', 'uploaded_files_activity_id_fkey', 'FOREIGN KEY ("activity_id") REFERENCES "academic_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE'),
            ('uploaded_files', 'uploaded_files_title_draft_id_fkey', 'FOREIGN KEY ("title_draft_id") REFERENCES "TitleDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE'),
            ('academic_activities', 'academic_activities_projectId_fkey', 'FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE'),
            ('academic_activities', 'academic_activities_createdById_fkey', 'FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE'),
            ('TitleDraft', 'TitleDraft_groupId_fkey', 'FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE'),
            ('TitleDraft', 'TitleDraft_updatedById_fkey', 'FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE'),
            ('TitleDraft', 'TitleDraft_reviewedById_fkey', 'FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE'),
            ('ProgressReport', 'ProgressReport_projectId_fkey', 'FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE'),
            ('ProgressReport', 'ProgressReport_submittedById_fkey', 'FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE'),
            ('IndustryProject', 'IndustryProject_partnerId_fkey', 'FOREIGN KEY ("partnerId") REFERENCES "IndustryPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE'),
            ('IndustryProject', 'IndustryProject_projectId_fkey', 'FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE'),
            ('ImpactFeedback', 'ImpactFeedback_industryProjectId_fkey', 'FOREIGN KEY ("industryProjectId") REFERENCES "IndustryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE'),
            ('ImpactFeedback', 'ImpactFeedback_partnerId_fkey', 'FOREIGN KEY ("partnerId") REFERENCES "IndustryPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE')
        ) AS v (table_name, constraint_name, definition)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = fk.constraint_name AND conrelid = format('%I', fk.table_name)::regclass
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I %s', fk.table_name, fk.constraint_name, fk.definition);
        END IF;
    END LOOP;
END $$;

-- =============================================================================================
-- 6. Postconditions. Verifies the actual DEFINITION of every reconciled object — whether it was
--    created above or already existed — not just its name. Any mismatch raises an error and the
--    whole migration is rolled back, so a same-named object with a different shape is never
--    silently accepted.
-- =============================================================================================
DO $$
DECLARE
    problems text[] := ARRAY[]::text[];
    expected record;
    actual record;
    extra record;
BEGIN
    -- 6a. Columns: type (including precision), NOT NULL, and default. Defaults are compared without
    --     their trailing type cast (the type is checked separately), so 'Local'::text matches 'Local'.
    FOR expected IN
        SELECT * FROM (VALUES
            ('academic_activities', 'id', 'text', true, NULL),
            ('academic_activities', 'projectId', 'text', true, NULL),
            ('academic_activities', 'createdById', 'text', false, NULL),
            ('academic_activities', 'activityType', 'text', true, NULL),
            ('academic_activities', 'eventName', 'text', true, NULL),
            ('academic_activities', 'eventDate', 'timestamp(3) without time zone', false, NULL),
            ('academic_activities', 'venue', 'text', false, NULL),
            ('academic_activities', 'description', 'text', false, NULL),
            ('academic_activities', 'scope', 'text', true, '''Local'''),
            ('academic_activities', 'achievement', 'text', false, NULL),
            ('academic_activities', 'status', 'text', true, '''Completed'''),
            ('academic_activities', 'relatedMilestone', 'text', false, NULL),
            ('academic_activities', 'participantsOrBeneficiary', 'text', false, NULL),
            ('academic_activities', 'addToTimeline', 'boolean', true, 'true'),
            ('academic_activities', 'markAsAchievement', 'boolean', true, 'false'),
            ('academic_activities', 'createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'),
            ('academic_activities', 'updatedAt', 'timestamp(3) without time zone', true, NULL),
            ('TitleDraft', 'id', 'text', true, NULL),
            ('TitleDraft', 'groupId', 'text', true, NULL),
            ('TitleDraft', 'title', 'text', true, NULL),
            ('TitleDraft', 'description', 'text', false, NULL),
            ('TitleDraft', 'keywords', 'text[]', false, 'ARRAY[]'),
            ('TitleDraft', 'updatedById', 'text', false, NULL),
            ('TitleDraft', 'reviewStatus', '"MilestoneCheckpointReviewStatus"', true, '''pending'''),
            ('TitleDraft', 'reviewFeedback', 'text', false, NULL),
            ('TitleDraft', 'reviewedAt', 'timestamp(3) without time zone', false, NULL),
            ('TitleDraft', 'reviewedById', 'text', false, NULL),
            ('TitleDraft', 'isPriority', 'boolean', true, 'false'),
            ('TitleDraft', 'createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'),
            ('TitleDraft', 'updatedAt', 'timestamp(3) without time zone', true, NULL),
            ('ProgressReport', 'id', 'text', true, NULL),
            ('ProgressReport', 'projectId', 'text', true, NULL),
            ('ProgressReport', 'submittedById', 'text', false, NULL),
            ('ProgressReport', 'submissionId', 'text', false, NULL),
            ('ProgressReport', 'progressNote', 'text', true, NULL),
            ('ProgressReport', 'accomplishments', 'text[]', false, 'ARRAY[]'),
            ('ProgressReport', 'problemsEncountered', 'text', false, NULL),
            ('ProgressReport', 'nextSteps', 'text', false, NULL),
            ('ProgressReport', 'percentageCompleted', 'integer', true, '0'),
            ('ProgressReport', 'createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'),
            ('ProgressReport', 'updatedAt', 'timestamp(3) without time zone', true, NULL),
            ('IndustryPartner', 'id', 'text', true, NULL),
            ('IndustryPartner', 'name', 'text', true, NULL),
            ('IndustryPartner', 'contactPerson', 'text', false, NULL),
            ('IndustryPartner', 'email', 'text', true, NULL),
            ('IndustryPartner', 'contactNumber', 'text', false, NULL),
            ('IndustryPartner', 'address', 'text', false, NULL),
            ('IndustryPartner', 'partnerType', 'text', true, '''Corporate'''),
            ('IndustryPartner', 'website', 'text', false, NULL),
            ('IndustryPartner', 'createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'),
            ('IndustryPartner', 'updatedAt', 'timestamp(3) without time zone', true, NULL),
            ('IndustryPartner', 'deletedAt', 'timestamp(3) without time zone', false, NULL),
            ('IndustryProject', 'id', 'text', true, NULL),
            ('IndustryProject', 'partnerId', 'text', true, NULL),
            ('IndustryProject', 'projectId', 'text', true, NULL),
            ('IndustryProject', 'status', '"IndustryProjectStatus"', true, '''proposed'''),
            ('IndustryProject', 'moaUrl', 'text', false, NULL),
            ('IndustryProject', 'deploymentDate', 'timestamp(3) without time zone', false, NULL),
            ('IndustryProject', 'createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'),
            ('IndustryProject', 'updatedAt', 'timestamp(3) without time zone', true, NULL),
            ('IndustryProject', 'deletedAt', 'timestamp(3) without time zone', false, NULL),
            ('ImpactFeedback', 'id', 'text', true, NULL),
            ('ImpactFeedback', 'industryProjectId', 'text', true, NULL),
            ('ImpactFeedback', 'partnerId', 'text', true, NULL),
            ('ImpactFeedback', 'rating', 'integer', true, '5'),
            ('ImpactFeedback', 'feedback', 'text', false, NULL),
            ('ImpactFeedback', 'createdAt', 'timestamp(3) without time zone', true, 'CURRENT_TIMESTAMP'),
            ('ImpactFeedback', 'updatedAt', 'timestamp(3) without time zone', true, NULL),
            ('DefenseSchedule', 'previousProjectTitle', 'text', false, NULL),
            ('MilestoneCheckpoint', 'studentStartDate', 'timestamp(3) without time zone', false, NULL),
            ('MilestoneCheckpoint', 'studentTargetDate', 'timestamp(3) without time zone', false, NULL),
            ('Project', 'archivedAt', 'timestamp(3) without time zone', false, NULL),
            ('Project', 'awards', 'text[]', false, 'ARRAY[]'),
            ('Project', 'isPublished', 'boolean', true, 'false'),
            ('Project', 'sdgs', 'text[]', false, 'ARRAY[]'),
            ('Submission', 'rejectionReason', 'text', false, NULL),
            ('User', 'supabaseId', 'text', false, NULL),
            ('User', 'passwordHash', 'text', false, NULL),
            ('uploaded_files', 'activity_id', 'text', false, NULL),
            ('uploaded_files', 'title_draft_id', 'text', false, NULL)
        ) AS v (table_name, column_name, type_name, not_null, default_expr)
    LOOP
        SELECT
            format_type(a.atttypid, a.atttypmod) AS type_name,
            a.attnotnull AS not_null,
            CASE
                WHEN d.adbin IS NULL THEN NULL
                WHEN pg_get_expr(d.adbin, d.adrelid) = 'now()' THEN 'CURRENT_TIMESTAMP'
                WHEN pg_get_expr(d.adbin, d.adrelid) LIKE '''{}''::%' THEN 'ARRAY[]'
                ELSE regexp_replace(pg_get_expr(d.adbin, d.adrelid), '::("[^"]+"|[a-z_ ]+(\(\d+\))?)(\[\])*$', '')
            END AS default_expr
        INTO actual
        FROM pg_attribute a
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = to_regclass(format('%I.%I', current_schema(), expected.table_name))
          AND a.attname = expected.column_name
          AND a.attnum > 0
          AND NOT a.attisdropped;

        IF NOT FOUND THEN
            problems := problems || format('missing column %s.%s', expected.table_name, expected.column_name);
        ELSIF actual.type_name <> expected.type_name
           OR actual.not_null <> expected.not_null
           OR actual.default_expr IS DISTINCT FROM expected.default_expr THEN
            problems := problems || format('column %s.%s is (%s, not null=%s, default=%s), expected (%s, not null=%s, default=%s)',
                expected.table_name, expected.column_name,
                actual.type_name, actual.not_null, coalesce(actual.default_expr, 'none'),
                expected.type_name, expected.not_null, coalesce(expected.default_expr, 'none'));
        END IF;
    END LOOP;

    -- 6b. The six reconciled tables must not carry extra columns the app can't fill: an unexpected
    --     NOT NULL column without a default would make every Prisma insert fail. Other extra
    --     columns are reported as a notice only.
    FOR extra IN
        SELECT c.relname AS table_name, a.attname AS column_name, a.attnotnull AS not_null, d.adbin IS NOT NULL AS has_default
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE n.nspname = current_schema()
          AND c.relname IN ('academic_activities', 'TitleDraft', 'ProgressReport', 'IndustryPartner', 'IndustryProject', 'ImpactFeedback')
          AND a.attnum > 0 AND NOT a.attisdropped
          AND (c.relname::text, a.attname::text) NOT IN (
              ('academic_activities', 'id'), ('academic_activities', 'projectId'), ('academic_activities', 'createdById'),
              ('academic_activities', 'activityType'), ('academic_activities', 'eventName'), ('academic_activities', 'eventDate'),
              ('academic_activities', 'venue'), ('academic_activities', 'description'), ('academic_activities', 'scope'),
              ('academic_activities', 'achievement'), ('academic_activities', 'status'), ('academic_activities', 'relatedMilestone'),
              ('academic_activities', 'participantsOrBeneficiary'), ('academic_activities', 'addToTimeline'),
              ('academic_activities', 'markAsAchievement'), ('academic_activities', 'createdAt'), ('academic_activities', 'updatedAt'),
              ('TitleDraft', 'id'), ('TitleDraft', 'groupId'), ('TitleDraft', 'title'), ('TitleDraft', 'description'),
              ('TitleDraft', 'keywords'), ('TitleDraft', 'updatedById'), ('TitleDraft', 'reviewStatus'), ('TitleDraft', 'reviewFeedback'),
              ('TitleDraft', 'reviewedAt'), ('TitleDraft', 'reviewedById'), ('TitleDraft', 'isPriority'), ('TitleDraft', 'createdAt'),
              ('TitleDraft', 'updatedAt'),
              ('ProgressReport', 'id'), ('ProgressReport', 'projectId'), ('ProgressReport', 'submittedById'),
              ('ProgressReport', 'submissionId'), ('ProgressReport', 'progressNote'), ('ProgressReport', 'accomplishments'),
              ('ProgressReport', 'problemsEncountered'), ('ProgressReport', 'nextSteps'), ('ProgressReport', 'percentageCompleted'),
              ('ProgressReport', 'createdAt'), ('ProgressReport', 'updatedAt'),
              ('IndustryPartner', 'id'), ('IndustryPartner', 'name'), ('IndustryPartner', 'contactPerson'), ('IndustryPartner', 'email'),
              ('IndustryPartner', 'contactNumber'), ('IndustryPartner', 'address'), ('IndustryPartner', 'partnerType'),
              ('IndustryPartner', 'website'), ('IndustryPartner', 'createdAt'), ('IndustryPartner', 'updatedAt'), ('IndustryPartner', 'deletedAt'),
              ('IndustryProject', 'id'), ('IndustryProject', 'partnerId'), ('IndustryProject', 'projectId'), ('IndustryProject', 'status'),
              ('IndustryProject', 'moaUrl'), ('IndustryProject', 'deploymentDate'), ('IndustryProject', 'createdAt'),
              ('IndustryProject', 'updatedAt'), ('IndustryProject', 'deletedAt'),
              ('ImpactFeedback', 'id'), ('ImpactFeedback', 'industryProjectId'), ('ImpactFeedback', 'partnerId'), ('ImpactFeedback', 'rating'),
              ('ImpactFeedback', 'feedback'), ('ImpactFeedback', 'createdAt'), ('ImpactFeedback', 'updatedAt')
          )
    LOOP
        IF extra.not_null AND NOT extra.has_default THEN
            problems := problems || format('unexpected required column %s.%s (NOT NULL, no default)', extra.table_name, extra.column_name);
        ELSE
            RAISE NOTICE 'Unexpected optional column %.% left in place', extra.table_name, extra.column_name;
        END IF;
    END LOOP;

    -- 6c. Primary keys of the six reconciled tables: <table>_pkey on ("id").
    FOR expected IN
        SELECT * FROM (VALUES
            ('academic_activities'), ('TitleDraft'), ('ProgressReport'), ('IndustryPartner'), ('IndustryProject'), ('ImpactFeedback')
        ) AS v (table_name)
    LOOP
        SELECT
            c.conname::text AS constraint_name,
            ARRAY(
                SELECT a.attname::text
                FROM unnest(c.conkey) WITH ORDINALITY AS k (attnum, ord)
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                ORDER BY k.ord
            ) AS columns
        INTO actual
        FROM pg_constraint c
        WHERE c.contype = 'p' AND c.conrelid = to_regclass(format('%I.%I', current_schema(), expected.table_name));

        IF NOT FOUND THEN
            problems := problems || format('table %s has no primary key', expected.table_name);
        ELSIF actual.constraint_name <> (expected.table_name || '_pkey') OR actual.columns <> ARRAY['id'] THEN
            problems := problems || format('table %s primary key is %s(%s), expected %s_pkey(id)',
                expected.table_name, actual.constraint_name, array_to_string(actual.columns, ', '), expected.table_name);
        END IF;
    END LOOP;

    -- 6d. Enum labels.
    IF (SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)
        FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'IndustryProjectStatus' AND n.nspname = current_schema())
        IS DISTINCT FROM ARRAY['proposed', 'active', 'completed', 'terminated']::name[] THEN
        problems := problems || 'enum IndustryProjectStatus does not have exactly (proposed, active, completed, terminated)'::text;
    END IF;

    FOR expected IN
        SELECT * FROM (VALUES
            ('DefenseChairDecision', 'approved'),
            ('DefenseChairDecision', 'new_title_approved'),
            ('UserRole', 'focal_person')
        ) AS v (type_name, label)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = expected.type_name AND e.enumlabel = expected.label AND n.nspname = current_schema()
        ) THEN
            problems := problems || format('enum %s is missing value %s', expected.type_name, expected.label);
        END IF;
    END LOOP;

    -- 6e. Indexes: on the expected table, unique or not as expected, same ordered columns, btree,
    --     not partial, no expressions, and valid.
    FOR expected IN
        SELECT * FROM (VALUES
            ('academic_activities', 'academic_activities_projectId_idx', false, ARRAY['projectId']),
            ('academic_activities', 'academic_activities_createdById_idx', false, ARRAY['createdById']),
            ('academic_activities', 'academic_activities_createdAt_idx', false, ARRAY['createdAt']),
            ('TitleDraft', 'TitleDraft_groupId_idx', false, ARRAY['groupId']),
            ('TitleDraft', 'TitleDraft_reviewStatus_idx', false, ARRAY['reviewStatus']),
            ('ProgressReport', 'ProgressReport_submissionId_key', true, ARRAY['submissionId']),
            ('ProgressReport', 'ProgressReport_projectId_idx', false, ARRAY['projectId']),
            ('ProgressReport', 'ProgressReport_createdAt_idx', false, ARRAY['createdAt']),
            ('IndustryPartner', 'IndustryPartner_email_key', true, ARRAY['email']),
            ('IndustryPartner', 'IndustryPartner_partnerType_idx', false, ARRAY['partnerType']),
            ('IndustryProject', 'IndustryProject_partnerId_idx', false, ARRAY['partnerId']),
            ('IndustryProject', 'IndustryProject_projectId_idx', false, ARRAY['projectId']),
            ('IndustryProject', 'IndustryProject_status_idx', false, ARRAY['status']),
            ('ImpactFeedback', 'ImpactFeedback_industryProjectId_idx', false, ARRAY['industryProjectId']),
            ('ImpactFeedback', 'ImpactFeedback_partnerId_idx', false, ARRAY['partnerId']),
            ('User', 'User_supabaseId_key', true, ARRAY['supabaseId']),
            ('uploaded_files', 'uploaded_files_activity_id_idx', false, ARRAY['activity_id']),
            ('uploaded_files', 'uploaded_files_title_draft_id_idx', false, ARRAY['title_draft_id'])
        ) AS v (table_name, index_name, is_unique, columns)
    LOOP
        SELECT
            i.indisunique AS is_unique,
            i.indisvalid AS is_valid,
            i.indpred IS NULL AS not_partial,
            i.indexprs IS NULL AS no_expressions,
            am.amname::text AS method,
            ARRAY(
                SELECT a.attname::text
                FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k (attnum, ord)
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
                ORDER BY k.ord
            ) AS columns
        INTO actual
        FROM pg_index i
        JOIN pg_class ic ON ic.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = ic.relnamespace
        JOIN pg_am am ON am.oid = ic.relam
        WHERE n.nspname = current_schema()
          AND ic.relname = expected.index_name
          AND i.indrelid = to_regclass(format('%I.%I', current_schema(), expected.table_name));

        IF NOT FOUND THEN
            problems := problems || format('missing index %s on %s', expected.index_name, expected.table_name);
        ELSIF actual.is_unique <> expected.is_unique
           OR actual.columns <> expected.columns
           OR actual.method <> 'btree'
           OR NOT actual.not_partial
           OR NOT actual.no_expressions
           OR NOT actual.is_valid THEN
            problems := problems || format('index %s is (unique=%s, columns=%s, method=%s, partial=%s, expressions=%s, valid=%s), expected (unique=%s, columns=%s, btree, not partial, no expressions, valid)',
                expected.index_name, actual.is_unique, array_to_string(actual.columns, ','), actual.method,
                NOT actual.not_partial, NOT actual.no_expressions, actual.is_valid,
                expected.is_unique, array_to_string(expected.columns, ','));
        END IF;
    END LOOP;

    -- 6f. Foreign keys: same columns, same referenced table and columns, same ON DELETE / ON UPDATE
    --     ('c' cascade, 'n' set null, 'r' restrict), and validated (not NOT VALID).
    FOR expected IN
        SELECT * FROM (VALUES
            ('uploaded_files', 'uploaded_files_activity_id_fkey', ARRAY['activity_id'], 'academic_activities', ARRAY['id'], 'n', 'c'),
            ('uploaded_files', 'uploaded_files_title_draft_id_fkey', ARRAY['title_draft_id'], 'TitleDraft', ARRAY['id'], 'c', 'c'),
            ('academic_activities', 'academic_activities_projectId_fkey', ARRAY['projectId'], 'Project', ARRAY['id'], 'c', 'c'),
            ('academic_activities', 'academic_activities_createdById_fkey', ARRAY['createdById'], 'User', ARRAY['id'], 'n', 'c'),
            ('TitleDraft', 'TitleDraft_groupId_fkey', ARRAY['groupId'], 'Group', ARRAY['id'], 'c', 'c'),
            ('TitleDraft', 'TitleDraft_updatedById_fkey', ARRAY['updatedById'], 'User', ARRAY['id'], 'n', 'c'),
            ('TitleDraft', 'TitleDraft_reviewedById_fkey', ARRAY['reviewedById'], 'User', ARRAY['id'], 'n', 'c'),
            ('ProgressReport', 'ProgressReport_projectId_fkey', ARRAY['projectId'], 'Project', ARRAY['id'], 'c', 'c'),
            ('ProgressReport', 'ProgressReport_submittedById_fkey', ARRAY['submittedById'], 'User', ARRAY['id'], 'n', 'c'),
            ('IndustryProject', 'IndustryProject_partnerId_fkey', ARRAY['partnerId'], 'IndustryPartner', ARRAY['id'], 'r', 'c'),
            ('IndustryProject', 'IndustryProject_projectId_fkey', ARRAY['projectId'], 'Project', ARRAY['id'], 'r', 'c'),
            ('ImpactFeedback', 'ImpactFeedback_industryProjectId_fkey', ARRAY['industryProjectId'], 'IndustryProject', ARRAY['id'], 'c', 'c'),
            ('ImpactFeedback', 'ImpactFeedback_partnerId_fkey', ARRAY['partnerId'], 'IndustryPartner', ARRAY['id'], 'r', 'c')
        ) AS v (table_name, constraint_name, columns, ref_table, ref_columns, on_delete, on_update)
    LOOP
        SELECT
            c.convalidated AS is_validated,
            c.confdeltype::text AS on_delete,
            c.confupdtype::text AS on_update,
            rt.relname::text AS ref_table,
            rn.nspname::text AS ref_schema,
            ARRAY(
                SELECT a.attname::text
                FROM unnest(c.conkey) WITH ORDINALITY AS k (attnum, ord)
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
                ORDER BY k.ord
            ) AS columns,
            ARRAY(
                SELECT a.attname::text
                FROM unnest(c.confkey) WITH ORDINALITY AS k (attnum, ord)
                JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum
                ORDER BY k.ord
            ) AS ref_columns
        INTO actual
        FROM pg_constraint c
        JOIN pg_class rt ON rt.oid = c.confrelid
        JOIN pg_namespace rn ON rn.oid = rt.relnamespace
        WHERE c.contype = 'f'
          AND c.conname = expected.constraint_name
          AND c.conrelid = to_regclass(format('%I.%I', current_schema(), expected.table_name));

        IF NOT FOUND THEN
            problems := problems || format('missing foreign key %s on %s', expected.constraint_name, expected.table_name);
        ELSIF actual.columns <> expected.columns
           OR actual.ref_table <> expected.ref_table
           OR actual.ref_schema <> current_schema()
           OR actual.ref_columns <> expected.ref_columns
           OR actual.on_delete <> expected.on_delete
           OR actual.on_update <> expected.on_update
           OR NOT actual.is_validated THEN
            problems := problems || format('foreign key %s is (%s) -> %s.%s(%s) on delete %s on update %s validated=%s, expected (%s) -> %s(%s) on delete %s on update %s',
                expected.constraint_name, array_to_string(actual.columns, ','), actual.ref_schema, actual.ref_table,
                array_to_string(actual.ref_columns, ','), actual.on_delete, actual.on_update, actual.is_validated,
                array_to_string(expected.columns, ','), expected.ref_table, array_to_string(expected.ref_columns, ','),
                expected.on_delete, expected.on_update);
        END IF;
    END LOOP;

    IF array_length(problems, 1) > 0 THEN
        RAISE EXCEPTION 'Schema reconciliation postconditions failed (% problem(s)): %',
            array_length(problems, 1), array_to_string(problems, '; ');
    END IF;
END $$;
