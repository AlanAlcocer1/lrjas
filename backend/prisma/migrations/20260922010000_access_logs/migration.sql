-- CreateTable
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT,
    "action" TEXT NOT NULL,
    "code" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_logs_created_at_idx" ON "access_logs"("created_at");

-- CreateIndex
CREATE INDEX "access_logs_participant_id_idx" ON "access_logs"("participant_id");

-- CreateIndex
CREATE INDEX "access_logs_action_idx" ON "access_logs"("action");

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
