import { PrismaService } from '../prisma/prisma.service';

/**
 * Asigna el rol Administrador a códigos listados en ACTIVIDADES_ADMIN_CODES
 * (ej. "125,042"). Necesario para el primer acceso sin UI previa.
 */
export async function ensureActividadesBootstrapAdmins(prisma: PrismaService) {
  const raw = process.env.ACTIVIDADES_ADMIN_CODES?.trim();
  if (!raw) return;

  const adminRole = await prisma.accessRole.findUnique({
    where: { name: 'Administrador' },
  });
  if (!adminRole) return;

  const codes = raw
    .split(',')
    .map((c) => c.trim().padStart(3, '0'))
    .filter(Boolean);

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
