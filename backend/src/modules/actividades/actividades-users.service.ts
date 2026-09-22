import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignRolesDto } from './dto/role.dto';

function fullName(p: {
  firstName: string;
  middleName: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [p.firstName, p.middleName, p.lastName, p.motherLastName]
    .filter(Boolean)
    .join(' ');
}

@Injectable()
export class ActividadesUsersService {
  constructor(private prisma: PrismaService) {}

  async search(q?: string) {
    const query = q?.trim();
    const participants = await this.prisma.participant.findMany({
      where: query
        ? {
            OR: [
              { code: { contains: query.padStart(3, '0') } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { motherLastName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : { accessRoles: { some: {} } },
      take: 50,
      orderBy: { code: 'asc' },
      include: {
        accessRoles: {
          include: { role: { select: { id: true, name: true, active: true } } },
        },
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
    });

    return participants.map((p) => ({
      id: p.id,
      code: p.code,
      name: fullName(p),
      active: p.active,
      roles: p.accessRoles.map((ar) => ar.role),
      teams: p.teamMemberships.map((tm) => tm.team),
    }));
  }

  async findOne(id: string) {
    const p = await this.prisma.participant.findUnique({
      where: { id },
      include: {
        accessRoles: {
          include: { role: { select: { id: true, name: true, active: true } } },
        },
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
    });
    if (!p) throw new NotFoundException('Usuario no encontrado');
    return {
      id: p.id,
      code: p.code,
      name: fullName(p),
      active: p.active,
      roles: p.accessRoles.map((ar) => ar.role),
      teams: p.teamMemberships.map((tm) => tm.team),
    };
  }

  async findByCode(code: string) {
    const normalized = code.trim().padStart(3, '0');
    const p = await this.prisma.participant.findUnique({
      where: { code: normalized },
      include: {
        accessRoles: {
          include: { role: { select: { id: true, name: true, active: true } } },
        },
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
    });
    if (!p) throw new NotFoundException('Código no encontrado');
    return {
      id: p.id,
      code: p.code,
      name: fullName(p),
      active: p.active,
      roles: p.accessRoles.map((ar) => ar.role),
      teams: p.teamMemberships.map((tm) => tm.team),
    };
  }

  async assignRoles(participantId: string, dto: AssignRolesDto) {
    await this.findOne(participantId);
    await this.prisma.$transaction([
      this.prisma.participantAccessRole.deleteMany({
        where: { participantId },
      }),
      this.prisma.participantAccessRole.createMany({
        data: dto.roleIds.map((roleId) => ({ participantId, roleId })),
        skipDuplicates: true,
      }),
    ]);
    return this.findOne(participantId);
  }
}
