import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_STATUSES = [
  { name: 'Pendiente', color: '#94a3b8', position: 0, isInitial: true, isFinal: false },
  { name: 'Planeación', color: '#3b82f6', position: 1, isInitial: false, isFinal: false },
  { name: 'En proceso', color: '#f59e0b', position: 2, isInitial: false, isFinal: false },
  { name: 'En revisión', color: '#8b5cf6', position: 3, isInitial: false, isFinal: false },
  { name: 'Finalizado', color: '#84bd31', position: 4, isInitial: false, isFinal: true },
  { name: 'Cancelado', color: '#dc2626', position: 5, isInitial: false, isFinal: true },
];

export async function ensureActivityStatuses(prisma: PrismaService) {
  const count = await prisma.activityStatus.count();
  if (count > 0) return;

  for (const s of DEFAULT_STATUSES) {
    await prisma.activityStatus.create({ data: s });
  }
}
