-- CreateEnum
CREATE TYPE "BrandingAssetType" AS ENUM ('SYSTEM_LOGO', 'SCHOOL_LOGO', 'LANDING_IMAGE', 'CERTIFICATE_LOGO', 'OTHER');

-- AlterTable
ALTER TABLE "Evaluation" ADD COLUMN     "rubricData" JSONB,
ADD COLUMN     "studentEvaluations" JSONB;

-- AlterTable
ALTER TABLE "uploaded_files" RENAME CONSTRAINT "UploadedFile_pkey" TO "uploaded_files_pkey";

-- CreateTable
CREATE TABLE "BrandingAsset" (
    "id" TEXT NOT NULL,
    "type" "BrandingAssetType" NOT NULL DEFAULT 'OTHER',
    "label" TEXT,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandingAsset_publicId_key" ON "BrandingAsset"("publicId");

-- CreateIndex
CREATE INDEX "BrandingAsset_type_idx" ON "BrandingAsset"("type");

-- CreateIndex
CREATE INDEX "BrandingAsset_uploadedById_idx" ON "BrandingAsset"("uploadedById");

-- RenameForeignKey
ALTER TABLE "uploaded_files" RENAME CONSTRAINT "UploadedFile_projectId_fkey" TO "uploaded_files_project_id_fkey";

-- RenameForeignKey
ALTER TABLE "uploaded_files" RENAME CONSTRAINT "UploadedFile_submissionId_fkey" TO "uploaded_files_submission_id_fkey";

-- RenameForeignKey
ALTER TABLE "uploaded_files" RENAME CONSTRAINT "UploadedFile_userId_fkey" TO "uploaded_files_uploaded_by_fkey";

-- AddForeignKey
ALTER TABLE "BrandingAsset" ADD CONSTRAINT "BrandingAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "UploadedFile_publicId_key" RENAME TO "uploaded_files_public_id_key";
