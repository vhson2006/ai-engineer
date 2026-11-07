-- CreateTable
CREATE TABLE "inbox_messages" (
    "consumer" VARCHAR(100) NOT NULL,
    "message_id" VARCHAR(200) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_inbox_messages" PRIMARY KEY ("consumer","message_id")
);

-- CreateIndex
CREATE INDEX "ix_inbox_messages_processed_at" ON "inbox_messages"("processed_at");
