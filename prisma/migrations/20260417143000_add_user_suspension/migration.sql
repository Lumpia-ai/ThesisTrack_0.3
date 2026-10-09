ALTER TABLE "User"
ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspendedAt" TIMESTAMP(3);

CREATE INDEX "User_isSuspended_idx" ON "User"("isSuspended");
