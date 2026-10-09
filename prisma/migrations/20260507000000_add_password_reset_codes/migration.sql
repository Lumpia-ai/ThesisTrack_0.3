CREATE TABLE IF NOT EXISTS "password_reset_codes" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "resetTokenHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "password_reset_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_codes_resetTokenHash_key"
ON "password_reset_codes"("resetTokenHash");

CREATE INDEX IF NOT EXISTS "password_reset_codes_userId_idx"
ON "password_reset_codes"("userId");

CREATE INDEX IF NOT EXISTS "password_reset_codes_expiresAt_idx"
ON "password_reset_codes"("expiresAt");

ALTER TABLE "password_reset_codes"
ADD CONSTRAINT "password_reset_codes_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
