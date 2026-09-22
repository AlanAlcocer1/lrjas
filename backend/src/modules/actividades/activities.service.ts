import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApprovalStatus, Prisma, ResponsibleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivityQueryDto,
  ApprovalActionDto,
  CreateActivityDto,
  CreateActivityStatusDto,
  CreateTaskDto,
  PostponeActivityDto,
  UpdateActivityDto,
  UpdateActivityStatusDto,
  UpdateTaskDto,
} from './dto/activity.dto';
import { activitiesOverlappingRange } from './activity-range.filter';
import { normalizeSchedule } from './schedule.util';
import {
  ACTIVITY_STATUS,
  CLOSED_ACTIVITY_STATUSES,
  dateKeyUtc,
  FIXED_STATUS_NAMES,
  LOCKED_AUTO_STATUSES,
  TASKS_ALLOWED_STATUSES,
  todayKeyMexico,
} from './activity-status.catalog';
import {
  ActividadesUser,
  canManageTeam,
} from './guards/permissions.guard';

const activityInclude = {
  status: true,
  team: { select: { id: true, name: true, color: true } },
  createdBy: {
    select: {
      id: true,
      code: true,
      firstName: true,
      middleName: true,
      lastName: true,
      motherLastName: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      code: true,
      firstName: true,
      middleName: true,
      lastName: true,
      motherLastName: true,
    },
  },
  responsibles: {
    include: {
      participant: {
        select: {
          id: true,
          code: true,
          firstName: true,
          middleName: true,
          lastName: true,
          motherLastName: true,
        },
      },
    },
  },
  tasks: {
    orderBy: { position: 'asc' as const },
    include: {
      assignee: {
        select: {
          id: true,
          code: true,
          firstName: true,
          lastName: true,
          motherLastName: true,
        },
      },
    },
  },
  budget: { include: { items: { orderBy: { position: 'asc' as const } } } },
  approvalRequests: {
    orderBy: { createdAt: 'desc' as const },
    take: 10,
    include: {
      requestedBy: {
        select: { id: true, code: true, firstName: true, lastName: true },
      },
      reviewedBy: {
        select: { id: true, code: true, firstName: true, lastName: true },
      },
    },
  },
} satisfies Prisma.ActivityInclude;

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function withProgress<T extends { tasks: { completed: boolean }[] }>(activity: T) {
  const total = activity.tasks.length;
  const completed = activity.tasks.filter((t) => t.completed).length;
  return {
    ...activity,
    progress: {
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    },
  };
}

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async list(query: ActivityQueryDto) {
    const where: Prisma.ActivityWhereInput = {
      ...activitiesOverlappingRange(query.from, query.to),
    };
    if (query.teamId) where.teamId = query.teamId;
    if (query.statusId) where.statusId = query.statusId;
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
    if (query.requiresBudget !== undefined) where.requiresBudget = query.requiresBudget;
    if (query.responsibleId) {
      where.responsibles = { some: { participantId: query.responsibleId } };
    }

    const items = await this.prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return items.map(withProgress);
  }

  async findOne(id: string) {
    await this.refreshLifecycle(id);
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: activityInclude,
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return withProgress(activity);
  }

  async listPublic(from?: string, to?: string) {
    const where: Prisma.ActivityWhereInput = {
      approvalStatus: ApprovalStatus.APPROVED,
      ...(from || to
        ? activitiesOverlappingRange(from, to)
        : {
            date: {
              gte: new Date(new Date().toISOString().slice(0, 10)),
            },
          }),
    };

    return this.prisma.activity.findMany({
      where: {
        ...where,
        status: {
          name: {
            notIn: [
              ACTIVITY_STATUS.CANCELLED,
              ACTIVITY_STATUS.REJECTED,
              ACTIVITY_STATUS.AWAITING_APPROVAL,
              ACTIVITY_STATUS.CHANGES_REQUESTED,
              ACTIVITY_STATUS.POSTPONED,
            ],
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        publicDescription: true,
        date: true,
        endDate: true,
        startTime: true,
        endTime: true,
        location: true,
        locationUrl: true,
        coverImageUrl: true,
        recurrenceType: true,
        recurrenceInterval: true,
        recurrenceWeekdays: true,
        recurrenceUntil: true,
        team: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findPublicOne(id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        approvalStatus: ApprovalStatus.APPROVED,
        status: {
          name: {
            notIn: [
              ACTIVITY_STATUS.CANCELLED,
              ACTIVITY_STATUS.REJECTED,
              ACTIVITY_STATUS.AWAITING_APPROVAL,
              ACTIVITY_STATUS.CHANGES_REQUESTED,
              ACTIVITY_STATUS.POSTPONED,
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        publicDescription: true,
        date: true,
        endDate: true,
        startTime: true,
        endTime: true,
        location: true,
        locationUrl: true,
        coverImageUrl: true,
        recurrenceType: true,
        recurrenceInterval: true,
        recurrenceWeekdays: true,
        recurrenceUntil: true,
        team: { select: { id: true, name: true, color: true } },
      },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return activity;
  }

  async create(dto: CreateActivityDto, actor: ActividadesUser) {
    this.assertCanManageTeam(
      actor,
      dto.teamId,
      'Solo puedes crear actividades de tu equipo',
    );
    if (!actor.permissions.includes('activities.manage_all') && !dto.teamId) {
      throw new BadRequestException('Debes indicar el equipo de la actividad');
    }

    const statusId = dto.statusId ?? (await this.getInitialStatusId());
    const baseSlug = slugify(dto.name) || 'actividad';
    const slug = await this.uniqueSlug(baseSlug);

    if (dto.requiresBudget && !dto.budget) {
      throw new BadRequestException('Debes indicar el presupuesto');
    }

    const schedule = normalizeSchedule({
      date: dto.date,
      endDate: dto.endDate,
      recurrenceType: dto.recurrenceType ?? 'NONE',
      recurrenceInterval: dto.recurrenceInterval,
      recurrenceWeekdays: dto.recurrenceWeekdays,
      recurrenceUntil: dto.recurrenceUntil,
    });

    const creatorId = actor.id;

    const activity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          name: dto.name.trim(),
          slug,
          publicDescription: dto.publicDescription.trim(),
          internalDescription: dto.internalDescription?.trim(),
          date: new Date(dto.date),
          endDate: schedule.endDate ?? null,
          startTime: dto.startTime,
          endTime: dto.endTime,
          location: dto.location.trim(),
          locationUrl: dto.locationUrl?.trim(),
          coverImageUrl: dto.coverImageUrl?.trim(),
          teamId: dto.teamId,
          statusId,
          approvalStatus: ApprovalStatus.PENDING,
          requiresBudget: dto.requiresBudget ?? false,
          internalNotes: dto.internalNotes?.trim(),
          createdById: creatorId,
          recurrenceType: schedule.recurrenceType ?? 'NONE',
          recurrenceInterval: schedule.recurrenceInterval ?? null,
          recurrenceWeekdays: schedule.recurrenceWeekdays ?? [],
          recurrenceUntil: schedule.recurrenceUntil ?? null,
          responsibles: {
            create: [
              {
                participantId: dto.primaryResponsibleId,
                type: ResponsibleType.PRIMARY,
              },
              ...(dto.secondaryResponsibleIds ?? []).map((participantId) => ({
                participantId,
                type: ResponsibleType.SECONDARY,
              })),
            ],
          },
          tasks: dto.tasks?.length
            ? {
                create: dto.tasks.map((t, index) => ({
                  name: t.name.trim(),
                  description: t.description?.trim(),
                  assigneeId: t.assigneeId,
                  dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                  priority: t.priority,
                  position: index,
                })),
              }
            : undefined,
          budget:
            dto.requiresBudget && dto.budget
              ? {
                  create: {
                    requestedAmount: dto.budget.requestedAmount ?? 0,
                    approvedAmount: dto.budget.approvedAmount,
                    spentAmount: dto.budget.spentAmount ?? 0,
                    notes: dto.budget.notes,
                    items: dto.budget.items?.length
                      ? {
                          create: dto.budget.items.map((item, index) => ({
                            concept: item.concept.trim(),
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.quantity * item.unitPrice,
                            notes: item.notes,
                            position: index,
                          })),
                        }
                      : undefined,
                  },
                }
              : undefined,
          approvalRequests: {
            create: {
              requestedById: creatorId,
              status: ApprovalStatus.PENDING,
            },
          },
          history: {
            create: {
              participantId: creatorId,
              action: 'created',
              newValue: { name: dto.name, approvalStatus: 'PENDING' },
            },
          },
        },
        include: activityInclude,
      });
      return created;
    });

    return withProgress(activity);
  }

  async update(id: string, dto: UpdateActivityDto, actor: ActividadesUser) {
    const existing = await this.findOne(id);
    this.assertCanManageTeam(
      actor,
      existing.teamId,
      'Solo puedes editar actividades de tu equipo',
    );
    if (dto.teamId !== undefined && dto.teamId !== existing.teamId) {
      this.assertCanManageTeam(
        actor,
        dto.teamId,
        'No puedes mover la actividad a un equipo que no es tuyo',
      );
    }
    const actorId = actor.id;

    const activity = await this.prisma.$transaction(async (tx) => {
      if (dto.primaryResponsibleId || dto.secondaryResponsibleIds) {
        await tx.activityResponsible.deleteMany({ where: { activityId: id } });
        const primaryId = dto.primaryResponsibleId
          ?? existing.responsibles.find((r) => r.type === 'PRIMARY')?.participantId;
        if (!primaryId) throw new BadRequestException('Responsable principal requerido');
        await tx.activityResponsible.create({
          data: {
            activityId: id,
            participantId: primaryId,
            type: ResponsibleType.PRIMARY,
          },
        });
        const secondaries = (dto.secondaryResponsibleIds ?? []).filter(
          (participantId) => participantId !== primaryId,
        );
        if (secondaries.length) {
          await tx.activityResponsible.createMany({
            data: secondaries.map((participantId) => ({
              activityId: id,
              participantId,
              type: ResponsibleType.SECONDARY,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (dto.requiresBudget === false) {
        await tx.activityBudget.deleteMany({ where: { activityId: id } });
      } else if (dto.budget) {
        await tx.activityBudget.upsert({
          where: { activityId: id },
          create: {
            activityId: id,
            requestedAmount: dto.budget.requestedAmount ?? 0,
            approvedAmount: dto.budget.approvedAmount,
            spentAmount: dto.budget.spentAmount ?? 0,
            notes: dto.budget.notes,
            items: dto.budget.items?.length
              ? {
                  create: dto.budget.items.map((item, index) => ({
                    concept: item.concept.trim(),
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.quantity * item.unitPrice,
                    notes: item.notes,
                    position: index,
                  })),
                }
              : undefined,
          },
          update: {
            requestedAmount: dto.budget.requestedAmount,
            approvedAmount: dto.budget.approvedAmount,
            spentAmount: dto.budget.spentAmount,
            notes: dto.budget.notes,
          },
        });

        if (dto.budget.items) {
          const budget = await tx.activityBudget.findUnique({ where: { activityId: id } });
          if (budget) {
            await tx.budgetItem.deleteMany({ where: { budgetId: budget.id } });
            await tx.budgetItem.createMany({
              data: dto.budget.items.map((item, index) => ({
                budgetId: budget.id,
                concept: item.concept.trim(),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
                notes: item.notes,
                position: index,
              })),
            });
          }
        }
      }

      const schedule = normalizeSchedule(
        {
          date: dto.date,
          endDate: dto.endDate === undefined ? undefined : dto.endDate ?? null,
          recurrenceType: dto.recurrenceType,
          recurrenceInterval: dto.recurrenceInterval === undefined
            ? undefined
            : dto.recurrenceInterval ?? undefined,
          recurrenceWeekdays: dto.recurrenceWeekdays,
          recurrenceUntil: dto.recurrenceUntil === undefined
            ? undefined
            : dto.recurrenceUntil ?? null,
        },
        existing.date,
      );

      const updated = await tx.activity.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          publicDescription: dto.publicDescription?.trim(),
          internalDescription:
            dto.internalDescription === undefined
              ? undefined
              : dto.internalDescription?.trim(),
          date: dto.date ? new Date(dto.date) : undefined,
          endDate: schedule.endDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          location: dto.location?.trim(),
          locationUrl: dto.locationUrl === undefined ? undefined : dto.locationUrl?.trim(),
          coverImageUrl:
            dto.coverImageUrl === undefined ? undefined : dto.coverImageUrl?.trim(),
          teamId: dto.teamId === undefined ? undefined : dto.teamId,
          requiresBudget:
            dto.requiresBudget !== undefined
              ? dto.requiresBudget
              : dto.budget
                ? true
                : undefined,
          internalNotes:
            dto.internalNotes === undefined ? undefined : dto.internalNotes?.trim(),
          recurrenceType: schedule.recurrenceType,
          recurrenceInterval: schedule.recurrenceInterval,
          recurrenceWeekdays: schedule.recurrenceWeekdays,
          recurrenceUntil: schedule.recurrenceUntil,
        },
        include: activityInclude,
      });

      await tx.activityHistory.create({
        data: {
          activityId: id,
          participantId: actorId,
          action: 'updated',
          oldValue: {
            name: existing.name,
            date: existing.date,
            location: existing.location,
          },
          newValue: {
            name: updated.name,
            date: updated.date,
            location: updated.location,
          },
        },
      });

      return updated;
    });

    return withProgress(activity);
  }

  async remove(id: string, actor: ActividadesUser) {
    const activity = await this.findOne(id);
    this.assertCanManageTeam(
      actor,
      activity.teamId,
      'Solo puedes eliminar actividades de tu equipo',
    );
    await this.prisma.activityHistory.create({
      data: {
        activityId: id,
        participantId: actor.id,
        action: 'deleted',
      },
    });
    await this.prisma.activity.delete({ where: { id } });
    return { ok: true };
  }

  async approve(id: string, actorId: string, dto: ApprovalActionDto) {
    return this.review(id, actorId, ApprovalStatus.APPROVED, dto);
  }

  async reject(id: string, actorId: string, dto: ApprovalActionDto) {
    if (!dto.rejectionReason?.trim()) {
      throw new BadRequestException('El motivo de rechazo es obligatorio');
    }
    return this.review(id, actorId, ApprovalStatus.REJECTED, dto);
  }

  async requestChanges(id: string, actorId: string, dto: ApprovalActionDto) {
    return this.review(id, actorId, ApprovalStatus.CHANGES_REQUESTED, dto);
  }

  private async review(
    id: string,
    actorId: string,
    status: ApprovalStatus,
    dto: ApprovalActionDto,
  ) {
    const activity = await this.findOne(id);
    if (activity.approvalStatus === ApprovalStatus.APPROVED && status === ApprovalStatus.APPROVED) {
      return activity;
    }

    const pending = await this.prisma.approvalRequest.findFirst({
      where: { activityId: id, status: ApprovalStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    const updated = await this.prisma.$transaction(async (tx) => {
      if (pending) {
        await tx.approvalRequest.update({
          where: { id: pending.id },
          data: {
            status,
            reviewedById: actorId,
            reviewedAt: new Date(),
            comments: dto.comments?.trim(),
            rejectionReason: dto.rejectionReason?.trim(),
          },
        });
      } else {
        await tx.approvalRequest.create({
          data: {
            activityId: id,
            requestedById: activity.createdById,
            status,
            reviewedById: actorId,
            reviewedAt: new Date(),
            comments: dto.comments?.trim(),
            rejectionReason: dto.rejectionReason?.trim(),
          },
        });
      }

      const wasPostponed = activity.status?.name === ACTIVITY_STATUS.POSTPONED;
      const statusName =
        status === ApprovalStatus.APPROVED
          ? ACTIVITY_STATUS.PLANNING
          : status === ApprovalStatus.REJECTED
            ? ACTIVITY_STATUS.REJECTED
            : ACTIVITY_STATUS.CHANGES_REQUESTED;
      const statusId = await this.statusIdByName(statusName);

      const result = await tx.activity.update({
        where: { id },
        data: {
          approvalStatus: status,
          statusId,
          approvedById: status === ApprovalStatus.APPROVED ? actorId : null,
          approvedAt: status === ApprovalStatus.APPROVED ? new Date() : null,
        },
        include: activityInclude,
      });

      await tx.activityHistory.create({
        data: {
          activityId: id,
          participantId: actorId,
          action:
            status === ApprovalStatus.APPROVED
              ? wasPostponed
                ? 'postpone_approved'
                : 'approved'
              : status === ApprovalStatus.REJECTED
                ? 'rejected'
                : 'changes_requested',
          oldValue: {
            approvalStatus: activity.approvalStatus,
            status: activity.status?.name,
            date: activity.date,
            startTime: activity.startTime,
            endTime: activity.endTime,
            endDate: activity.endDate,
          },
          newValue: {
            approvalStatus: status,
            status: statusName,
            date: result.date,
            startTime: result.startTime,
            endTime: result.endTime,
            endDate: result.endDate,
            comments: dto.comments,
            rejectionReason: dto.rejectionReason,
          },
        },
      });

      return result;
    });

    return withProgress(updated);
  }

  /** Tras “cambios solicitados”: vuelve a la cola de aprobación. */
  async resubmit(id: string, actor: ActividadesUser) {
    const activity = await this.findOne(id);
    this.assertCanManageTeam(
      actor,
      activity.teamId,
      'Solo puedes reenviar actividades de tu equipo',
    );
    if (activity.approvalStatus !== ApprovalStatus.CHANGES_REQUESTED) {
      throw new BadRequestException('Solo se puede reenviar si hay cambios solicitados');
    }
    const statusId = await this.statusIdByName(ACTIVITY_STATUS.AWAITING_APPROVAL);
    const actorId = actor.id;
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.approvalRequest.create({
        data: {
          activityId: id,
          requestedById: actorId,
          status: ApprovalStatus.PENDING,
        },
      });
      const result = await tx.activity.update({
        where: { id },
        data: {
          approvalStatus: ApprovalStatus.PENDING,
          statusId,
          approvedById: null,
          approvedAt: null,
        },
        include: activityInclude,
      });
      await tx.activityHistory.create({
        data: {
          activityId: id,
          participantId: actorId,
          action: 'resubmitted',
          oldValue: { approvalStatus: activity.approvalStatus },
          newValue: {
            approvalStatus: ApprovalStatus.PENDING,
            status: ACTIVITY_STATUS.AWAITING_APPROVAL,
          },
        },
      });
      return result;
    });
    return withProgress(updated);
  }

  async finalize(id: string, actor: ActividadesUser) {
    return this.transitionOperational(
      id,
      actor,
      ACTIVITY_STATUS.COMPLETED,
      [ACTIVITY_STATUS.PLANNING, ACTIVITY_STATUS.IN_PROGRESS, ACTIVITY_STATUS.INCOMPLETE],
      'finalized',
    );
  }

  async cancel(id: string, actor: ActividadesUser) {
    return this.transitionOperational(
      id,
      actor,
      ACTIVITY_STATUS.CANCELLED,
      [
        ACTIVITY_STATUS.AWAITING_APPROVAL,
        ACTIVITY_STATUS.CHANGES_REQUESTED,
        ACTIVITY_STATUS.PLANNING,
        ACTIVITY_STATUS.IN_PROGRESS,
        ACTIVITY_STATUS.INCOMPLETE,
        ACTIVITY_STATUS.POSTPONED,
        ACTIVITY_STATUS.REJECTED,
      ],
      'cancelled',
    );
  }

  async postpone(id: string, actor: ActividadesUser, dto: PostponeActivityDto) {
    const activity = await this.findOne(id);
    this.assertCanManageTeam(
      actor,
      activity.teamId,
      'Solo puedes posponer actividades de tu equipo',
    );
    const actorId = actor.id;
    const allowed = new Set<string>([
      ACTIVITY_STATUS.PLANNING,
      ACTIVITY_STATUS.IN_PROGRESS,
      ACTIVITY_STATUS.INCOMPLETE,
    ]);
    if (!activity.status?.name || !allowed.has(activity.status.name)) {
      throw new BadRequestException(
        `No se puede posponer desde "${activity.status?.name ?? 'desconocido'}"`,
      );
    }

    const newDate = new Date(dto.date);
    const oldDate = activity.date;
    const dayDeltaMs = newDate.getTime() - oldDate.getTime();
    const dayDelta = Math.round(dayDeltaMs / 86400000);

    if (dto.endDate && new Date(dto.endDate) < newDate) {
      throw new BadRequestException('La fecha fin no puede ser anterior al inicio');
    }

    const postponedStatusId = await this.statusIdByName(ACTIVITY_STATUS.POSTPONED);
    const taskUpdates = new Map<string, string | null>();

    if (dto.taskDueDates?.length) {
      for (const row of dto.taskDueDates) {
        taskUpdates.set(row.taskId, row.dueDate === undefined ? null : row.dueDate);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const tasksBefore = await tx.activityTask.findMany({
        where: { activityId: id },
        select: { id: true, name: true, dueDate: true },
      });

      const taskOps = tasksBefore
        .map((task) => {
          let nextDue: Date | null | undefined;
          if (taskUpdates.has(task.id)) {
            const raw = taskUpdates.get(task.id);
            nextDue = raw ? new Date(raw) : null;
          } else if (task.dueDate && dayDelta !== 0) {
            nextDue = new Date(task.dueDate.getTime() + dayDelta * 86400000);
          } else {
            return null;
          }
          return tx.activityTask.update({
            where: { id: task.id },
            data: { dueDate: nextDue },
          });
        })
        .filter((op): op is ReturnType<typeof tx.activityTask.update> => !!op);
      if (taskOps.length) await Promise.all(taskOps);

      await tx.approvalRequest.create({
        data: {
          activityId: id,
          requestedById: actorId,
          status: ApprovalStatus.PENDING,
          comments: dto.reason?.trim()
            ? `Pospuesta: ${dto.reason.trim()}`
            : 'Actividad pospuesta — pendiente de reaprobación',
        },
      });

      const result = await tx.activity.update({
        where: { id },
        data: {
          date: newDate,
          endDate: dto.endDate === undefined ? undefined : dto.endDate ? new Date(dto.endDate) : null,
          startTime: dto.startTime,
          endTime: dto.endTime === undefined ? undefined : dto.endTime,
          statusId: postponedStatusId,
          approvalStatus: ApprovalStatus.PENDING,
          approvedById: null,
          approvedAt: null,
        },
        include: activityInclude,
      });

      const tasksAfter = await tx.activityTask.findMany({
        where: { activityId: id },
        select: { id: true, name: true, dueDate: true },
      });

      await tx.activityHistory.create({
        data: {
          activityId: id,
          participantId: actorId,
          action: 'postponed',
          oldValue: {
            status: activity.status.name,
            date: activity.date,
            endDate: activity.endDate,
            startTime: activity.startTime,
            endTime: activity.endTime,
            tasks: tasksBefore,
          },
          newValue: {
            status: ACTIVITY_STATUS.POSTPONED,
            date: result.date,
            endDate: result.endDate,
            startTime: result.startTime,
            endTime: result.endTime,
            reason: dto.reason?.trim() || null,
            tasks: tasksAfter,
          },
        },
      });

      return result;
    });

    return withProgress(updated);
  }

  async markIncomplete(id: string, actor: ActividadesUser) {
    return this.transitionOperational(
      id,
      actor,
      ACTIVITY_STATUS.INCOMPLETE,
      [ACTIVITY_STATUS.PLANNING, ACTIVITY_STATUS.IN_PROGRESS],
      'marked_incomplete',
    );
  }

  private async transitionOperational(
    id: string,
    actor: ActividadesUser,
    target: string,
    allowedFrom: string[],
    action: string,
  ) {
    const activity = await this.findOne(id);
    this.assertCanManageTeam(
      actor,
      activity.teamId,
      'Solo puedes cambiar el estado de actividades de tu equipo',
    );
    const actorId = actor.id;
    const current = activity.status?.name;
    if (!current || !allowedFrom.includes(current)) {
      throw new BadRequestException(
        `No se puede pasar a "${target}" desde "${current ?? 'desconocido'}"`,
      );
    }
    const statusId = await this.statusIdByName(target);
    const updated = await this.prisma.activity.update({
      where: { id },
      data: { statusId },
      include: activityInclude,
    });
    await this.prisma.activityHistory.create({
      data: {
        activityId: id,
        participantId: actorId,
        action,
        oldValue: { status: current },
        newValue: { status: target },
      },
    });
    return withProgress(updated);
  }

  async history(id: string) {
    await this.findOne(id);
    return this.prisma.activityHistory.findMany({
      where: { activityId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        participant: {
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
            motherLastName: true,
          },
        },
      },
    });
  }

  async createTask(activityId: string, dto: CreateTaskDto, actor: ActividadesUser) {
    const activity = await this.findOne(activityId);
    this.assertCanManageTeam(
      actor,
      activity.teamId,
      'Solo puedes agregar tareas a actividades de tu equipo',
    );
    this.assertActivityOpen(activity.status?.name, 'No se pueden agregar tareas a una actividad cerrada');
    const actorId = actor.id;
    const task = await this.prisma.activityTask.create({
      data: {
        activityId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority,
        status: dto.status,
        position: dto.position ?? 0,
      },
    });
    await this.prisma.activityHistory.create({
      data: {
        activityId,
        participantId: actorId,
        action: 'task_created',
        newValue: { taskId: task.id, name: task.name },
      },
    });
    return task;
  }

  async updateTask(taskId: string, dto: UpdateTaskDto, actor: ActividadesUser) {
    const task = await this.prisma.activityTask.findUnique({
      where: { id: taskId },
      include: {
        activity: {
          select: {
            id: true,
            teamId: true,
            approvalStatus: true,
            name: true,
            status: { select: { name: true } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada');

    this.assertActivityOpen(
      task.activity.status.name,
      'No se pueden modificar tareas de una actividad cerrada',
    );

    const wantsComplete =
      dto.completed === true ||
      (dto.status === 'DONE' && dto.completed !== false);

    const dtoKeys = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
    const isAssigneeCompleting =
      wantsComplete &&
      !task.completed &&
      task.assigneeId === actor.id &&
      dtoKeys.every((k) => k === 'completed' || k === 'status');

    if (!isAssigneeCompleting) {
      this.assertCanManageTeam(
        actor,
        task.activity.teamId,
        'Solo puedes editar tareas de actividades de tu equipo',
      );
    }

    if (wantsComplete && !task.completed) {
      if (!TASKS_ALLOWED_STATUSES.has(task.activity.status.name)) {
        throw new BadRequestException(
          'No puedes completar tareas hasta que la actividad esté en Planificación (aprobada) o posterior',
        );
      }
    }

    const actorId = actor.id;

    const completed =
      dto.completed !== undefined
        ? dto.completed
        : dto.status === 'DONE'
          ? true
          : dto.status === 'TODO' || dto.status === 'IN_PROGRESS' || dto.status === 'CANCELLED'
            ? false
            : undefined;

    const nextStatus =
      dto.status ??
      (completed === true ? ('DONE' as const) : completed === false ? ('TODO' as const) : undefined);

    const updated = await this.prisma.activityTask.update({
      where: { id: taskId },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim(),
        assigneeId: dto.assigneeId === undefined ? undefined : dto.assigneeId,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate === null
              ? null
              : new Date(dto.dueDate),
        priority: dto.priority,
        status: nextStatus,
        completed,
        completedAt: completed === true ? new Date() : completed === false ? null : undefined,
        completedById: completed === true ? actorId : completed === false ? null : undefined,
        position: dto.position,
      },
    });

    await this.prisma.activityHistory.create({
      data: {
        activityId: task.activityId,
        participantId: actorId,
        action: completed === true ? 'task_completed' : 'task_updated',
        oldValue: { name: task.name, completed: task.completed },
        newValue: { name: updated.name, completed: updated.completed },
      },
    });

    await this.refreshLifecycle(task.activityId);
    return updated;
  }

  async deleteTask(taskId: string, actor: ActividadesUser) {
    const task = await this.prisma.activityTask.findUnique({
      where: { id: taskId },
      include: { activity: { include: { status: true } } },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada');
    this.assertCanManageTeam(
      actor,
      task.activity.teamId,
      'Solo puedes eliminar tareas de actividades de tu equipo',
    );
    this.assertActivityOpen(
      task.activity.status.name,
      'No se pueden eliminar tareas de una actividad cerrada',
    );
    await this.prisma.activityTask.delete({ where: { id: taskId } });
    await this.prisma.activityHistory.create({
      data: {
        activityId: task.activityId,
        participantId: actor.id,
        action: 'task_deleted',
        oldValue: { taskId, name: task.name },
      },
    });
    return { ok: true };
  }

  async myTasks(participantId: string) {
    return this.prisma.activityTask.findMany({
      where: {
        assigneeId: participantId,
        completed: false,
        activity: {
          status: {
            name: { notIn: [...CLOSED_ACTIVITY_STATUSES] },
          },
        },
      },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            date: true,
            approvalStatus: true,
            status: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Tareas con fecha límite en un rango (para calendario admin). */
  async listTasks(from?: string, to?: string) {
    const dueDate: { gte?: Date; lte?: Date; not?: null } = { not: null };
    if (from) dueDate.gte = new Date(from);
    if (to) dueDate.lte = new Date(to);

    return this.prisma.activityTask.findMany({
      where: {
        dueDate,
        activity: {
          status: { name: { notIn: [...CLOSED_ACTIVITY_STATUSES] } },
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            code: true,
            firstName: true,
            lastName: true,
            motherLastName: true,
          },
        },
        activity: {
          select: {
            id: true,
            name: true,
            date: true,
            approvalStatus: true,
            status: { select: { id: true, name: true, color: true } },
            team: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { name: 'asc' }],
    });
  }

  listStatuses() {
    return this.prisma.activityStatus.findMany({
      where: { isActive: true, name: { in: [...FIXED_STATUS_NAMES] } },
      orderBy: { position: 'asc' },
    });
  }

  async createStatus(_dto: CreateActivityStatusDto) {
    throw new BadRequestException('Los estados del flujo son fijos y no se pueden crear');
  }

  async updateStatus(id: string, dto: UpdateActivityStatusDto) {
    const existing = await this.prisma.activityStatus.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Estado no encontrado');
    if (FIXED_STATUS_NAMES.has(existing.name) && dto.name && dto.name !== existing.name) {
      throw new BadRequestException('No se puede renombrar un estado del flujo fijo');
    }
    return this.prisma.activityStatus.update({
      where: { id },
      data: {
        color: dto.color,
        // name/position/flags locked for system statuses
        ...(FIXED_STATUS_NAMES.has(existing.name)
          ? {}
          : {
              name: dto.name?.trim(),
              position: dto.position,
              isInitial: dto.isInitial,
              isFinal: dto.isFinal,
              isActive: dto.isActive,
            }),
      },
    });
  }

  async deleteStatus(id: string) {
    const existing = await this.prisma.activityStatus.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Estado no encontrado');
    if (FIXED_STATUS_NAMES.has(existing.name)) {
      throw new BadRequestException('No se puede eliminar un estado del flujo fijo');
    }
    const inUse = await this.prisma.activity.count({ where: { statusId: id } });
    if (inUse > 0) {
      throw new BadRequestException('No se puede eliminar un estado en uso');
    }
    await this.prisma.activityStatus.delete({ where: { id } });
    return { ok: true };
  }

  async dashboard(participantId: string) {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const boardStatuses = [
      ACTIVITY_STATUS.AWAITING_APPROVAL,
      ACTIVITY_STATUS.CHANGES_REQUESTED,
      ACTIVITY_STATUS.POSTPONED,
      ACTIVITY_STATUS.PLANNING,
      ACTIVITY_STATUS.IN_PROGRESS,
      ACTIVITY_STATUS.INCOMPLETE,
    ];
    const [
      upcoming,
      pendingApproval,
      approved,
      rejected,
      myTasks,
      overdueTasks,
      byTeam,
      budgetAgg,
      boardActivitiesRaw,
      boardTasks,
      boardStatusesRows,
    ] = await Promise.all([
      this.prisma.activity.findMany({
        where: { date: { gte: today } },
        orderBy: { date: 'asc' },
        take: 8,
        include: {
          status: true,
          team: { select: { id: true, name: true, color: true } },
        },
      }),
      this.prisma.activity.count({ where: { approvalStatus: 'PENDING' } }),
      this.prisma.activity.count({ where: { approvalStatus: 'APPROVED' } }),
      this.prisma.activity.count({ where: { approvalStatus: 'REJECTED' } }),
      this.prisma.activityTask.findMany({
        where: {
          assigneeId: participantId,
          completed: false,
          activity: {
            status: { name: { notIn: [...CLOSED_ACTIVITY_STATUSES] } },
          },
        },
        take: 10,
        include: {
          activity: {
            select: {
              id: true,
              name: true,
              status: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.activityTask.count({
        where: {
          assigneeId: participantId,
          completed: false,
          dueDate: { lt: today },
          activity: {
            status: { name: { notIn: [...CLOSED_ACTIVITY_STATUSES] } },
          },
        },
      }),
      this.prisma.activity.groupBy({
        by: ['teamId'],
        _count: true,
        where: { teamId: { not: null } },
      }),
      this.prisma.activityBudget.aggregate({
        _sum: { requestedAmount: true, approvedAmount: true, spentAmount: true },
      }),
      this.prisma.activity.findMany({
        where: {
          status: { name: { in: boardStatuses } },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 80,
        include: {
          status: true,
          team: { select: { id: true, name: true, color: true } },
          tasks: { select: { completed: true } },
        },
      }),
      this.prisma.activityTask.findMany({
        where: {
          assigneeId: participantId,
          activity: {
            status: { name: { notIn: [...CLOSED_ACTIVITY_STATUSES] } },
          },
          OR: [
            { completed: false },
            {
              completed: true,
              completedAt: {
                gte: new Date(Date.now() - 14 * 86400000),
              },
            },
          ],
        },
        take: 60,
        include: {
          activity: {
            select: {
              id: true,
              name: true,
              date: true,
              status: { select: { id: true, name: true, color: true } },
              team: { select: { id: true, name: true, color: true } },
            },
          },
        },
        orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
      }),
      this.prisma.activityStatus.findMany({
        where: { name: { in: boardStatuses }, isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, name: true, color: true, position: true },
      }),
    ]);

    const teamIds = byTeam.map((t) => t.teamId).filter(Boolean) as string[];
    const teams = teamIds.length
      ? await this.prisma.team.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, name: true },
        })
      : [];

    return {
      upcoming,
      counts: {
        pendingApproval,
        approved,
        rejected,
        overdueTasks,
      },
      myTasks,
      board: {
        statuses: boardStatusesRows,
        activities: boardActivitiesRaw.map(withProgress),
        tasks: boardTasks,
      },
      byTeam: byTeam.map((row) => ({
        teamId: row.teamId,
        teamName: teams.find((t) => t.id === row.teamId)?.name ?? 'Sin equipo',
        count: row._count,
      })),
      budgets: {
        requested: budgetAgg._sum.requestedAmount ?? 0,
        approved: budgetAgg._sum.approvedAmount ?? 0,
        spent: budgetAgg._sum.spentAmount ?? 0,
      },
    };
  }

  private async getInitialStatusId() {
    const initial = await this.prisma.activityStatus.findFirst({
      where: { name: ACTIVITY_STATUS.AWAITING_APPROVAL, isActive: true },
    });
    if (!initial) {
      const fallback = await this.prisma.activityStatus.findFirst({
        where: { isInitial: true, isActive: true },
      });
      if (!fallback) {
        throw new BadRequestException('No hay estado operativo inicial configurado');
      }
      return fallback.id;
    }
    return initial.id;
  }

  private async statusIdByName(name: string) {
    const status = await this.prisma.activityStatus.findUnique({ where: { name } });
    if (!status) {
      throw new BadRequestException(`Estado "${name}" no configurado`);
    }
    return status.id;
  }

  private assertActivityOpen(statusName: string | undefined | null, message: string) {
    if (statusName && CLOSED_ACTIVITY_STATUSES.has(statusName)) {
      throw new BadRequestException(message);
    }
  }

  private assertCanManageTeam(
    actor: ActividadesUser,
    teamId: string | null | undefined,
    message: string,
  ) {
    if (!canManageTeam(actor, teamId)) {
      throw new ForbiddenException(message);
    }
  }

  /** Auto: En curso el día de la actividad; Incompleta si hay tarea vencida. */
  private async refreshLifecycle(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        status: true,
        tasks: { select: { dueDate: true, completed: true } },
      },
    });
    if (!activity) return;
    if (activity.approvalStatus !== ApprovalStatus.APPROVED) return;
    if (LOCKED_AUTO_STATUSES.has(activity.status.name)) return;

    const today = todayKeyMexico();
    const start = dateKeyUtc(activity.date);
    const end = activity.endDate ? dateKeyUtc(activity.endDate) : start;
    const hasOverdue = activity.tasks.some(
      (t) => t.dueDate && !t.completed && dateKeyUtc(t.dueDate) < today,
    );

    let next: string | null = null;
    if (hasOverdue) {
      if (activity.status.name !== ACTIVITY_STATUS.INCOMPLETE) {
        next = ACTIVITY_STATUS.INCOMPLETE;
      }
    } else if (
      start <= today &&
      today <= end &&
      (activity.status.name === ACTIVITY_STATUS.PLANNING ||
        activity.status.name === ACTIVITY_STATUS.INCOMPLETE)
    ) {
      next = ACTIVITY_STATUS.IN_PROGRESS;
    }

    if (!next || next === activity.status.name) return;
    const statusId = await this.statusIdByName(next);
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { statusId },
    });
  }

  private async uniqueSlug(base: string) {
    let slug = base;
    let i = 1;
    while (await this.prisma.activity.findUnique({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
