-- Library: per-project view statistics (department vs. guest) and librarian comments.
CREATE TABLE "repository_project_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_project_id" UUID NOT NULL,
    "viewer_type" TEXT NOT NULL,
    "viewer_key" TEXT NOT NULL,
    "viewer_role" TEXT,
    "viewer_department" TEXT,
    "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "repository_project_views_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repository_project_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_project_id" UUID NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "repository_project_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repository_project_views_repository_project_id_viewed_at_idx" ON "repository_project_views"("repository_project_id", "viewed_at");
CREATE INDEX "repository_project_views_repository_project_id_viewer_key_viewed_at_idx" ON "repository_project_views"("repository_project_id", "viewer_key", "viewed_at");
CREATE INDEX "repository_project_comments_repository_project_id_created_at_idx" ON "repository_project_comments"("repository_project_id", "created_at");

ALTER TABLE "repository_project_views" ADD CONSTRAINT "repository_project_views_repository_project_id_fkey" FOREIGN KEY ("repository_project_id") REFERENCES "repository_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "repository_project_comments" ADD CONSTRAINT "repository_project_comments_repository_project_id_fkey" FOREIGN KEY ("repository_project_id") REFERENCES "repository_projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
