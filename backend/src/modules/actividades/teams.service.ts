import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeamDto, TeamMembersDto, UpdateTeamDto } from './dto/team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.team.findMany({
      include: {
        _count: { select: { members: true, activities: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            participant: {
              select: {
                id: true,
                code: true,
                firstName: true,
                middleName: true,
                lastName: true,
                motherLastName: true,
                active: true,
              },
            },
          },
        },
        activities: {
          orderBy: { date: 'desc' },
          take: 20,
          select: {
            id: true,
            name: true,
            date: true,
            approvalStatus: true,
            status: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });
    if (!team) throw new NotFoundException('Equipo no encontrado');
    return team;
  }

  create(dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        color: dto.color ?? '#84bd31',
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
    return this.prisma.team.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim(),
        color: dto.color,
        active: dto.active,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.team.delete({ where: { id } });
    return { ok: true };
  }

  async setMembers(id: string, dto: TeamMembersDto) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.teamMember.deleteMany({ where: { teamId: id } }),
      this.prisma.teamMember.createMany({
        data: dto.participantIds.map((participantId) => ({
          teamId: id,
          participantId,
        })),
        skipDuplicates: true,
      }),
    ]);
    return this.findOne(id);
  }

  async addMembers(id: string, dto: TeamMembersDto) {
    await this.findOne(id);
    await this.prisma.teamMember.createMany({
      data: dto.participantIds.map((participantId) => ({
        teamId: id,
        participantId,
      })),
      skipDuplicates: true,
    });
    return this.findOne(id);
  }

  async removeMember(id: string, participantId: string) {
    await this.prisma.teamMember.deleteMany({
      where: { teamId: id, participantId },
    });
    return this.findOne(id);
  }
}
