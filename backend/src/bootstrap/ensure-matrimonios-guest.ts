import { PrismaService } from '../prisma/prisma.service';
import { NONE_STAKE_NAME, NONE_WARD_NAME } from './ensure-ninguno-stake';
import { SYSTEM_ROLE } from './ensure-default-access-roles';

/** Código hardcodeado de acceso solo lectura para Matrimonios. */
export const MATRIMONIOS_ACCESS_CODE = '1234';

/**
 * Participante sintético "Matrimonios" (código 1234) con rol de solo lectura.
 * No es un usuario real del padron: entra a visualizar el comité.
 */
export async function ensureMatrimoniosGuest(prisma: PrismaService) {
  const stake = await prisma.stake.findUnique({ where: { name: NONE_STAKE_NAME } });
  const ward = stake
    ? await prisma.ward.findUnique({
        where: { name_stakeId: { name: NONE_WARD_NAME, stakeId: stake.id } },
      })
    : null;
  if (!stake || !ward) return;

  const role = await prisma.accessRole.findUnique({
    where: { name: SYSTEM_ROLE.COUPLES },
  });
  if (!role) return;

  const existing = await prisma.participant.findUnique({
    where: { code: MATRIMONIOS_ACCESS_CODE },
  });

  let participantId = existing?.id;

  if (!existing) {
    const created = await prisma.participant.create({
      data: {
        code: MATRIMONIOS_ACCESS_CODE,
        firstName: 'Matrimonios',
        lastName: 'Comité',
        motherLastName: 'LRJAS',
        age: 30,
        birthDate: new Date('1990-01-01'),
        sex: 'MALE',
        type: 'MEMBER',
        stakeId: stake.id,
        wardId: ward.id,
        active: true,
      },
    });
    participantId = created.id;
  } else if (!existing.active) {
    await prisma.participant.update({
      where: { id: existing.id },
      data: { active: true },
    });
  }

  if (!participantId) return;

  await prisma.participantAccessRole.upsert({
    where: {
      participantId_roleId: {
        participantId,
        roleId: role.id,
      },
    },
    create: {
      participantId,
      roleId: role.id,
    },
    update: {},
  });
}
