-- ThesisTrack: back side of an identity card on account applications.
--
-- ID cards (student ID, school ID, government ID) are uploaded front and back; the back is stored as a
-- second private file. Single-page documents (COR, letters) leave it null.
--
-- ORDER: after 20261005120000_account_verification_and_role_assignments (needs "AccountApplication").
-- Additive only: one nullable column, its unique index and foreign key. No existing row changes.

SET LOCAL lock_timeout = '10s';

ALTER TABLE "AccountApplication" ADD COLUMN IF NOT EXISTS "documentBackFileId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AccountApplication_documentBackFileId_key" ON "AccountApplication"("documentBackFileId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountApplication_documentBackFileId_fkey') THEN
        ALTER TABLE "AccountApplication" ADD CONSTRAINT "AccountApplication_documentBackFileId_fkey"
            FOREIGN KEY ("documentBackFileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
