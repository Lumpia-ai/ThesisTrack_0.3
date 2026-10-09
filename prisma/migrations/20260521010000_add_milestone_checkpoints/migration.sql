-- Create persistent workflow checkpoint statuses for milestone progress tracking.
DO $$ BEGIN
    CREATE TYPE "MilestoneCheckpointStatus" AS ENUM ('locked', 'pending', 'submitted', 'in_review', 'needs_revision', 'approved', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MilestoneCheckpointReviewStatus" AS ENUM ('not_required', 'pending', 'in_review', 'approved', 'needs_revision');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MilestoneCheckpoint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "MilestoneCheckpointStatus" NOT NULL DEFAULT 'pending',
    "adviserReviewStatus" "MilestoneCheckpointReviewStatus" NOT NULL DEFAULT 'pending',
    "panelReviewStatus" "MilestoneCheckpointReviewStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "latestFeedback" TEXT,
    "latestFeedbackBy" TEXT,
    "latestFeedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneCheckpoint_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Submission"
ADD COLUMN IF NOT EXISTS "checkpointId" TEXT;

ALTER TABLE "uploaded_files"
ADD COLUMN IF NOT EXISTS "checkpoint_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "MilestoneCheckpoint_projectId_key_key" ON "MilestoneCheckpoint"("projectId", "key");
CREATE INDEX IF NOT EXISTS "MilestoneCheckpoint_projectId_idx" ON "MilestoneCheckpoint"("projectId");
CREATE INDEX IF NOT EXISTS "MilestoneCheckpoint_milestoneId_idx" ON "MilestoneCheckpoint"("milestoneId");
CREATE INDEX IF NOT EXISTS "MilestoneCheckpoint_status_idx" ON "MilestoneCheckpoint"("status");
CREATE INDEX IF NOT EXISTS "MilestoneCheckpoint_submittedAt_idx" ON "MilestoneCheckpoint"("submittedAt");
CREATE INDEX IF NOT EXISTS "MilestoneCheckpoint_completedAt_idx" ON "MilestoneCheckpoint"("completedAt");
CREATE INDEX IF NOT EXISTS "Submission_checkpointId_idx" ON "Submission"("checkpointId");
CREATE INDEX IF NOT EXISTS "uploaded_files_checkpoint_id_idx" ON "uploaded_files"("checkpoint_id");

DO $$ BEGIN
    ALTER TABLE "MilestoneCheckpoint" ADD CONSTRAINT "MilestoneCheckpoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MilestoneCheckpoint" ADD CONSTRAINT "MilestoneCheckpoint_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Submission" ADD CONSTRAINT "Submission_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "MilestoneCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "MilestoneCheckpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
