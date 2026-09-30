import { parseDateKey, toDateKey } from '@/components/calendar/MonthCalendar';
import type { RecurrenceType } from '@/types';

export type Schedulable = {
  id: string;
  date: string;
  endDate?: string | null;
  recurrenceType?: RecurrenceType | null;
  recurrenceInterval?: number | null;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: string | null;
};

export type Occurrence = {
  activityId: string;
  startKey: string;
  /** Inclusive last day of this occurrence (multi-día) */
  endKey: string;
};

function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

function cmp(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function spanDays(startKey: string, endDate?: string | null): number {
  if (!endDate) return 0;
  const start = parseDateKey(startKey);
  const end = parseDateKey(endDate.slice(0, 10));
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(0, diff);
}

/**
 * Expande actividades (multi-día + recurrencia) a ocurrencias que tocan [rangeFrom, rangeTo).
 * rangeTo es exclusivo (como FullCalendar datesSet).
 */
export function expandOccurrences(
  items: Schedulable[],
  rangeFrom: string,
  rangeTo: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  const horizon = addDays(rangeTo, 400); // tope de seguridad

  for (const a of items) {
    const baseStart = toDateKey(a.date);
    const duration = spanDays(baseStart, a.endDate);
    const type = a.recurrenceType ?? 'NONE';
    const until = a.recurrenceUntil ? toDateKey(a.recurrenceUntil) : null;

    if (type === 'NONE') {
      const endKey = addDays(baseStart, duration);
      if (cmp(endKey, rangeFrom) >= 0 && cmp(baseStart, rangeTo) < 0) {
        out.push({ activityId: a.id, startKey: baseStart, endKey });
      }
      continue;
    }

    if (type === 'INTERVAL') {
      const interval = Math.max(1, a.recurrenceInterval ?? 1);
      let cursor = baseStart;
      // Avanza hasta cerca del rango
      if (cmp(cursor, rangeFrom) < 0) {
        const start = parseDateKey(baseStart);
        const from = parseDateKey(rangeFrom);
        const daysDiff = Math.floor((from.getTime() - start.getTime()) / 86400000);
        const steps = Math.floor(daysDiff / interval);
        cursor = addDays(baseStart, Math.max(0, steps) * interval);
        while (cmp(addDays(cursor, duration), rangeFrom) < 0) {
          cursor = addDays(cursor, interval);
        }
      }
      let guard = 0;
      while (cmp(cursor, rangeTo) < 0 && guard++ < 500) {
        if (until && cmp(cursor, until) > 0) break;
        if (cmp(cursor, horizon) > 0) break;
        const endKey = addDays(cursor, duration);
        if (cmp(endKey, rangeFrom) >= 0 && cmp(cursor, rangeTo) < 0) {
          out.push({ activityId: a.id, startKey: cursor, endKey });
        }
        cursor = addDays(cursor, interval);
      }
      continue;
    }

    if (type === 'WEEKLY') {
      const weekdays = new Set(a.recurrenceWeekdays ?? []);
      if (weekdays.size === 0) continue;
      let cursor = cmp(baseStart, rangeFrom) < 0 ? rangeFrom : baseStart;
      // Retrocede duration días por si un multi-día empezó antes del rango
      cursor = addDays(cursor, -duration);
      if (cmp(cursor, baseStart) < 0) cursor = baseStart;

      let guard = 0;
      while (cmp(cursor, rangeTo) < 0 && guard++ < 800) {
        if (until && cmp(cursor, until) > 0) break;
        if (cmp(cursor, baseStart) >= 0 && weekdays.has(parseDateKey(cursor).getDay())) {
          const endKey = addDays(cursor, duration);
          if (cmp(endKey, rangeFrom) >= 0 && cmp(cursor, rangeTo) < 0) {
            out.push({ activityId: a.id, startKey: cursor, endKey });
          }
        }
        cursor = addDays(cursor, 1);
      }
    }
  }

  return out;
}

/** ¿La actividad toca este día (considerando multi-día y recurrencia)? */
export function activityTouchesDay(a: Schedulable, dayKey: string): boolean {
  const occ = expandOccurrences([a], dayKey, addDays(dayKey, 1));
  return occ.some(
    (o) => cmp(o.startKey, dayKey) <= 0 && cmp(dayKey, o.endKey) <= 0,
  );
}

export function exclusiveEndKey(endKeyInclusive: string): string {
  return addDays(endKeyInclusive, 1);
}
