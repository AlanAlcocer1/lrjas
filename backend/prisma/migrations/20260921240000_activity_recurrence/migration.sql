-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('NONE', 'INTERVAL', 'WEEKLY');

-- AlterTable
ALTER TABLE "activities" ADD COLUMN "end_date" DATE,
ADD COLUMN "recurrence_type" "RecurrenceType" NOT NULL DEFAULT 'NONE',
ADD COLUMN "recurrence_interval" INTEGER,
ADD COLUMN "recurrence_weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "recurrence_until" DATE;
