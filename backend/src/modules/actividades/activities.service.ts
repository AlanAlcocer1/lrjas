import {
  BadRequestException,
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
  UpdateActivityDto,
  UpdateActivityStatusDto,
  UpdateTaskDto,
} from './dto/activity.dto';

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
    const where: Prisma.ActivityWhereInput = {};
    if (query.teamId) where.teamId = query.teamId;
    if (query.statusId) where.statusId = query.statusId;
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
    if (query.requiresBudget !== undefined) where.requiresBudget = query.requiresBudget;
    if (query.responsibleId) {
      where.responsibles = { some: { participantId: query.responsibleId } };
    }
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const items = await this.prisma.activity.findMany({
      where,
      include: activityInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return items.map(withProgress);
  }

  async findOne(id: string) {
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
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    } else {
      where.date = {
        gte: new Date(new Date().toISOString().slice(0, 10)),
      };
    }

    return this.prisma.activity.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        publicDescription: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        locationUrl: true,
        coverImageUrl: true,
        team: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async findPublicOne(id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id, approvalStatus: ApprovalStatus.APPROVED },
      select: {
        id: true,
        name: true,
        slug: true,
        publicDescription: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        locationUrl: true,
        coverImageUrl: true,
        team: { select: { id: true, name: true, color: true } },
      },
    });
    if (!activity) throw new NotFoundException('Actividad no encontrada');
    return activity;
  }

  async create(dto: CreateActivityDto, creatorId: string) {
    const statusId = dto.statusId ?? (await this.getInitialStatusId());
    const baseSlug = slugify(dto.name) || 'actividad';
    const slug = await this.uniqueSlug(baseSlug);

    if (dto.requiresBudget && !dto.budget) {
      throw new BadRequestException('Debes indicar el presupuesto');
    }

    const activity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          name: dto.name.trim(),
          slug,
          publicDescription: dto.publicDescription.trim(),
          internalDescription: dto.internalDescription?.trim(),
          date: new Date(dto.date),
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

  async update(id: string, dto: UpdateActivityDto, actorId: string) {
    const existing = await this.findOne(id);

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
        for (const participantId of dto.secondaryResponsibleIds ?? []) {
          if (participantId === primaryId) continue;
          await tx.activityResponsible.create({
            data: {
              activityId: id,
              participantId,
              type: ResponsibleType.SECONDARY,
            },
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
          startTime: dto.startTime,
          endTime: dto.endTime,
          location: dto.location?.trim(),
          locationUrl: dto.locationUrl === undefined ? undefined : dto.locationUrl?.trim(),
          coverImageUrl:
            dto.coverImageUrl === undefined ? undefined : dto.coverImageUrl?.trim(),
          teamId: dto.teamId === undefined ? undefined : dto.teamId,
          statusId: dto.statusId,
          requiresBudget: dto.requiresBudget,
          internalNotes:
            dto.internalNotes === undefined ? undefined : dto.internalNotes?.trim(),
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

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.activityHistory.create({
      data: {
        activityId: id,
        participantId: actorId,
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

      const result = await tx.activity.update({
        where: { id },
        data: {
          approvalStatus: status,
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
              ? 'approved'
              : status === ApprovalStatus.REJECTED
                ? 'rejected'
                : 'changes_requested',
          oldValue: { approvalStatus: activity.approvalStatus },
          newValue: {
            approvalStatus: status,
            comments: dto.comments,
            rejectionReason: dto.rejectionReason,
          },
        },
      });

      return result;
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

  async createTask(activityId: string, dto: CreateTaskDto, actorId: string) {
    await this.findOne(activityId);
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

  async updateTask(taskId: string, dto: UpdateTaskDto, actorId: string) {
    const task = await this.prisma.activityTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');

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

    return updated;
  }

  async deleteTask(taskId: string, actorId: string) {
    const task = await this.prisma.activityTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');
    await this.prisma.activityTask.delete({ where: { id: taskId } });
    await this.prisma.activityHistory.create({
      data: {
        activityId: task.activityId,
        participantId: actorId,
        action: 'task_deleted',
        oldValue: { taskId, name: task.name },
      },
    });
    return { ok: true };
  }

  async myTasks(participantId: string) {
    return this.prisma.activityTask.findMany({
      where: { assigneeId: participantId, completed: false },
      include: {
        activity: {
          select: { id: true, name: true, date: true, approvalStatus: true },
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
      where: { dueDate },
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
            team: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { name: 'asc' }],
    });
  }

  listStatuses() {
    return this.prisma.activityStatus.findMany({ orderBy: { position: 'asc' } });
  }

  async createStatus(dto: CreateActivityStatusDto) {
    if (dto.isInitial) {
      await this.prisma.activityStatus.updateMany({ data: { isInitial: false } });
    }
    return this.prisma.activityStatus.create({
      data: {
        name: dto.name.trim(),
        color: dto.color ?? '#84bd31',
        position: dto.position ?? 0,
        isInitial: dto.isInitial ?? false,
        isFinal: dto.isFinal ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateActivityStatusDto) {
    const existing = await this.prisma.activityStatus.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Estado no encontrado');
    if (dto.isInitial) {
      await this.prisma.activityStatus.updateMany({ data: { isInitial: false } });
    }
    return this.prisma.activityStatus.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        color: dto.color,
        position: dto.position,
        isInitial: dto.isInitial,
        isFinal: dto.isFinal,
        isActive: dto.isActive,
      },
    });
  }

  async deleteStatus(id: string) {
    const inUse = await this.prisma.activity.count({ where: { statusId: id } });
    if (inUse > 0) {
      throw new BadRequestException('No se puede eliminar un estado en uso');
    }
    await this.prisma.activityStatus.delete({ where: { id } });
    return { ok: true };
  }

  async dashboard(participantId: string) {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const [
      upcoming,
      pendingApproval,
      approved,
      rejected,
      myTasks,
      overdueTasks,
      byTeam,
      budgetAgg,
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
        where: { assigneeId: participantId, completed: false },
        take: 10,
        include: { activity: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.activityTask.count({
        where: {
          assigneeId: participantId,
          completed: false,
          dueDate: { lt: today },
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
      where: { isInitial: true, isActive: true },
    });
    if (!initial) {
      throw new BadRequestException('No hay estado operativo inicial configurado');
    }
    return initial.id;
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
