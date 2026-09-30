import { PrismaService } from '../prisma/prisma.service';
import { NONE_STAKE_NAME, NONE_WARD_NAME } from './ensure-ninguno-stake';
import { SYSTEM_ROLE } from './ensure-default-access-roles';
import { MATRIMONIOS_ACCESS_CODE } from './ensure-matrimonios-guest';

/** Primer admin del panel de actividades (solo si aún no hay ningún Administrador). */
export const DEFAULT_ACTIVIDADES_ADMIN_CODE = '000';

/**
 * Solo en BD sin admins: asegura participante 000 + rol Administrador.
 * Si ya hay alguien con Administrador, no toca asignaciones de roles.
 */
export async function ensureActividadesBootstrapAdmins(prisma: PrismaService) {
  const adminRole = await prisma.accessRole.findUnique({
    where: { name: SYSTEM_ROLE.ADMIN },
  });
  if (!adminRole) return;

  const adminsAlready = await prisma.participantAccessRole.count({
    where: { roleId: adminRole.id },
  });
  if (adminsAlready > 0) return;

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
