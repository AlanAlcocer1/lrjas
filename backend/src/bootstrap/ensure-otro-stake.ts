import { PrismaClient } from '@prisma/client';

export const OTRO_STAKE_NAME = 'Otro';
export const OTRO_WARD_NAME = 'Visitante';

export async function ensureOtroStake(prisma: PrismaClient) {
  const stake = await prisma.stake.upsert({
    where: { name: OTRO_STAKE_NAME },
    update: { active: true },
    create: { name: OTRO_STAKE_NAME },
  });

  await prisma.ward.upsert({
    where: { name_stakeId: { name: OTRO_WARD_NAME, stakeId: stake.id } },
    update: { active: true },
    create: { name: OTRO_WARD_NAME, stakeId: stake.id },
  });
}

export function isOtroStake(stake: { name: string } | undefined | null): boolean {
  return stake?.name === OTRO_STAKE_NAME;
}
