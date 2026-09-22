import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeLoginDto } from './dto/code-login.dto';
import { ActividadesUser } from './guards/permissions.guard';
import { MATRIMONIOS_ACCESS_CODE } from '../../bootstrap/ensure-matrimonios-guest';

function displayName(p: {
  firstName: string;
  middleName: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [p.firstName, p.middleName, p.lastName, p.motherLastName].filter(Boolean).join(' ');
}

@Injectable()
export class ActividadesAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async loginByCode(dto: CodeLoginDto) {
    const raw = dto.code.trim();
    // Matrimonios: código fijo 1234 (no pad a 3 dígitos)
    const code =
      raw === MATRIMONIOS_ACCESS_CODE ? MATRIMONIOS_ACCESS_CODE : raw.padStart(3, '0');

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
      throw new UnauthorizedException('No tienes permisos de acceder aquí mi chavo');
    }

    const activeRoles = participant.accessRoles
      .map((ar) => ar.role)
      .filter((r) => r.active);

    if (activeRoles.length === 0) {
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
