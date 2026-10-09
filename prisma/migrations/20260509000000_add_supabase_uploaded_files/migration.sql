-- Rename the legacy upload metadata table to the requested uploaded_files table.
ALTER TABLE IF EXISTS "UploadedFile" RENAME TO "uploaded_files";

-- Rename legacy camelCase columns to the document metadata column names.
ALTER TABLE "uploaded_files" RENAME COLUMN "secureUrl" TO "secure_url";
ALTER TABLE "uploaded_files" RENAME COLUMN "publicId" TO "public_id";
ALTER TABLE "uploaded_files" RENAME COLUMN "fileName" TO "file_name";
ALTER TABLE "uploaded_files" RENAME COLUMN "fileType" TO "file_type";
ALTER TABLE "uploaded_files" RENAME COLUMN "resourceType" TO "resource_type";
ALTER TABLE "uploaded_files" RENAME COLUMN "size" TO "file_size";
ALTER TABLE "uploaded_files" RENAME COLUMN "userId" TO "uploaded_by";
ALTER TABLE "uploaded_files" RENAME COLUMN "projectId" TO "project_id";
ALTER TABLE "uploaded_files" RENAME COLUMN "submissionId" TO "submission_id";
ALTER TABLE "uploaded_files" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "uploaded_files" RENAME COLUMN "updatedAt" TO "updated_at";

-- Add Supabase Storage metadata columns. Existing Cloudinary rows keep secure_url/public_id.
ALTER TABLE "uploaded_files"
  ADD COLUMN IF NOT EXISTS "file_path" TEXT,
  ADD COLUMN IF NOT EXISTS "bucket_name" TEXT,
  ADD COLUMN IF NOT EXISTS "document_category" TEXT NOT NULL DEFAULT 'Uncategorized',
  ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'private';

UPDATE "uploaded_files"
SET "document_category" = COALESCE(NULLIF("category", ''), "document_category", 'Uncategorized')
WHERE "document_category" = 'Uncategorized';

ALTER TABLE "uploaded_files" ALTER COLUMN "secure_url" DROP NOT NULL;
ALTER TABLE "uploaded_files" ALTER COLUMN "public_id" DROP NOT NULL;

-- Recreate/ensure indexes using stable names for the renamed table and new document columns.
CREATE INDEX IF NOT EXISTS "uploaded_files_uploaded_by_idx" ON "uploaded_files"("uploaded_by");
CREATE INDEX IF NOT EXISTS "uploaded_files_project_id_idx" ON "uploaded_files"("project_id");
CREATE INDEX IF NOT EXISTS "uploaded_files_submission_id_idx" ON "uploaded_files"("submission_id");
CREATE INDEX IF NOT EXISTS "uploaded_files_category_idx" ON "uploaded_files"("category");
CREATE INDEX IF NOT EXISTS "uploaded_files_document_category_idx" ON "uploaded_files"("document_category");
CREATE INDEX IF NOT EXISTS "uploaded_files_bucket_name_idx" ON "uploaded_files"("bucket_name");
CREATE INDEX IF NOT EXISTS "uploaded_files_created_at_idx" ON "uploaded_files"("created_at");
