import { PrismaService } from '../prisma/prisma.service';
import { ACTIVIDADES_PERMISSIONS } from '../modules/actividades/permissions.catalog';

export async function ensureActividadesPermissions(prisma: PrismaService) {
  for (const p of ACTIVIDADES_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        description: p.description,
        groupKey: p.groupKey,
      },
      update: {
        name: p.name,
        description: p.description,
        groupKey: p.groupKey,
      },
    });
  }
}
