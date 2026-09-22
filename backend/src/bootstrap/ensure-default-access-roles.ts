import { PrismaService } from '../prisma/prisma.service';
import { ACTIVIDADES_PERMISSIONS } from '../modules/actividades/permissions.catalog';

/** Nombres fijos de roles del comité. */
export const SYSTEM_ROLE = {
  ADMIN: 'Administrador',
  PRESIDENTS: 'Presidentes',
  COMMITTEE: 'Comité',
  COUPLES: 'Matrimonios',
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLE)[keyof typeof SYSTEM_ROLE];

const ALL_KEYS = ACTIVIDADES_PERMISSIONS.map((p) => p.key);

/** Matriz inicial de permisos (solo al crear el rol por primera vez). */
export const SYSTEM_ROLE_PERMISSIONS: Record<
  SystemRoleName,
  { description: string; permissionKeys: string[] }
> = {
  [SYSTEM_ROLE.ADMIN]: {
    description: 'Acceso completo: gestiona cualquier equipo, roles y configuración',
    permissionKeys: ALL_KEYS,
  },
  [SYSTEM_ROLE.PRESIDENTS]: {
    description: 'Ven todo, aprueban actividades y pueden intervenir en cualquier equipo',
    permissionKeys: [
      'activities.view',
      'activities.create',
      'activities.edit',
      'activities.delete',
      'activities.approve',
      'activities.manage_all',
      'tasks.view',
      'tasks.create',
      'tasks.edit',
      'tasks.delete',
      'tasks.complete',
      'tasks.assign',
      'budgets.view',
      'budgets.create',
      'budgets.edit',
      'approvals.view',
      'approvals.approve',
      'approvals.reject',
      'approvals.request_changes',
      'teams.view',
      'users.view',
      'users.assign',
      'calendar.view',
      'history.view',
    ],
  },
  [SYSTEM_ROLE.COMMITTEE]: {
    description:
      'Ven todas las actividades; crean/editan solo las de su equipo; pueden asignar gente de cualquier equipo',
    permissionKeys: [
      'activities.view',
      'activities.create',
      'activities.edit',
      'activities.delete',
      'tasks.view',
      'tasks.create',
      'tasks.edit',
      'tasks.delete',
      'tasks.complete',
      'tasks.assign',
      'budgets.view',
      'budgets.create',
      'budgets.edit',
      'teams.view',
      'users.assign',
      'calendar.view',
      'history.view',
    ],
  },
  [SYSTEM_ROLE.COUPLES]: {
    description: 'Solo lectura: ven actividades, tareas y calendario (código 1234)',
    permissionKeys: [
      'activities.view',
      'tasks.view',
      'budgets.view',
      'teams.view',
      'calendar.view',
      'history.view',
    ],
  },
};

/**
 * Crea los 4 roles de sistema solo si faltan.
 * Si el rol ya existe, NO toca descripción, active ni permisos
 * (para no pisar cambios hechos en la UI).
 * Roles custom del usuario nunca se tocan.
 */
export async function ensureDefaultAccessRoles(prisma: PrismaService) {
  const permissions = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  if (permissions.length === 0) return;

  const byKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const [name, def] of Object.entries(SYSTEM_ROLE_PERMISSIONS) as [
    SystemRoleName,
    (typeof SYSTEM_ROLE_PERMISSIONS)[SystemRoleName],
  ][]) {
    const existing = await prisma.accessRole.findUnique({ where: { name } });
    if (existing) continue;

    const role = await prisma.accessRole.create({
      data: {
        name,
        description: def.description,
        active: true,
      },
    });

    const permissionIds = def.permissionKeys
      .map((key) => byKey.get(key))
      .filter((id): id is string => !!id);

    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }
}
