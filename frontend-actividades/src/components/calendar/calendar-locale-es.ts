import type { LocaleInput } from '@fullcalendar/core';

/** Locale español fijo (México / LatAm). Nombres embebidos para no depender del navegador. */
export const calendarLocaleEs: LocaleInput = {
  code: 'es',
  week: {
    dow: 0, // domingo primero
    doy: 4,
  },
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
  buttonHints: {
    prev: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
  },
  weekText: 'Sm',
  weekTextLong: 'Semana',
  allDayText: 'Todo el día',
  moreLinkText(n) {
    return `+${n} más`;
  },
  noEventsText: 'No hay eventos para mostrar',
  closeHint: 'Cerrar',
  timeHint: 'Hora',
  eventHint: 'Evento',
  direction: 'ltr',
};

/** Encabezados de día (FullCalendar los toma del locale vía Intl; forzamos en CSS/UI aparte). */
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
