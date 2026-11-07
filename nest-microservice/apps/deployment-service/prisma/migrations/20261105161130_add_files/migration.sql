-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purpose" VARCHAR(50) NOT NULL,
    "visibility" VARCHAR(10) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'pending',
    "storage_key" VARCHAR(512) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(127) NOT NULL,
    "size" INTEGER NOT NULL,
    "owner_id" VARCHAR(255) NOT NULL,
    "deployment_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_files" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_files_deployment_id" ON "files"("deployment_id");

-- CreateIndex
CREATE INDEX "ix_files_owner_created" ON "files"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "ix_files_status_created" ON "files"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_files_storage_key" ON "files"("storage_key");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "fk_files_deployment" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Not expressible in schema.prisma: the database itself refuses invalid states.
ALTER TABLE "files" ADD CONSTRAINT "ck_files_visibility" CHECK ("visibility" IN ('public', 'private'));
ALTER TABLE "files" ADD CONSTRAINT "ck_files_status" CHECK ("status" IN ('pending', 'uploaded', 'deleting', 'deleted'));
ALTER TABLE "files" ADD CONSTRAINT "ck_files_size" CHECK ("size" > 0);
ALTER TABLE "files" ADD CONSTRAINT "ck_files_uploaded_at" CHECK ("status" = 'pending' OR "status" IN ('deleting', 'deleted') OR "uploaded_at" IS NOT NULL);
