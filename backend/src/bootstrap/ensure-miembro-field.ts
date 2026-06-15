import { PrismaClient } from '@prisma/client';
import { NONE_STAKE_NAME } from './ensure-ninguno-stake';

export const MEMBER_FIELD_NAME = 'miembro';

export function inferIsMember(
  dynamicFields: Record<string, boolean>,
  stakeName: string,
): boolean {
  if (dynamicFields[MEMBER_FIELD_NAME] === true) return true;
  return stakeName !== NONE_STAKE_NAME;
}

export async function ensureMiembroField(prisma: PrismaClient) {
  await prisma.fieldDefinition.upsert({
    where: { name: MEMBER_FIELD_NAME },
    update: { label: 'Miembro', active: true },
    create: {
      name: MEMBER_FIELD_NAME,
      label: 'Miembro',
      type: 'CHECKBOX',
      required: false,
      active: true,
    },
  });
}

/** Usuarios ya registrados con estaca real → miembro = true */
export async function backfillMiembroFromStakes(prisma: PrismaClient) {
  const field = await prisma.fieldDefinition.findUnique({
    where: { name: MEMBER_FIELD_NAME },
    select: { id: true },
  });
  if (!field) return;

  const participants = await prisma.participant.findMany({
    where: { stake: { name: { not: NONE_STAKE_NAME } } },
    select: {
      id: true,
      fieldValues: {
        where: { fieldId: field.id },
        select: { value: true },
      },
    },
  });

  const needsUpdate = participants.filter((p) => p.fieldValues[0]?.value !== true);
  if (needsUpdate.length === 0) return;

  await prisma.$transaction(
    needsUpdate.map((p) =>
      prisma.participantFieldValue.upsert({
        where: {
          participantId_fieldId: { participantId: p.id, fieldId: field.id },
        },
        update: { value: true },
        create: { participantId: p.id, fieldId: field.id, value: true },
      }),
    ),
  );
}
