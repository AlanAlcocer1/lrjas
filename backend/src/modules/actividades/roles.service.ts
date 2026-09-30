import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccessRoleDto, UpdateAccessRoleDto } from './dto/role.dto';
import { PERMISSION_GROUPS } from './permissions.catalog';
import { SYSTEM_ROLE } from '../../bootstrap/ensure-default-access-roles';

const SYSTEM_ROLE_NAMES = new Set(Object.values(SYSTEM_ROLE));

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ groupKey: 'asc' }, { key: 'asc' }],
    }).then((items) =>
      items.map((p) => ({
        ...p,
        groupLabel: PERMISSION_GROUPS[p.groupKey] ?? p.groupKey,
      })),
    );
  }

  async findAll() {
    const roles = await this.prisma.accessRole.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      active: r.active,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      userCount: r._count.participants,
      permissions: r.permissions.map((rp) => rp.permission),
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.accessRole.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        participants: {
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
        _count: { select: { participants: true } },
      },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      active: role.active,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      userCount: role._count.participants,
      permissions: role.permissions.map((rp) => rp.permission),
      users: role.participants.map((p) => ({
        id: p.participant.id,
        code: p.participant.code,
        name: [
          p.participant.firstName,
          p.participant.middleName,
          p.participant.lastName,
          p.participant.motherLastName,
        ]
          .filter(Boolean)
          .join(' '),
      })),
    };
  }

  async create(dto: CreateAccessRoleDto) {
    const permissionIds = dto.permissionIds ?? [];
    if (permissionIds.length) {
      await this.assertPermissionsExist(permissionIds);
    }

    return this.prisma.accessRole.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        active: dto.active ?? true,
        permissions: permissionIds.length
          ? { create: permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async update(id: string, dto: UpdateAccessRoleDto) {
    await this.findOne(id);

    if (dto.permissionIds) {
      await this.assertPermissionsExist(dto.permissionIds);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds.length) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          });
        }
      }

      return tx.accessRole.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description === undefined ? undefined : dto.description?.trim(),
          active: dto.active,
        },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { participants: true } },
        },
      });
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (SYSTEM_ROLE_NAMES.has(role.name as (typeof SYSTEM_ROLE)[keyof typeof SYSTEM_ROLE])) {
      throw new BadRequestException('No se pueden eliminar los roles de sistema del comité');
    }
    if (role.userCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar un rol con usuarios asignados. Desasígnalos o desactiva el rol.',
      );
    }
    await this.prisma.accessRole.delete({ where: { id } });
    return { ok: true };
  }

  private async assertPermissionsExist(ids: string[]) {
    const count = await this.prisma.permission.count({
      where: { id: { in: ids } },
    });
    if (count !== ids.length) {
      throw new BadRequestException('Uno o más permisos no existen');
    }
  }
}
