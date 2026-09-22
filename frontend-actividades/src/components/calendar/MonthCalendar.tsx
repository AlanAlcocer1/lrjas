import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function toDateKey(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function monthRange(year: number, monthIndex: number) {
  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function shiftMonth(year: number, monthIndex: number, delta: number) {
  const d = new Date(year, monthIndex + delta, 1);
  return { year: d.getFullYear(), monthIndex: d.getMonth() };
}

type Cell = {
  key: string;
  day: number;
  inMonth: boolean;
};

function buildCells(year: number, monthIndex: number): Cell[] {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const prevDays = new Date(year, monthIndex, 0).getDate();

  const cells: Cell[] = [];

  for (let i = 0; i < startPad; i++) {
    const day = prevDays - startPad + 1 + i;
    const date = new Date(year, monthIndex - 1, day);
    cells.push({ key: toDateKey(date), day, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    cells.push({ key: toDateKey(date), day, inMonth: true });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, monthIndex + 1, nextDay);
    cells.push({ key: toDateKey(date), day: nextDay, inMonth: false });
    nextDay += 1;
  }

  return cells;
}

type MonthCalendarProps = {
  year: number;
  monthIndex: number;
  selectedKey: string;
  countsByDate: Record<string, number>;
  onSelect: (dateKey: string) => void;
  onMonthChange: (year: number, monthIndex: number) => void;
  className?: string;
};

export function MonthCalendar({
  year,
  monthIndex,
  selectedKey,
  countsByDate,
  onSelect,
  onMonthChange,
  className,
}: MonthCalendarProps) {
  const todayKey = toDateKey(new Date());
  const cells = buildCells(year, monthIndex);
  const title = new Date(year, monthIndex, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mes anterior"
          onClick={() => {
            const next = shiftMonth(year, monthIndex, -1);
            onMonthChange(next.year, next.monthIndex);
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-sm sm:text-base font-semibold capitalize truncate px-2">{title}</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mes siguiente"
          onClick={() => {
            const next = shiftMonth(year, monthIndex, 1);
            onMonthChange(next.year, next.monthIndex);
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const count = countsByDate[cell.key] ?? 0;
          const selected = cell.key === selectedKey;
          const isToday = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              className={cn(
                'relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5',
                'text-sm font-medium transition-colors min-h-10 sm:min-h-12',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf',
                !cell.inMonth && 'text-muted-foreground/40',
                cell.inMonth && !selected && 'text-foreground hover:bg-muted',
                selected && 'bg-leaf text-white shadow-sm',
                !selected && isToday && cell.inMonth && 'ring-2 ring-leaf/40 bg-leaf/10',
              )}
            >
              <span className="leading-none">{cell.day}</span>
              <span className="flex h-1.5 items-center justify-center gap-0.5">
                {count > 0 &&
                  Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-1 w-1 rounded-full',
                        selected ? 'bg-white' : 'bg-leaf',
                      )}
                    />
                  ))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground text-center">
        Toca un día para ver sus actividades
      </p>
    </div>
  );
}
