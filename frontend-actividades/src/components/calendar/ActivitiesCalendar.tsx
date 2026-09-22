import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckSquare, Clock, MapPin, Repeat, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  approvalLabel,
  cn,
  formatDate,
  formatFullName,
  priorityLabel,
} from '@/lib/utils';
import type { Activity, ActivityTask, PublicActivity } from '@/types';
import { toDateKey } from '@/components/calendar/MonthCalendar';
import {
  activityTouchesDay,
  exclusiveEndKey,
  expandOccurrences,
} from '@/lib/recurrence';
import './activities-calendar.css';

const FALLBACK_COLOR = '#84bd31';
const TASK_FALLBACK = '#64748b';
const CANCELLED_COLOR = '#94a3b8';

type CalendarItem = Activity | PublicActivity;

function isAdminActivity(a: CalendarItem): a is Activity {
  return 'approvalStatus' in a;
}

function operationalStatus(a: CalendarItem): { name: string; color: string } | null {
  if (a.status?.name) {
    return { name: a.status.name, color: a.status.color || FALLBACK_COLOR };
  }
  if (isAdminActivity(a)) {
    return { name: approvalLabel(a.approvalStatus), color: FALLBACK_COLOR };
  }
  return null;
}

function isCancelled(a: CalendarItem) {
  return a.status?.name === 'Cancelada';
}

function isRejected(a: CalendarItem) {
  return a.status?.name === 'Rechazada';
}

function isPostponed(a: CalendarItem) {
  return a.status?.name === 'Pospuesta';
}

function recurrenceHint(a: CalendarItem): string | null {
  const type = a.recurrenceType ?? 'NONE';
  if (type === 'INTERVAL') {
    const n = a.recurrenceInterval ?? 1;
    return n === 1 ? 'Cada día' : `Cada ${n} días`;
  }
  if (type === 'WEEKLY') {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const days = (a.recurrenceWeekdays ?? []).map((d) => labels[d]).join(', ');
    return days ? `Semanal: ${days}` : 'Semanal';
  }
  return null;
}

type ActivitiesCalendarProps = {
  items: CalendarItem[];
  /** Solo modo admin: tareas con dueDate */
  tasks?: ActivityTask[];
  loading?: boolean;
  mode: 'admin' | 'public';
  onRangeChange?: (from: string, to: string) => void;
  className?: string;
};

export function ActivitiesCalendar({
  items,
  tasks = [],
  loading,
  mode,
  onRangeChange,
  className,
}: ActivitiesCalendarProps) {
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [monthLabel, setMonthLabel] = useState('');
  const [viewRange, setViewRange] = useState<{ from: string; to: string } | null>(null);

  const showTasks = mode === 'admin' && tasks.length >= 0;

  const byId = useMemo(() => {
    const map = new Map<string, CalendarItem>();
    for (const a of items) map.set(a.id, a);
    return map;
  }, [items]);

  const events: EventInput[] = useMemo(() => {
    const from = viewRange?.from ?? '1970-01-01';
    const to = viewRange?.to ?? '2100-01-01';
    const occs = expandOccurrences(items, from, to);

    const activityEvents: EventInput[] = occs
      .map((o) => {
        const a = byId.get(o.activityId);
        if (!a) return null;
        const cancelled = isCancelled(a);
        const rejected = isRejected(a);
        const postponed = isPostponed(a);
        const muted = cancelled || rejected;
        const teamColor = a.team?.color || FALLBACK_COLOR;
        const color = cancelled
          ? CANCELLED_COLOR
          : rejected
            ? '#dc2626'
            : postponed
              ? '#a855f7'
              : teamColor;
        const multi = o.startKey !== o.endKey;
        const prefix = cancelled ? '✕ ' : rejected ? '! ' : postponed ? '⏭ ' : '';
        return {
          id: `activity-${a.id}-${o.startKey}`,
          title: `${prefix}${a.name}`,
          start: o.startKey,
          end: multi ? exclusiveEndKey(o.endKey) : undefined,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: '#ffffff',
          classNames: [
            'fc-event-activity',
            cancelled ? 'fc-event-cancelled' : '',
            rejected ? 'fc-event-rejected' : '',
          ].filter(Boolean),
          extendedProps: {
            dateKey: o.startKey,
            kind: 'activity',
            activityId: a.id,
            muted,
          },
        } satisfies EventInput;
      })
      .filter(Boolean) as EventInput[];

    if (mode !== 'admin') return activityEvents;

    const taskEvents: EventInput[] = tasks
      .filter((t) => t.dueDate)
      .map((t) => {
        const color = t.activity?.team?.color || TASK_FALLBACK;
        return {
          id: `task-${t.id}`,
          title: `☐ ${t.name}`,
          start: toDateKey(t.dueDate!),
          allDay: true,
          backgroundColor: t.completed ? '#94a3b8' : color,
          borderColor: t.completed ? '#94a3b8' : color,
          textColor: '#ffffff',
          classNames: ['fc-event-task', t.completed ? 'fc-event-task-done' : ''],
          extendedProps: {
            dateKey: toDateKey(t.dueDate!),
            kind: 'task',
            completed: t.completed,
          },
        };
      });

    return [...activityEvents, ...taskEvents];
  }, [items, tasks, mode, viewRange, byId]);

  const legend = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const a of items) {
      if (a.team?.id) {
        map.set(a.team.id, {
          name: a.team.name,
          color: a.team.color || FALLBACK_COLOR,
        });
      }
    }
    for (const t of mode === 'admin' ? tasks : []) {
      const team = t.activity?.team;
      if (team?.id) {
        map.set(team.id, {
          name: team.name,
          color: team.color || FALLBACK_COLOR,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [items, tasks, mode]);

  const dayActivities = useMemo(() => {
    if (!selectedKey) return [];
    return items
      .filter((a) => activityTouchesDay(a, selectedKey))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [items, selectedKey]);

  const dayTasks = useMemo(() => {
    if (!selectedKey || mode !== 'admin') return [];
    return tasks
      .filter((t) => t.dueDate && toDateKey(t.dueDate) === selectedKey)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || a.name.localeCompare(b.name, 'es'));
  }, [tasks, selectedKey, mode]);

  const openDay = (dateKey: string) => {
    setSelectedKey(dateKey);
    setOpen(true);
  };

  const onEventClick = (info: EventClickArg) => {
    info.jsEvent.preventDefault();
    const key = (info.event.extendedProps.dateKey as string) || toDateKey(info.event.startStr);
    openDay(key);
  };

  const onDatesSet = (arg: DatesSetArg) => {
    const from = toDateKey(arg.start);
    const to = toDateKey(arg.end);
    setViewRange({ from, to });
    onRangeChange?.(from, to);
    const label = arg.view.currentStart
      .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      .replace(/\s+de\s+/gi, ' ');
    setMonthLabel(label);
  };

  const emptyDay = dayActivities.length === 0 && dayTasks.length === 0;

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'rounded-2xl border border-border bg-card p-2 sm:p-4 shadow-sm overflow-hidden',
          'fc-lrjas',
          loading && 'opacity-60 pointer-events-none',
        )}
      >
        {monthLabel && (
          <p className="fc-custom-month-title text-sm sm:text-base font-semibold capitalize text-foreground">
            {monthLabel}
          </p>
        )}
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={{
            left: 'prev',
            center: '',
            right: 'next',
          }}
          height="auto"
          fixedWeekCount={false}
          showNonCurrentDates
          events={events}
          dateClick={(arg) => openDay(arg.dateStr)}
          eventClick={onEventClick}
          datesSet={onDatesSet}
          dayMaxEvents={4}
          moreLinkClick={(arg) => {
            openDay(toDateKey(arg.date));
            return 'force';
          }}
          eventDisplay="block"
          displayEventTime={false}
        />
      </div>

      <div className="flex flex-wrap gap-2 px-1">
        {legend.map((item) => (
          <span
            key={item.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium"
          >
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: item.color }} />
            {item.name}
          </span>
        ))}
        {showTasks && mode === 'admin' && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <CheckSquare className="h-3 w-3" />
            Tareas (☐)
          </span>
        )}
        {mode === 'admin' && items.some(isCancelled) && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full shrink-0 bg-slate-400" />
            Cancelada
          </span>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            'p-0 gap-0 overflow-hidden',
            'sm:max-w-lg',
            'max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:bottom-0 max-sm:translate-x-0 max-sm:translate-y-0',
            'max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[85dvh]',
          )}
        >
          <div className="max-sm:flex max-sm:justify-center max-sm:pt-2 max-sm:pb-1">
            <div className="max-sm:h-1 max-sm:w-10 max-sm:rounded-full max-sm:bg-border" />
          </div>

          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border text-left space-y-1">
            <div className="min-w-0 pr-6">
              <DialogTitle className="text-left truncate">
                {selectedKey ? formatDate(selectedKey) : 'Día'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {dayActivities.length} {dayActivities.length === 1 ? 'actividad' : 'actividades'}
                {mode === 'admin' && (
                  <>
                    {' · '}
                    {dayTasks.length} {dayTasks.length === 1 ? 'tarea' : 'tareas'}
                  </>
                )}
              </p>
            </div>
          </DialogHeader>

          <div className="px-4 py-4 space-y-4 overflow-y-auto max-h-[60dvh] sm:max-h-[65dvh]">
            {emptyDay ? (
              <div className="flex flex-col items-center text-center py-10 px-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted border border-border">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium">Nada este día</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No hay actividades{mode === 'admin' ? ' ni tareas' : ''} programadas.
                </p>
              </div>
            ) : (
              <>
                {dayActivities.length > 0 && (
                  <section className="space-y-2">
                    {mode === 'admin' && dayTasks.length > 0 && (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Actividades
                      </h3>
                    )}
                    {dayActivities.map((a) => {
                      const cancelled = isCancelled(a);
                      const status = operationalStatus(a);
                      const color = cancelled
                        ? CANCELLED_COLOR
                        : a.team?.color || FALLBACK_COLOR;
                      const href = mode === 'public' ? `/evento/${a.id}` : `/app/actividades/${a.id}`;
                      const timeLabel = a.endTime
                        ? `${a.startTime} – ${a.endTime}`
                        : a.startTime;
                      const recur = recurrenceHint(a);
                      const multi =
                        a.endDate && toDateKey(a.endDate) !== toDateKey(a.date)
                          ? `${formatDate(a.date)} – ${formatDate(a.endDate)}`
                          : null;

                      return (
                        <Link
                          key={a.id}
                          to={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'block rounded-xl border border-border bg-card overflow-hidden hover:border-leaf/40 transition-colors active:scale-[0.99]',
                            cancelled && 'opacity-70',
                          )}
                        >
                          <div className="h-1.5 w-full" style={{ background: color }} />
                          <div className="p-3.5 space-y-2">
                            <div className="flex items-start gap-2">
                              <h3
                                className={cn(
                                  'font-semibold text-sm leading-snug flex-1 min-w-0 break-words',
                                  cancelled && 'line-through text-muted-foreground',
                                )}
                              >
                                {a.name}
                              </h3>
                              {mode === 'admin' && status && (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 max-w-[8.5rem] text-center leading-tight whitespace-normal"
                                  style={{ borderColor: status.color, color: status.color }}
                                >
                                  {status.name}
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                {timeLabel}
                                {multi ? ` · ${multi}` : null}
                              </p>
                              {recur && (
                                <p className="flex items-center gap-1.5">
                                  <Repeat className="h-3.5 w-3.5 shrink-0" />
                                  {recur}
                                </p>
                              )}
                              <p className="flex items-start gap-1.5 min-w-0">
                                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span className="break-words">{a.location}</span>
                              </p>
                            </div>
                            {a.team && (
                              <p className="inline-flex items-center gap-1.5 text-xs font-medium">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ background: a.team.color || FALLBACK_COLOR }}
                                />
                                {a.team.name}
                              </p>
                            )}
                            {mode === 'public' && 'publicDescription' in a && a.publicDescription && (
                              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4 break-words">
                                {a.publicDescription}
                              </p>
                            )}
                            {isAdminActivity(a) && (
                              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                {a.progress && a.progress.total > 0 && (
                                  <span>
                                    Tareas {a.progress.completed}/{a.progress.total}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </section>
                )}

                {dayTasks.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5" />
                      Tareas
                    </h3>
                    {dayTasks.map((t) => {
                      const color = t.activity?.team?.color || TASK_FALLBACK;
                      const href = t.activity?.id
                        ? `/app/actividades/${t.activity.id}`
                        : '/app/tareas';

                      return (
                        <Link
                          key={t.id}
                          to={href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'block rounded-xl border border-dashed bg-card overflow-hidden hover:border-leaf/40 transition-colors active:scale-[0.99]',
                            t.completed ? 'border-border opacity-70' : 'border-border',
                          )}
                        >
                          <div className="h-1 w-full" style={{ background: color }} />
                          <div className="p-3 space-y-1.5">
                            <div className="flex items-start gap-2">
                              <p
                                className={cn(
                                  'font-medium text-sm flex-1 min-w-0 break-words',
                                  t.completed && 'line-through text-muted-foreground',
                                )}
                              >
                                {t.completed ? '☑' : '☐'} {t.name}
                              </p>
                              <Badge
                                variant={
                                  t.priority === 'HIGH'
                                    ? 'destructive'
                                    : t.completed
                                      ? 'secondary'
                                      : 'outline'
                                }
                                className="shrink-0"
                              >
                                {t.completed ? 'Hecha' : priorityLabel(t.priority)}
                              </Badge>
                            </div>
                            {t.activity && (
                              <p className="text-xs text-muted-foreground truncate">
                                {t.activity.name}
                              </p>
                            )}
                            {t.assignee && (
                              <p className="text-xs text-muted-foreground truncate">
                                Asignada a: {formatFullName(t.assignee)}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </section>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-border safe-bottom">
            <DialogClose asChild>
              <Button variant="outline" className="w-full">
                <X className="h-4 w-4" />
                Cerrar
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
