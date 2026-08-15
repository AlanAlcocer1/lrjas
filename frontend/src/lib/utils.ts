import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { hora_mexico, mexicoDateKey } from '@/lib/mexico-time';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFullName(p: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [p.firstName, p.middleName, p.lastName, p.motherLastName].filter(Boolean).join(' ');
}

export function formatDate(date: string | Date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString('es-MX', {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date(date).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Fecha calendario México (YYYY-MM-DD) para comparar con filtros del dashboard */
export function formatDateKey(date: string | Date): string {
  return mexicoDateKey(new Date(date));
}

export function formatTime(date: string | Date) {
  return hora_mexico(date);
}
