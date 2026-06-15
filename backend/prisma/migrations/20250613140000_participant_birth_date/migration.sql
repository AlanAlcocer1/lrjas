-- AlterTable
ALTER TABLE "participants" ADD COLUMN "birth_date" DATE;

-- Backfill approximate birth date from age
UPDATE "participants"
SET "birth_date" = (CURRENT_DATE - (age * INTERVAL '1 year'))::date
WHERE "birth_date" IS NULL;

ALTER TABLE "participants" ALTER COLUMN "birth_date" SET NOT NULL;
