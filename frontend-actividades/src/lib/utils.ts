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
      return 'Pendiente';
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
