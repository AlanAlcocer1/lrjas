-- CreateTable
CREATE TABLE "raffle_tickets" (
    "id" TEXT NOT NULL,
    "folio" SERIAL NOT NULL,
    "participant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raffle_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raffle_tickets_folio_key" ON "raffle_tickets"("folio");

-- CreateIndex
CREATE INDEX "raffle_tickets_participant_id_idx" ON "raffle_tickets"("participant_id");

-- CreateIndex
CREATE INDEX "raffle_tickets_created_at_idx" ON "raffle_tickets"("created_at");

-- AddForeignKey
ALTER TABLE "raffle_tickets" ADD CONSTRAINT "raffle_tickets_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
