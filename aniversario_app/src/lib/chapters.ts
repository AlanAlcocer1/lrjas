import { anniversary, type MemoryPhoto } from '@/content/capsule';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

export type MemoryChapter = {
  index: number;
  roman: string;
  memories: MemoryPhoto[];
  from?: string;
  to?: string;
  /** Rango legible, p. ej. "nov 2025 — ene 2026" */
  rangeLabel: string;
};

function sortByDate(memories: MemoryPhoto[]) {
  return [...memories].sort((a, b) => {
    const da = a.memoryDate || '9999-99-99';
    const db = b.memoryDate || '9999-99-99';
    if (da !== db) return da.localeCompare(db);
    return a.id.localeCompare(b.id);
  });
}

function formatMonthYear(iso?: string) {
  if (!iso) return null;
  const [y, m] = iso.split('-');
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return iso;
  return `${MONTHS_ES[mi]} ${y}`;
}

function rangeLabel(from?: string, to?: string) {
  const a = formatMonthYear(from);
  const b = formatMonthYear(to);
  if (a && b && a !== b) return `${a} — ${b}`;
  return a || b || 'Sin fecha';
}

/** 12 ventanas mensuales del segundo año (para etiquetar capítulos vacíos). */
function monthWindows(count = 12): { from: string; to: string; label: string }[] {
  const start = new Date(`${anniversary.start}T12:00:00.000Z`);
  const out: { from: string; to: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const from = new Date(start);
    from.setUTCMonth(start.getUTCMonth() + i);
    const to = new Date(from);
    to.setUTCMonth(from.getUTCMonth() + 1);
    to.setUTCDate(to.getUTCDate() - 1);
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = to.toISOString().slice(0, 10);
    out.push({
      from: fromIso,
      to: toIso,
      label: formatMonthYear(fromIso) || `Cap. ${i + 1}`,
    });
  }
  return out;
}

/**
 * Siempre 12 capítulos. Fotos ordenadas por fecha, repartidas lo más pareja posible.
 * Si hay menos de 12 fotos, algunos capítulos quedan vacíos (con etiqueta del mes).
 */
export function splitIntoChapters(memories: MemoryPhoto[], chapterCount = 12): MemoryChapter[] {
  const sorted = sortByDate(memories);
  const n = sorted.length;
  const windows = monthWindows(chapterCount);
  const count = chapterCount;

  const sizes: number[] = Array.from({ length: count }, () => 0);
  if (n > 0) {
    const base = Math.floor(n / count);
    const rem = n % count;
    for (let i = 0; i < count; i++) {
      sizes[i] = base + (i < rem ? 1 : 0);
    }
  }

  const chapters: MemoryChapter[] = [];
  let offset = 0;
  for (let i = 0; i < count; i++) {
    const size = sizes[i] ?? 0;
    const slice = size > 0 ? sorted.slice(offset, offset + size) : [];
    offset += size;
    const win = windows[i];
    const from = slice[0]?.memoryDate ?? win?.from;
    const to = slice[slice.length - 1]?.memoryDate ?? win?.to;
    chapters.push({
      index: i + 1,
      roman: ROMAN[i] ?? String(i + 1),
      memories: slice,
      from,
      to,
      rangeLabel: slice.length
        ? rangeLabel(slice[0]?.memoryDate, slice[slice.length - 1]?.memoryDate)
        : win?.label || `Capítulo ${i + 1}`,
    });
  }
  return chapters;
}
