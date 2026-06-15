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
  return new Date(date).toLocaleDateString('en-CA', { timeZone: TZ });
}

export function ageFromBirthDateKey(birthDateKey: string, todayKey?: string): number {
  const today = todayKey ?? mexicoDateKey();
  const [ty, tm, td] = today.split('-').map(Number);
  const [by, bm, bd] = birthDateKey.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

export function maxBirthDateForAge(minAge: number): string {
  const today = mexicoDateKey();
  const [y, m, d] = today.split('-').map(Number);
  return mexicoDateKey(new Date(Date.UTC(y - minAge, m - 1, d, 12, 0, 0)));
}

export function minBirthDateForAge(maxAge: number): string {
  const today = mexicoDateKey();
  const [y, m, d] = today.split('-').map(Number);
  return mexicoDateKey(new Date(Date.UTC(y - maxAge - 1, m - 1, d + 1, 12, 0, 0)));
}
