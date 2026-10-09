-- Live defense session: the chair starts the sitting, panelists fill in the
-- stage's rating sheet, and an assigned secretary records the minutes.
ALTER TYPE "DefenseStatus" ADD VALUE 'in_progress';

ALTER TABLE "DefenseSchedule"
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "secretaryId" TEXT,
ADD COLUMN "minutes" TEXT,
ADD COLUMN "minutesUpdatedAt" TIMESTAMP(3),
ADD COLUMN "minutesConfirmedAt" TIMESTAMP(3);

CREATE INDEX "DefenseSchedule_secretaryId_idx" ON "DefenseSchedule"("secretaryId");

ALTER TABLE "DefenseSchedule"
ADD CONSTRAINT "DefenseSchedule_secretaryId_fkey" FOREIGN KEY ("secretaryId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
