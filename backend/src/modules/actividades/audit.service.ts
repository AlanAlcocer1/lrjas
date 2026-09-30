import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async listLogins(take = 100) {
    const rows = await this.prisma.accessLog.findMany({
      where: { action: { in: ['login', 'login_denied'] } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
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
    });

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      code: r.code,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt,
      participant: r.participant
        ? {
            id: r.participant.id,
            code: r.participant.code,
            name: [
              r.participant.firstName,
              r.participant.middleName,
              r.participant.lastName,
              r.participant.motherLastName,
            ]
              .filter(Boolean)
              .join(' '),
          }
        : null,
    }));
  }

  async listActivityHistory(take = 100) {
    const rows = await this.prisma.activityHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 200),
      include: {
        activity: { select: { id: true, name: true } },
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
    });

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      createdAt: r.createdAt,
      oldValue: r.oldValue,
      newValue: r.newValue,
      activity: r.activity,
      participant: r.participant
        ? {
            id: r.participant.id,
            code: r.participant.code,
            name: [
              r.participant.firstName,
              r.participant.middleName,
              r.participant.lastName,
              r.participant.motherLastName,
            ]
              .filter(Boolean)
              .join(' '),
          }
        : null,
    }));
  }
}
