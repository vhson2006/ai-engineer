-- CreateTable
CREATE TABLE "studio_brand_kits" (
    "site_id" VARCHAR(50) NOT NULL,
    "brand_name" VARCHAR(100) NOT NULL,
    "tagline" VARCHAR(200),
    "phone" VARCHAR(40),
    "call_to_action" VARCHAR(200),
    "tone" VARCHAR(300),
    "footer_note" VARCHAR(200),
    "banned_phrases" VARCHAR(100)[],
    "primary_color" VARCHAR(7) NOT NULL,
    "accent_color" VARCHAR(7) NOT NULL,
    "logo_media_id" UUID,
    "updated_by" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_studio_brand_kits" PRIMARY KEY ("site_id")
);

-- CreateTable
CREATE TABLE "studio_avatars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "media_id" UUID NOT NULL,
    "voice" VARCHAR(40) NOT NULL,
    "consent_note" VARCHAR(500) NOT NULL,
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_studio_avatars" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "site_id" VARCHAR(50) NOT NULL,
    "template_id" VARCHAR(40) NOT NULL,
    "template_version" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "brief" VARCHAR(1000),
    "inputs" JSONB NOT NULL,
    "script" JSONB,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "script_job_id" UUID,
    "voice" JSONB,
    "voice_job_id" UUID,
    "video" JSONB,
    "render_id" UUID,
    "error" VARCHAR(300),
    "created_by" VARCHAR(255) NOT NULL,
    "updated_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_studio_projects" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_renders" (
    "id" UUID NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "project_id" UUID,
    "template_id" VARCHAR(40) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "size_bytes" INTEGER,
    "duration_ms" INTEGER,
    "render_ms" INTEGER,
    "error" VARCHAR(300),
    "created_by" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_studio_renders" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_studio_brand_kits_logo_media_id" ON "studio_brand_kits"("logo_media_id");

-- CreateIndex
CREATE INDEX "ix_studio_avatars_site_name" ON "studio_avatars"("site_id", "name");

-- CreateIndex
CREATE INDEX "ix_studio_avatars_media_id" ON "studio_avatars"("media_id");

-- CreateIndex
CREATE INDEX "ix_studio_projects_site_updated" ON "studio_projects"("site_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "ix_studio_renders_site_created" ON "studio_renders"("site_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ix_studio_renders_project_id" ON "studio_renders"("project_id");

-- AddForeignKey
ALTER TABLE "studio_brand_kits" ADD CONSTRAINT "fk_studio_brand_kits_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_brand_kits" ADD CONSTRAINT "fk_studio_brand_kits_logo_media" FOREIGN KEY ("logo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_avatars" ADD CONSTRAINT "fk_studio_avatars_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_avatars" ADD CONSTRAINT "fk_studio_avatars_media" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_projects" ADD CONSTRAINT "fk_studio_projects_site" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_renders" ADD CONSTRAINT "fk_studio_renders_project" FOREIGN KEY ("project_id") REFERENCES "studio_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
