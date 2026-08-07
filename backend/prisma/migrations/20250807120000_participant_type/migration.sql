-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('MEMBER', 'NON_MEMBER', 'VISITOR');

-- AlterTable
ALTER TABLE "participants" ADD COLUMN "type" "ParticipantType" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "participants" ADD COLUMN "visitor_stake" TEXT;
ALTER TABLE "participants" ADD COLUMN "city" TEXT;
ALTER TABLE "participants" ADD COLUMN "state" TEXT;

-- Backfill: Ninguno stake => NON_MEMBER
UPDATE "participants" p
SET "type" = 'NON_MEMBER'
FROM "stakes" s
WHERE p."stake_id" = s."id"
  AND s."name" = 'Ninguno';
