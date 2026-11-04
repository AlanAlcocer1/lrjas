-- AlterTable
ALTER TABLE "anniversary_memories" ADD COLUMN "is_cover" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "anniversary_memories_is_cover_idx" ON "anniversary_memories"("is_cover");
