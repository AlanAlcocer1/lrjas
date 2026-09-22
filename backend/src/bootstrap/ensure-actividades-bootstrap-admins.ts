import { PrismaService } from '../prisma/prisma.service';
import { NONE_STAKE_NAME, NONE_WARD_NAME } from './ensure-ninguno-stake';
import { SYSTEM_ROLE } from './ensure-default-access-roles';
import { MATRIMONIOS_ACCESS_CODE } from './ensure-matrimonios-guest';

/** Siempre admin del panel de actividades (primer acceso en prod). */
export const DEFAULT_ACTIVIDADES_ADMIN_CODE = '000';

/**
 * Asigna el rol Administrador a `000` (siempre; lo crea si no existe) y a
 * códigos extra en ACTIVIDADES_ADMIN_CODES (ej. "125,042").
 * Nunca toca el código Matrimonios (1234).
 */
export async function ensureActividadesBootstrapAdmins(prisma: PrismaService) {
  const adminRole = await prisma.accessRole.findUnique({
    where: { name: SYSTEM_ROLE.ADMIN },
  });
  if (!adminRole) return;

  await ensureDefaultAdminParticipant(prisma);

  const fromEnv = (process.env.ACTIVIDADES_ADMIN_CODES ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.padStart(3, '0'))
    .filter((c) => c !== MATRIMONIOS_ACCESS_CODE);

  const codes = Array.from(new Set([DEFAULT_ACTIVIDADES_ADMIN_CODE, ...fromEnv]));

  for (const code of codes) {
    const participant = await prisma.participant.findUnique({ where: { code } });
    if (!participant) continue;

    if (!participant.active) {
      await prisma.participant.update({
        where: { id: participant.id },
        data: { active: true },
      });
    }

    await prisma.participantAccessRole.upsert({
      where: {
        participantId_roleId: {
          participantId: participant.id,
          roleId: adminRole.id,
        },
      },
      create: {
        participantId: participant.id,
        roleId: adminRole.id,
      },
      update: {},
    });
  }
}

/** Crea participante 000 si no está en el padrón (bootstrap de primer admin). */
async function ensureDefaultAdminParticipant(prisma: PrismaService) {
  const existing = await prisma.participant.findUnique({
    where: { code: DEFAULT_ACTIVIDADES_ADMIN_CODE },
  });
  if (existing) return;

  const stake = await prisma.stake.findUnique({ where: { name: NONE_STAKE_NAME } });
  const ward = stake
    ? await prisma.ward.findUnique({
        where: { name_stakeId: { name: NONE_WARD_NAME, stakeId: stake.id } },
      })
    : null;
  if (!stake || !ward) return;

  await prisma.participant.create({
    data: {
      code: DEFAULT_ACTIVIDADES_ADMIN_CODE,
      firstName: 'Admin',
      lastName: 'Sistema',
      motherLastName: 'LRJAS',
      age: 25,
      birthDate: new Date('2000-01-01'),
      sex: 'MALE',
      type: 'MEMBER',
      stakeId: stake.id,
      wardId: ward.id,
      active: true,
    },
  });
}
