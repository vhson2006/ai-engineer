-- CreateTable
CREATE TABLE "deployments" (
    "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
    "name"        VARCHAR(100)   NOT NULL,
    "version"     VARCHAR(50)    NOT NULL,
    "environment" VARCHAR(30)    NOT NULL DEFAULT 'development',
    "status"      VARCHAR(20)    NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"  TIMESTAMPTZ(6),

    CONSTRAINT "pk_deployments" PRIMARY KEY ("id")
);

-- CreateIndex: uniqueness enforced by the database (race-safe), ignoring soft-deleted rows.
CREATE UNIQUE INDEX "uq_deployments_name_version" ON "deployments"("name", "version") WHERE deleted_at IS NULL;
