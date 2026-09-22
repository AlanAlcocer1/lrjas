export type PermissionDef = {
  key: string;
  name: string;
  description?: string;
  groupKey: string;
};

/** Catálogo fijo de permisos del módulo Actividades. No se crean desde UI. */
export const ACTIVIDADES_PERMISSIONS: PermissionDef[] = [
  { key: 'activities.view', name: 'Ver actividades', groupKey: 'activities' },
  { key: 'activities.create', name: 'Crear actividades', groupKey: 'activities' },
  { key: 'activities.edit', name: 'Editar actividades', groupKey: 'activities' },
  { key: 'activities.delete', name: 'Eliminar actividades', groupKey: 'activities' },
  { key: 'activities.approve', name: 'Aprobar actividades', groupKey: 'activities' },
  {
    key: 'activities.manage_all',
    name: 'Gestionar actividades de cualquier equipo',
    groupKey: 'activities',
  },

  { key: 'tasks.view', name: 'Ver tareas', groupKey: 'tasks' },
  { key: 'tasks.create', name: 'Crear tareas', groupKey: 'tasks' },
  { key: 'tasks.edit', name: 'Editar tareas', groupKey: 'tasks' },
  { key: 'tasks.delete', name: 'Eliminar tareas', groupKey: 'tasks' },
  { key: 'tasks.complete', name: 'Completar tareas', groupKey: 'tasks' },
  { key: 'tasks.assign', name: 'Asignar tareas', groupKey: 'tasks' },

  { key: 'budgets.view', name: 'Ver presupuestos', groupKey: 'budgets' },
  { key: 'budgets.create', name: 'Crear presupuestos', groupKey: 'budgets' },
  { key: 'budgets.edit', name: 'Editar presupuestos', groupKey: 'budgets' },
  { key: 'budgets.delete', name: 'Eliminar presupuestos', groupKey: 'budgets' },

  { key: 'approvals.view', name: 'Ver aprobaciones', groupKey: 'approvals' },
  { key: 'approvals.approve', name: 'Aprobar', groupKey: 'approvals' },
  { key: 'approvals.reject', name: 'Rechazar', groupKey: 'approvals' },
  { key: 'approvals.request_changes', name: 'Solicitar cambios', groupKey: 'approvals' },

  { key: 'teams.view', name: 'Ver equipos', groupKey: 'teams' },
  { key: 'teams.create', name: 'Crear equipos', groupKey: 'teams' },
  { key: 'teams.edit', name: 'Editar equipos', groupKey: 'teams' },
  { key: 'teams.delete', name: 'Eliminar equipos', groupKey: 'teams' },
  { key: 'teams.manage_members', name: 'Gestionar miembros', groupKey: 'teams' },

  { key: 'users.view', name: 'Ver usuarios', groupKey: 'users' },
  { key: 'users.assign', name: 'Asignar personas a actividades/tareas', groupKey: 'users' },
  { key: 'users.assign_roles', name: 'Asignar roles', groupKey: 'users' },

  { key: 'roles.view', name: 'Ver roles', groupKey: 'roles' },
  { key: 'roles.create', name: 'Crear roles', groupKey: 'roles' },
  { key: 'roles.edit', name: 'Editar roles', groupKey: 'roles' },
  { key: 'roles.delete', name: 'Eliminar roles', groupKey: 'roles' },
  { key: 'roles.assign_permissions', name: 'Asignar permisos', groupKey: 'roles' },

  { key: 'calendar.view', name: 'Ver calendario', groupKey: 'calendar' },
  { key: 'calendar.manage', name: 'Gestionar calendario', groupKey: 'calendar' },

  { key: 'history.view', name: 'Ver historial', groupKey: 'history' },

  { key: 'settings.manage', name: 'Gestionar configuración', groupKey: 'settings' },
];

export const PERMISSION_GROUPS: Record<string, string> = {
  activities: 'Actividades',
  tasks: 'Tareas',
  budgets: 'Presupuestos',
  approvals: 'Aprobaciones',
  teams: 'Equipos',
  users: 'Usuarios',
  roles: 'Roles',
  calendar: 'Calendario',
  history: 'Historial',
  settings: 'Configuración',
};
