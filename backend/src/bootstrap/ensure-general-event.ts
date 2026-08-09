import { PrismaClient } from '@prisma/client';

export const GENERAL_EVENT_NAME = 'General';

export async function ensureGeneralEvent(prisma: PrismaClient) {
  await prisma.event.upsert({
    where: { name: GENERAL_EVENT_NAME },
    update: { active: true },
    create: {
      name: GENERAL_EVENT_NAME,
      active: true,
      sortOrder: 0,
    },
  });
}
