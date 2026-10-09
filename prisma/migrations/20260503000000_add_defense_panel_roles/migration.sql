CREATE TYPE "DefensePanelRole" AS ENUM ('chair', 'member');

ALTER TABLE "Evaluation"
ADD COLUMN "panelRole" "DefensePanelRole" NOT NULL DEFAULT 'member';

CREATE INDEX "Evaluation_defenseScheduleId_panelRole_idx" ON "Evaluation"("defenseScheduleId", "panelRole");
