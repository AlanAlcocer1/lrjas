import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeLoginDto } from './dto/code-login.dto';
import { ActividadesUser } from './guards/permissions.guard';
import { MATRIMONIOS_ACCESS_CODE, ensureMatrimoniosGuest } from '../../bootstrap/ensure-matrimonios-guest';
import {
  DEFAULT_ACTIVIDADES_ADMIN_CODE,
  ensureActividadesBootstrapAdmins,
} from '../../bootstrap/ensure-actividades-bootstrap-admins';

function displayName(p: {
  firstName: string;
  middleName: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [p.firstName, p.middleName, p.lastName, p.motherLastName].filter(Boolean).join(' ');
}

export type LoginRequestMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class ActividadesAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async loginByCode(dto: CodeLoginDto, meta: LoginRequestMeta = {}) {
    const raw = dto.code.trim();
    // Matrimonios: código fijo 1234 (no pad a 3 dígitos)
    const code =
      raw === MATRIMONIOS_ACCESS_CODE ? MATRIMONIOS_ACCESS_CODE : raw.padStart(3, '0');

    // Matrimonios: asegura guest si aún no existe
    if (code === MATRIMONIOS_ACCESS_CODE) {
      await ensureMatrimoniosGuest(this.prisma);
    }

    // Solo si no hay ningún Administrador aún
    if (code === DEFAULT_ACTIVIDADES_ADMIN_CODE) {
      await ensureActividadesBootstrapAdmins(this.prisma);
    }

    const participant = await this.prisma.participant.findUnique({
      where: { code },
      include: {
        accessRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        teamMemberships: { select: { teamId: true } },
      },
    });

    if (!participant || !participant.active) {
      await this.writeAccessLog({
        action: 'login_denied',
        code,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reason: 'not_found_or_inactive' },
      });
      throw new UnauthorizedException('No tienes permisos de acceder aquí mi chavo');
    }

    const activeRoles = participant.accessRoles
      .map((ar) => ar.role)
      .filter((r) => r.active);

    if (activeRoles.length === 0) {
      await this.writeAccessLog({
        action: 'login_denied',
        participantId: participant.id,
        code,
        ip: meta.ip,
        userAgent: meta.userAgent,
        metadata: { reason: 'no_roles' },
      });
      throw new UnauthorizedException('No tienes permisos de acceder aquí mi chavo');
    }

    const permissionSet = new Set<string>();
    for (const role of activeRoles) {
      for (const rp of role.permissions) {
        permissionSet.add(rp.permission.key);
      }
    }

    const permissions = Array.from(permissionSet).sort();
    const roles = activeRoles.map((r) => ({ id: r.id, name: r.name }));
    const teamIds = participant.teamMemberships.map((tm) => tm.teamId);
    const name = displayName(participant);

    const accessToken = this.jwtService.sign({
      sub: participant.id,
      typ: 'participant',
      code: participant.code,
    });

    await this.writeAccessLog({
      action: 'login',
      participantId: participant.id,
      code: participant.code,
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata: { roles: roles.map((r) => r.name) },
    });

    return {
      accessToken,
      user: {
        id: participant.id,
        code: participant.code,
        name,
        roles,
        permissions,
        teamIds,
      } satisfies ActividadesUser,
    };
  }

  private async writeAccessLog(data: {
    action: string;
    participantId?: string;
    code?: string;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.accessLog.create({
        data: {
          action: data.action,
          participantId: data.participantId,
          code: data.code,
          ip: data.ip ?? undefined,
          userAgent: data.userAgent?.slice(0, 500) ?? undefined,
          metadata:
            data.metadata === undefined
              ? undefined
              : (data.metadata as Prisma.InputJsonValue),
        },
      });
    } catch {
      // No bloquear login si falla la auditoría
    }
  }

  async validateParticipant(participantId: string): Promise<ActividadesUser | null> {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        accessRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        teamMemberships: { select: { teamId: true } },
      },
    });

    if (!participant || !participant.active) return null;

    const activeRoles = participant.accessRoles
      .map((ar) => ar.role)
      .filter((r) => r.active);

    if (activeRoles.length === 0) return null;

    const permissionSet = new Set<string>();
    for (const role of activeRoles) {
      for (const rp of role.permissions) {
        permissionSet.add(rp.permission.key);
      }
    }

    return {
      id: participant.id,
      code: participant.code,
      name: displayName(participant),
      permissions: Array.from(permissionSet).sort(),
      roles: activeRoles.map((r) => ({ id: r.id, name: r.name })),
      teamIds: participant.teamMemberships.map((tm) => tm.teamId),
    };
  }

  async me(participantId: string) {
    const user = await this.validateParticipant(participantId);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
