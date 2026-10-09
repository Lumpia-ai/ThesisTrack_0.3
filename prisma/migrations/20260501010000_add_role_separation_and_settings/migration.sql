ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'system_admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'research_head';

CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'global',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");
CREATE INDEX IF NOT EXISTS "SystemSetting_scope_idx" ON "SystemSetting"("scope");
