-- CreateTable
CREATE TABLE "participa_ya_entries" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participa_ya_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participa_ya_entries_participant_id_key" ON "participa_ya_entries"("participant_id");

-- CreateIndex
CREATE INDEX "participa_ya_entries_score_idx" ON "participa_ya_entries"("score");

-- CreateIndex
CREATE INDEX "participa_ya_entries_updated_at_idx" ON "participa_ya_entries"("updated_at");

-- AddForeignKey
ALTER TABLE "participa_ya_entries" ADD CONSTRAINT "participa_ya_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participa_ya_entries" ADD CONSTRAINT "participa_ya_entries_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
