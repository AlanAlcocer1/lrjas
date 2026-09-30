import { PrismaService } from '../prisma/prisma.service';
import { ACTIVIDADES_PERMISSIONS } from '../modules/actividades/permissions.catalog';

export async function ensureActividadesPermissions(prisma: PrismaService) {
  for (const p of ACTIVIDADES_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { key: p.key } });
    if (existing) continue;
    await prisma.permission.create({
      data: {
        key: p.key,
        name: p.name,
        description: p.description,
        groupKey: p.groupKey,
      },
    });
  }
}
