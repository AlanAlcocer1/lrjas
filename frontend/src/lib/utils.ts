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
