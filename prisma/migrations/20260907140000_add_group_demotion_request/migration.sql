CREATE TYPE "GroupDemotionRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "GroupDemotionRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "projectId" TEXT,
    "requestedById" TEXT,
    "reason" TEXT NOT NULL,
    "status" "GroupDemotionRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupDemotionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupDemotionRequest_groupId_idx" ON "GroupDemotionRequest"("groupId");

CREATE INDEX "GroupDemotionRequest_status_idx" ON "GroupDemotionRequest"("status");

ALTER TABLE "GroupDemotionRequest" ADD CONSTRAINT "GroupDemotionRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupDemotionRequest" ADD CONSTRAINT "GroupDemotionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GroupDemotionRequest" ADD CONSTRAINT "GroupDemotionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
