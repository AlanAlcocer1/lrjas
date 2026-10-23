-- CreateTable
CREATE TABLE "wallet_passes" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "share_url" TEXT NOT NULL,
    "google_save_url" TEXT,
    "apple_pass_base64" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_participant_id_key" ON "wallet_passes"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_passes_serial_number_key" ON "wallet_passes"("serial_number");

-- AddForeignKey
ALTER TABLE "wallet_passes" ADD CONSTRAINT "wallet_passes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
