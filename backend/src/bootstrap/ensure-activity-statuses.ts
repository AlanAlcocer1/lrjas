import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVITY_STATUS,
  FIXED_ACTIVITY_STATUSES,
  FIXED_STATUS_NAMES,
} from '../modules/actividades/activity-status.catalog';
import { ApprovalStatus } from '@prisma/client';

/** Mapeo de nombres viejos → nuevo flujo. */
const LEGACY_MAP: Record<string, string> = {
  Pendiente: ACTIVITY_STATUS.AWAITING_APPROVAL,
  Planeación: ACTIVITY_STATUS.PLANNING,
  'En progreso': ACTIVITY_STATUS.IN_PROGRESS,
  'En curso': ACTIVITY_STATUS.IN_PROGRESS,
  'En revisión': ACTIVITY_STATUS.AWAITING_APPROVAL,
  Finalizado: ACTIVITY_STATUS.COMPLETED,
  Finalizada: ACTIVITY_STATUS.COMPLETED,
  Cancelado: ACTIVITY_STATUS.CANCELLED,
  Cancelada: ACTIVITY_STATUS.CANCELLED,
};

export async function ensureActivityStatuses(prisma: PrismaService) {
  for (const s of FIXED_ACTIVITY_STATUSES) {
    const existing = await prisma.activityStatus.findFirst({
      where: { name: s.name },
    });
    if (existing) {
      await prisma.activityStatus.update({
        where: { id: existing.id },
        data: {
          color: s.color,
          position: s.position,
          isInitial: s.isInitial,
          isFinal: s.isFinal,
          isActive: true,
        },
      });
    } else {
      await prisma.activityStatus.create({ data: { ...s, isActive: true } });
    }
  }

  const all = await prisma.activityStatus.findMany();
  const byName = new Map(all.map((s) => [s.name, s]));

  for (const status of all) {
    if (FIXED_STATUS_NAMES.has(status.name)) continue;
    const targetName = LEGACY_MAP[status.name];
    if (!targetName) {
      await prisma.activityStatus.update({
        where: { id: status.id },
        data: { isActive: false },
      });
      continue;
    }
    const target = byName.get(targetName);
    if (!target) continue;
    await prisma.activity.updateMany({
      where: { statusId: status.id },
      data: { statusId: target.id },
    });
    await prisma.activityStatus.update({
      where: { id: status.id },
      data: { isActive: false },
    });
  }

  const awaiting = byName.get(ACTIVITY_STATUS.AWAITING_APPROVAL);
  const changes = byName.get(ACTIVITY_STATUS.CHANGES_REQUESTED);
  const rejected = byName.get(ACTIVITY_STATUS.REJECTED);
  const planning = byName.get(ACTIVITY_STATUS.PLANNING);
  if (!awaiting || !changes || !rejected || !planning) return;

  const inactiveIds = all
    .filter((s) => !FIXED_STATUS_NAMES.has(s.name))
    .map((s) => s.id);

  if (inactiveIds.length) {
    await prisma.activity.updateMany({
      where: { statusId: { in: inactiveIds }, approvalStatus: ApprovalStatus.PENDING },
      data: { statusId: awaiting.id },
    });
    await prisma.activity.updateMany({
      where: {
        statusId: { in: inactiveIds },
        approvalStatus: ApprovalStatus.CHANGES_REQUESTED,
      },
      data: { statusId: changes.id },
    });
    await prisma.activity.updateMany({
      where: { statusId: { in: inactiveIds }, approvalStatus: ApprovalStatus.REJECTED },
      data: { statusId: rejected.id },
    });
    await prisma.activity.updateMany({
      where: { statusId: { in: inactiveIds }, approvalStatus: ApprovalStatus.APPROVED },
      data: { statusId: planning.id },
    });
  }
}
