-- AI images in the media library (ADR 0037): generation jobs (monthly quota), media.source/prompt/error, status failed.
-- AlterTable
ALTER TABLE "media" ADD COLUMN     "error" VARCHAR(50),
ADD COLUMN     "generation_job_id" UUID,
ADD COLUMN     "prompt" VARCHAR(1000),
ADD COLUMN     "source" VARCHAR(20) NOT NULL DEFAULT 'upload';

-- CreateTable
CREATE TABLE "image_generation_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "prompt" VARCHAR(1000) NOT NULL,
    "aspect_ratio" VARCHAR(10) NOT NULL,
    "count" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "generated" INTEGER,
    "provider" VARCHAR(30),
    "model" VARCHAR(100),
    "error" VARCHAR(50),
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_image_generation_jobs" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_image_generation_jobs_site_created" ON "image_generation_jobs"("site_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_media_generation_job_id" ON "media"("generation_job_id");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "fk_media_generation_job" FOREIGN KEY ("generation_job_id") REFERENCES "image_generation_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Invariants Prisma can't declare.
ALTER TABLE "media" DROP CONSTRAINT "ck_media_status";
ALTER TABLE "media" ADD CONSTRAINT "ck_media_status"
    CHECK ("status" IN ('pending', 'ready', 'failed'));
ALTER TABLE "media" ADD CONSTRAINT "ck_media_source"
    CHECK ("source" IN ('upload', 'ai'));
ALTER TABLE "image_generation_jobs" ADD CONSTRAINT "ck_image_generation_jobs_status"
    CHECK ("status" IN ('pending', 'completed', 'failed'));
ALTER TABLE "image_generation_jobs" ADD CONSTRAINT "ck_image_generation_jobs_count"
    CHECK ("count" BETWEEN 1 AND 4 AND ("generated" IS NULL OR "generated" BETWEEN 0 AND "count"));
