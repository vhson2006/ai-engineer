-- CreateTable
CREATE TABLE "content_imports" (
    "site_id" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL,
    "articles" INTEGER NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_content_imports" PRIMARY KEY ("site_id","version")
);
