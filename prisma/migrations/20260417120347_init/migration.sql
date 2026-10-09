/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `UploadedFile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UploadedFile_publicId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_publicId_key" ON "UploadedFile"("publicId");
