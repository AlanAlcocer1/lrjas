-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_name_key" ON "events"("name");

-- Seed General event
INSERT INTO "events" ("id", "name", "active", "sort_order", "created_at", "updated_at")
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'General',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- AlterTable attendances: add event_id nullable first
ALTER TABLE "attendances" ADD COLUMN "event_id" TEXT;

-- Backfill existing rows to General
UPDATE "attendances"
SET "event_id" = '00000000-0000-4000-8000-000000000001'
WHERE "event_id" IS NULL;

-- Make required
ALTER TABLE "attendances" ALTER COLUMN "event_id" SET NOT NULL;

-- Drop old unique
DROP INDEX IF EXISTS "attendances_participant_id_date_mexico_key";

-- Add FK + new unique + indexes
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "attendances_participant_id_date_mexico_event_id_key" ON "attendances"("participant_id", "date_mexico", "event_id");

CREATE INDEX "attendances_date_mexico_idx" ON "attendances"("date_mexico");

CREATE INDEX "attendances_event_id_idx" ON "attendances"("event_id");
