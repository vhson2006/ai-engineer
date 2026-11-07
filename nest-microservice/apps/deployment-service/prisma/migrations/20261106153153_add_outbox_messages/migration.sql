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
CREATE INDEX "ix_outbox_messages_unpublished" ON "outbox_messages"("created_at") WHERE (published_at IS NULL);
