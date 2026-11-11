-- CreateTable
CREATE TABLE "sites" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "locales" VARCHAR(10)[],
    "default_locale" VARCHAR(10) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_sites" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_categories" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "category_id" UUID NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,

    CONSTRAINT "pk_category_translations" PRIMARY KEY ("category_id","locale")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "category_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_by" VARCHAR(255) NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_articles" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_translations" (
    "article_id" UUID NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "cover_alt" VARCHAR(300),
    "body" JSONB NOT NULL,
    "reading_minutes" INTEGER NOT NULL,
    "seo_title" VARCHAR(200),
    "seo_description" VARCHAR(300),

    CONSTRAINT "pk_article_translations" PRIMARY KEY ("article_id","locale")
);

-- CreateTable
CREATE TABLE "article_slug_redirects" (
    "site_id" VARCHAR(50) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "article_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_article_slug_redirects" PRIMARY KEY ("site_id","locale","slug")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" UUID NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(500),

    CONSTRAINT "pk_outbox_messages" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_categories_site_key" ON "categories"("site_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_category_translations_site_locale_slug" ON "category_translations"("site_id", "locale", "slug");

-- CreateIndex
CREATE INDEX "ix_articles_site_status_published" ON "articles"("site_id", "status", "published_at" DESC);

-- CreateIndex
CREATE INDEX "ix_articles_due" ON "articles"("scheduled_at") WHERE (status = 'scheduled');

-- CreateIndex
CREATE INDEX "ix_articles_category_id" ON "articles"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_article_translations_site_locale_slug" ON "article_translations"("site_id", "locale", "slug");

-- CreateIndex
CREATE INDEX "ix_article_slug_redirects_article_id" ON "article_slug_redirects"("article_id");

-- CreateIndex
CREATE INDEX "ix_outbox_messages_unpublished" ON "outbox_messages"("created_at") WHERE (published_at IS NULL);

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "fk_category_translations_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "fk_articles_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "fk_articles_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_translations" ADD CONSTRAINT "fk_article_translations_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_slug_redirects" ADD CONSTRAINT "fk_article_slug_redirects_article" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariants Prisma can't declare (CHECK constraints are kept by later `migrate dev` runs).
-- The service guarantees them; these stop a bug or a manual query from breaking them.
ALTER TABLE "sites" ADD CONSTRAINT "ck_sites_locales"
    CHECK (cardinality("locales") >= 1 AND "default_locale" = ANY ("locales"));
ALTER TABLE "articles" ADD CONSTRAINT "ck_articles_status"
    CHECK ("status" IN ('draft', 'scheduled', 'published'));
ALTER TABLE "articles" ADD CONSTRAINT "ck_articles_scheduled_at"
    CHECK (("status" = 'scheduled') = ("scheduled_at" IS NOT NULL));
ALTER TABLE "articles" ADD CONSTRAINT "ck_articles_published_at"
    CHECK ("status" <> 'published' OR "published_at" IS NOT NULL);
