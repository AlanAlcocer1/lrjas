-- AlterTable
ALTER TABLE "raffle_tickets" ADD COLUMN "created_by_id" TEXT;

-- CreateIndex
CREATE INDEX "raffle_tickets_created_by_id_idx" ON "raffle_tickets"("created_by_id");

-- AddForeignKey
ALTER TABLE "raffle_tickets" ADD CONSTRAINT "raffle_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
