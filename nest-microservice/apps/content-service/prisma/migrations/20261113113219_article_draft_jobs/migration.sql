-- CreateTable
CREATE TABLE "article_draft_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "category_id" UUID NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "idea" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'prompting',
    "prompt" TEXT,
    "outline" JSONB,
    "result" JSONB,
    "image_job_ids" UUID[],
    "article_id" UUID,
    "warnings" JSONB,
    "error" VARCHAR(50),
    "detail" VARCHAR(300),
    "provider" VARCHAR(30),
    "model" VARCHAR(100),
    "written_at" TIMESTAMPTZ(6),
    "created_by" VARCHAR(255) NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_article_draft_jobs" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_article_draft_jobs_site_created" ON "article_draft_jobs"("site_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_article_draft_jobs_category_id" ON "article_draft_jobs"("category_id");

-- CreateIndex
CREATE INDEX "ix_article_draft_jobs_article_id" ON "article_draft_jobs"("article_id");

-- AddForeignKey
ALTER TABLE "article_draft_jobs" ADD CONSTRAINT "fk_article_draft_jobs_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_draft_jobs" ADD CONSTRAINT "fk_article_draft_jobs_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_draft_jobs" ADD CONSTRAINT "fk_article_draft_jobs_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
