-- Machine translation of articles through ai-service (ADR 0036): the jobs, and the inbox of the results.
-- CreateTable
CREATE TABLE "translation_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "article_id" UUID NOT NULL,
    "source_locale" VARCHAR(10) NOT NULL,
    "target_locale" VARCHAR(10) NOT NULL,
    "overwrite" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "source" JSONB NOT NULL,
    "error" VARCHAR(50),
    "detail" VARCHAR(300),
    "warnings" JSONB,
    "provider" VARCHAR(30),
    "model" VARCHAR(100),
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_translation_jobs" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_messages" (
    "consumer" VARCHAR(100) NOT NULL,
    "message_id" VARCHAR(200) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_inbox_messages" PRIMARY KEY ("consumer","message_id")
);

-- CreateIndex
CREATE INDEX "ix_translation_jobs_article_created" ON "translation_jobs"("article_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_inbox_messages_processed_at" ON "inbox_messages"("processed_at");

-- AddForeignKey
ALTER TABLE "translation_jobs" ADD CONSTRAINT "fk_translation_jobs_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants Prisma cannot declare.
ALTER TABLE "translation_jobs" ADD CONSTRAINT "ck_translation_jobs_status"
    CHECK ("status" IN ('pending', 'completed', 'failed'));
