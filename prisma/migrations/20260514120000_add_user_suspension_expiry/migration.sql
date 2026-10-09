ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_suspendedUntil_idx" ON "User"("suspendedUntil");
