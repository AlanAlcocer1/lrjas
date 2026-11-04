-- CreateTable
CREATE TABLE "anniversary_memories" (
    "id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "memory_date" DATE NOT NULL,
    "caption" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anniversary_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "anniversary_memories_created_at_idx" ON "anniversary_memories"("created_at");

-- CreateIndex
CREATE INDEX "anniversary_memories_active_idx" ON "anniversary_memories"("active");
