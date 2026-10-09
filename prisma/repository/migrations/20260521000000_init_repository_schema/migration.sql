CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "repository_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "main_project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "adviser" TEXT,
    "program" TEXT,
    "department" TEXT,
    "school_year" TEXT,
    "keywords" TEXT[],
    "manuscript_url" TEXT,
    "status" TEXT DEFAULT 'ARCHIVED',
    "published_at" TIMESTAMPTZ(6) DEFAULT now(),
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "repository_projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repository_authors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_project_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "student_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "repository_authors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repository_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_project_id" UUID,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT,
    "uploaded_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "repository_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "technology_transfer_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_project_id" UUID,
    "partner_name" TEXT,
    "transfer_status" TEXT DEFAULT 'PENDING',
    "remarks" TEXT,
    "date_recorded" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "technology_transfer_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_projects_main_project_id_key" ON "repository_projects"("main_project_id");

ALTER TABLE "repository_authors" ADD CONSTRAINT "repository_authors_repository_project_id_fkey" FOREIGN KEY ("repository_project_id") REFERENCES "repository_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "repository_files" ADD CONSTRAINT "repository_files_repository_project_id_fkey" FOREIGN KEY ("repository_project_id") REFERENCES "repository_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "technology_transfer_records" ADD CONSTRAINT "technology_transfer_records_repository_project_id_fkey" FOREIGN KEY ("repository_project_id") REFERENCES "repository_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
