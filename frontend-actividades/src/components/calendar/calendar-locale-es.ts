import type { LocaleInput } from '@fullcalendar/core';

/** Locale español fijo (México / LatAm). */
export const calendarLocaleEs: LocaleInput = {
  code: 'es',
  buttonText: {
    prev: 'Ant',
    next: 'Sig',
    today: 'Hoy',
    year: 'Año',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    list: 'Agenda',
  },
  weekText: 'Sm',
  allDayText: 'Todo el día',
  moreLinkText(n) {
    return `+${n} más`;
  },
  noEventsText: 'No hay eventos para mostrar',
  direction: 'ltr',
};

export const WEEKDAY_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export function formatMonthYearEs(date: Date) {
  return `${MONTH_NAMES_ES[date.getMonth()]} ${date.getFullYear()}`;
}
