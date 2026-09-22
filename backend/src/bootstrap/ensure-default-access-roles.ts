import { PrismaService } from '../prisma/prisma.service';

/** Rol Administrador con todos los permisos (solo si no existe ningún rol). */
export async function ensureDefaultAccessRoles(prisma: PrismaService) {
  const existing = await prisma.accessRole.count();
  if (existing > 0) return;

  const permissions = await prisma.permission.findMany({ select: { id: true } });
  if (permissions.length === 0) return;

  await prisma.accessRole.create({
    data: {
      name: 'Administrador',
      description: 'Acceso completo al módulo de actividades',
      active: true,
      permissions: {
        create: permissions.map((p) => ({ permissionId: p.id })),
      },
    },
  });

  await prisma.accessRole.create({
    data: {
      name: 'Consulta',
      description: 'Solo lectura de actividades y calendario',
      active: true,
      permissions: {
        create: (
          await prisma.permission.findMany({
            where: {
              key: { in: ['activities.view', 'tasks.view', 'calendar.view', 'history.view'] },
            },
            select: { id: true },
          })
        ).map((p) => ({ permissionId: p.id })),
      },
    },
  });
}
