CREATE TYPE "DefenseChairDecision" AS ENUM ('redefense', 'new_title');

ALTER TABLE "DefenseSchedule"
ADD COLUMN "chairDecision" "DefenseChairDecision",
ADD COLUMN "chairDecisionAt" TIMESTAMP(3),
ADD COLUMN "chairDecisionRemarks" TEXT;
