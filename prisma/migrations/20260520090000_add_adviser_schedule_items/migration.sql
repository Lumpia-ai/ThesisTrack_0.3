CREATE TYPE "AdviserScheduleItemType" AS ENUM (
  'consultation',
  'deadline',
  'meeting',
  'reminder',
  'event',
  'review'
);

CREATE TYPE "AdviserScheduleItemStatus" AS ENUM (
  'scheduled',
  'completed',
  'cancelled'
);

CREATE TABLE "AdviserScheduleItem" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "scheduledById" TEXT,
  "type" "AdviserScheduleItemType" NOT NULL DEFAULT 'consultation',
  "status" "AdviserScheduleItemStatus" NOT NULL DEFAULT 'scheduled',
  "title" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "location" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdviserScheduleItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdviserScheduleItem"
ADD CONSTRAINT "AdviserScheduleItem_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdviserScheduleItem"
ADD CONSTRAINT "AdviserScheduleItem_scheduledById_fkey"
FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AdviserScheduleItem_projectId_idx" ON "AdviserScheduleItem"("projectId");
CREATE INDEX "AdviserScheduleItem_scheduledById_idx" ON "AdviserScheduleItem"("scheduledById");
CREATE INDEX "AdviserScheduleItem_type_idx" ON "AdviserScheduleItem"("type");
CREATE INDEX "AdviserScheduleItem_status_idx" ON "AdviserScheduleItem"("status");
CREATE INDEX "AdviserScheduleItem_scheduledAt_idx" ON "AdviserScheduleItem"("scheduledAt");
