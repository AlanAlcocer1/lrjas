import { PrismaClient } from '@prisma/client';

export async function ensureSocialPostsTable(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "social_posts" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "post_url" TEXT NOT NULL,
      "platform" "SocialPlatform" NOT NULL DEFAULT 'INSTAGRAM',
      "active" BOOLEAN NOT NULL DEFAULT true,
      "featured" BOOLEAN NOT NULL DEFAULT true,
      "sort_order" INTEGER NOT NULL DEFAULT 0,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
    );
  `);
}
