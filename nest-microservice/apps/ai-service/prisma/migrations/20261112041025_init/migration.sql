-- ai-service database (ADR 0036): inbox and outbox (ADR 0007), and the usage ledger of AI calls.
-- CreateTable
CREATE TABLE "inbox_messages" (
    "consumer" VARCHAR(100) NOT NULL,
    "message_id" VARCHAR(200) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_inbox_messages" PRIMARY KEY ("consumer","message_id")
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

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "requester" VARCHAR(50) NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "task" VARCHAR(30) NOT NULL,
    "provider" VARCHAR(30) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_ai_usage" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_inbox_messages_processed_at" ON "inbox_messages"("processed_at");

-- CreateIndex
CREATE INDEX "ix_outbox_messages_unpublished" ON "outbox_messages"("created_at") WHERE (published_at IS NULL);

-- CreateIndex
CREATE INDEX "ix_ai_usage_site_created" ON "ai_usage"("site_id", "created_at");
