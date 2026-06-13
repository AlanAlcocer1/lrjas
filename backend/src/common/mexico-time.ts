const TZ = 'America/Mexico_City';

export function hora_mexico(date: Date | string = new Date()): string {
  return new Date(date).toLocaleTimeString('es-MX', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function fecha_mexico(date: Date | string = new Date()): string {
  return new Date(date).toLocaleDateString('es-MX', {
    timeZone: TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function mexicoDateKey(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TZ });
}

export function getMexicoMonthBounds(date: Date = new Date()): { start: Date; end: Date } {
  const key = mexicoDateKey(date);
  const [y, m] = key.split('-').map(Number);
  const start = zonedLocalToUtc(`${y}-${String(m).padStart(2, '0')}-01`, 0, 0, 0);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const end = zonedLocalToUtc(`${nextY}-${String(nextM).padStart(2, '0')}-01`, 0, 0, 0);
  return { start, end };
}

function getMexicoWeekday(date: Date): number {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}

export function getMexicoWeekBounds(date: Date = new Date()): { start: Date; end: Date } {
  const key = mexicoDateKey(date);
  const [y, m, d] = key.split('-').map(Number);
  const dayIndex = getMexicoWeekday(date);
  const mondayOffset = dayIndex === 0 ? 6 : dayIndex - 1;

  const mondayRef = new Date(Date.UTC(y, m - 1, d - mondayOffset, 12, 0, 0));
  const startKey = mexicoDateKey(mondayRef);
  const start = zonedLocalToUtc(startKey, 0, 0, 0);

  const nextMondayRef = new Date(Date.UTC(y, m - 1, d - mondayOffset + 7, 12, 0, 0));
  const endKey = mexicoDateKey(nextMondayRef);
  const end = zonedLocalToUtc(endKey, 0, 0, 0);

  return { start, end };
}

export function getMexicoDayBounds(date: Date = new Date()): { start: Date; end: Date } {
  return getMexicoDayBoundsFromKey(mexicoDateKey(date));
}

export function getMexicoDayBoundsFromKey(dateKey: string): { start: Date; end: Date } {
  const start = zonedLocalToUtc(dateKey, 0, 0, 0);
  const [y, m, d] = dateKey.split('-').map(Number);
  const nextKey = mexicoDateKey(new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)));
  const end = zonedLocalToUtc(nextKey, 0, 0, 0);
  return { start, end };
}

export function parseMexicoDate(dateKey: string): Date {
  return zonedLocalToUtc(dateKey, 12, 0, 0);
}

function zonedLocalToUtc(dateKey: string, hour: number, minute: number, second: number): Date {
  const [y, mo, d] = dateKey.split('-').map(Number);
  let utcMs = Date.UTC(y, mo - 1, d, hour, minute, second);

  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(utcMs));

    const py = Number(parts.find((p) => p.type === 'year')!.value);
    const pm = Number(parts.find((p) => p.type === 'month')!.value);
    const pd = Number(parts.find((p) => p.type === 'day')!.value);
    const ph = Number(parts.find((p) => p.type === 'hour')!.value);
    const pmin = Number(parts.find((p) => p.type === 'minute')!.value);
    const ps = Number(parts.find((p) => p.type === 'second')!.value);

    const desired = Date.UTC(y, mo - 1, d, hour, minute, second);
    const actual = Date.UTC(py, pm - 1, pd, ph, pmin, ps);
    utcMs += desired - actual;
    if (desired === actual) break;
  }

  return new Date(utcMs);
}
