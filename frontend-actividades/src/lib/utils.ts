import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFullName(p: {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  motherLastName?: string | null;
  name?: string | null;
}) {
  if (p.name) return p.name;
  return [p.firstName, p.middleName, p.lastName, p.motherLastName].filter(Boolean).join(' ');
}

export function formatDate(date: string | Date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('es-MX', {
      timeZone: 'UTC',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date(date).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(date: string | Date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    const [y, m, d] = date.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('es-MX', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
    });
  }
  return new Date(date).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
  });
}

export function formatMoney(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(n);
}

export function approvalLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return 'En espera de aprobación';
    case 'APPROVED':
      return 'Aprobada';
    case 'REJECTED':
      return 'Rechazada';
    case 'CHANGES_REQUESTED':
      return 'Cambios solicitados';
    default:
      return status;
  }
}

/** Etiquetas legibles del historial de actividad. */
export function historyActionLabel(action: string) {
  switch (action) {
    case 'created':
      return 'Actividad creada';
    case 'updated':
      return 'Actividad actualizada';
    case 'deleted':
      return 'Actividad eliminada';
    case 'approved':
      return 'Actividad aprobada';
    case 'rejected':
      return 'Actividad rechazada';
    case 'changes_requested':
      return 'Se solicitaron cambios';
    case 'resubmitted':
      return 'Reenviada a aprobación';
    case 'postponed':
      return 'Actividad pospuesta';
    case 'postpone_approved':
      return 'Nueva fecha aprobada';
    case 'finalized':
      return 'Actividad finalizada';
    case 'cancelled':
      return 'Actividad cancelada';
    case 'marked_incomplete':
      return 'Marcada como incompleta';
    case 'task_created':
      return 'Tarea agregada';
    case 'task_updated':
      return 'Tarea actualizada';
    case 'task_completed':
      return 'Tarea completada';
    case 'task_deleted':
      return 'Tarea eliminada';
    default:
      return action.replace(/_/g, ' ');
  }
}

function historyDateBit(value: unknown) {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const key = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  return formatDate(key);
}

/** Detalle corto para entradas de historial (posponer, etc.). */
export function historyActionDetail(
  action: string,
  oldValue?: unknown,
  newValue?: unknown,
): string | null {
  const oldObj = (oldValue && typeof oldValue === 'object' ? oldValue : null) as Record<
    string,
    unknown
  > | null;
  const newObj = (newValue && typeof newValue === 'object' ? newValue : null) as Record<
    string,
    unknown
  > | null;

  if (action === 'postponed' || action === 'postpone_approved') {
    const from = historyDateBit(oldObj?.date);
    const to = historyDateBit(newObj?.date);
    const start = typeof newObj?.startTime === 'string' ? newObj.startTime : null;
    const end = typeof newObj?.endTime === 'string' ? newObj.endTime : null;
    const reason = typeof newObj?.reason === 'string' ? newObj.reason : null;
    const parts: string[] = [];
    if (from && to) parts.push(`De ${from} a ${to}`);
    else if (to) parts.push(`Nueva fecha: ${to}`);
    if (start) parts.push(end ? `${start}–${end}` : start);
    if (reason) parts.push(reason);
    return parts.length ? parts.join(' · ') : null;
  }

  if (action === 'task_created' || action === 'task_completed' || action === 'task_deleted') {
    const name = typeof newObj?.name === 'string' ? newObj.name : typeof oldObj?.name === 'string' ? oldObj.name : null;
    return name;
  }

  if (action === 'rejected' && typeof newObj?.rejectionReason === 'string') {
    return newObj.rejectionReason;
  }

  return null;
}

/** Estados en los que se pueden completar tareas. */
export const TASKS_ALLOWED_STATUS_NAMES = new Set([
  'Planificación',
  'En curso',
  'Incompleta',
]);

/** Actividad cerrada: cancelada / finalizada / rechazada. */
export const CLOSED_ACTIVITY_STATUS_NAMES = new Set([
  'Cancelada',
  'Finalizada',
  'Rechazada',
]);

export function canCompleteTasks(statusName?: string | null) {
  return !!statusName && TASKS_ALLOWED_STATUS_NAMES.has(statusName);
}

export function isActivityClosed(statusName?: string | null) {
  return !!statusName && CLOSED_ACTIVITY_STATUS_NAMES.has(statusName);
}

/** Puede crear/editar actividades de ese equipo (o todas si tiene manage_all). */
export function canManageActivityTeam(
  user: { permissions?: string[]; teamIds?: string[] } | null | undefined,
  teamId?: string | null,
) {
  if (!user) return false;
  if (user.permissions?.includes('activities.manage_all')) return true;
  if (!teamId) return false;
  return (user.teamIds ?? []).includes(teamId);
}

export function taskStatusLabel(status: string) {
  switch (status) {
    case 'TODO':
      return 'Por hacer';
    case 'IN_PROGRESS':
      return 'En progreso';
    case 'DONE':
      return 'Hecha';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
}

export function priorityLabel(priority: string) {
  switch (priority) {
    case 'LOW':
      return 'Baja';
    case 'MEDIUM':
      return 'Media';
    case 'HIGH':
      return 'Alta';
    default:
      return priority;
  }
}

export function getErrorMessage(err: unknown, fallback = 'Ocurrió un error') {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string | string[] } } }).response;
    const msg = response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
