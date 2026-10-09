-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('under_review', 'needs_revision', 'approved');

-- CreateEnum
CREATE TYPE "ComplianceReviewStatus" AS ENUM ('pending', 'verified', 'needs_revision');

-- CreateTable
CREATE TABLE "compliance_submissions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "defenseScheduleId" TEXT NOT NULL,
    "submittedById" TEXT,
    "fileId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'under_review',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_reviews" (
    "id" TEXT NOT NULL,
    "complianceId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ComplianceReviewStatus" NOT NULL DEFAULT 'pending',
    "remarks" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_submissions_fileId_key" ON "compliance_submissions"("fileId");

-- CreateIndex
CREATE INDEX "compliance_submissions_projectId_idx" ON "compliance_submissions"("projectId");

-- CreateIndex
CREATE INDEX "compliance_submissions_status_idx" ON "compliance_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_submissions_defenseScheduleId_version_key" ON "compliance_submissions"("defenseScheduleId", "version");

-- CreateIndex
CREATE INDEX "compliance_reviews_reviewerId_status_idx" ON "compliance_reviews"("reviewerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_reviews_complianceId_reviewerId_key" ON "compliance_reviews"("complianceId", "reviewerId");

-- AddForeignKey
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_defenseScheduleId_fkey" FOREIGN KEY ("defenseScheduleId") REFERENCES "DefenseSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_complianceId_fkey" FOREIGN KEY ("complianceId") REFERENCES "compliance_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_reviews" ADD CONSTRAINT "compliance_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

