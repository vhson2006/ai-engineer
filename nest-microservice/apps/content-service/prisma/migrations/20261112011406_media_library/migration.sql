-- Media library of a site (ADR 0034): optimized images in the public bucket, and article covers.
-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "cover_media_id" UUID;

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "filename" VARCHAR(200) NOT NULL,
    "content_type" VARCHAR(50) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "variants" JSONB NOT NULL,
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_media" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_media_site_status_created" ON "media"("site_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_media_pending" ON "media"("status", "created_at") WHERE ((status)::text = 'pending'::text);

-- CreateIndex
CREATE INDEX "ix_articles_cover_media_id" ON "articles"("cover_media_id");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "fk_articles_cover_media" FOREIGN KEY ("cover_media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "fk_media_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invariants Prisma can't declare.
ALTER TABLE "media" ADD CONSTRAINT "ck_media_status"
    CHECK ("status" IN ('pending', 'ready'));
ALTER TABLE "media" ADD CONSTRAINT "ck_media_size"
    CHECK ("width" > 0 AND "height" > 0 AND jsonb_typeof("variants") = 'array');
