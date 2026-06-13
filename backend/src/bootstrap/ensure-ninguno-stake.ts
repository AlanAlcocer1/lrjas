import { PrismaClient } from '@prisma/client';

export const NONE_STAKE_NAME = 'Ninguno';
export const NONE_WARD_NAME = 'Ninguno';

export async function ensureNingunoStake(prisma: PrismaClient) {
  const stake = await prisma.stake.upsert({
    where: { name: NONE_STAKE_NAME },
    update: { active: true },
    create: { name: NONE_STAKE_NAME },
  });

  await prisma.ward.upsert({
    where: { name_stakeId: { name: NONE_WARD_NAME, stakeId: stake.id } },
    update: { active: true },
    create: { name: NONE_WARD_NAME, stakeId: stake.id },
  });
}

export function sortStakesWithNingunoFirst<T extends { name: string }>(stakes: T[]): T[] {
  return [...stakes].sort((a, b) => {
    if (a.name === NONE_STAKE_NAME) return -1;
    if (b.name === NONE_STAKE_NAME) return 1;
    return a.name.localeCompare(b.name, 'es');
  });
}
