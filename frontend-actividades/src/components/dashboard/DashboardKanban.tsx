import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckSquare, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatDateShort, priorityLabel } from '@/lib/utils';
import type { Activity, ActivityTask, DashboardData } from '@/types';

const TASK_COLUMNS: {
  key: 'TODO' | 'IN_PROGRESS' | 'DONE';
  label: string;
  color: string;
}[] = [
  { key: 'TODO', label: 'Por hacer', color: '#94a3b8' },
  { key: 'IN_PROGRESS', label: 'En progreso', color: '#3b82f6' },
  { key: 'DONE', label: 'Hechas', color: '#84bd31' },
];

type Board = NonNullable<DashboardData['board']>;

export function DashboardKanban({ board }: { board: Board }) {
  const [tab, setTab] = useState('activities');

  const activitiesByStatus = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const s of board.statuses) map.set(s.name, []);
    for (const a of board.activities) {
      const key = a.status?.name;
      if (!key || !map.has(key)) continue;
      map.get(key)!.push(a);
    }
    return map;
  }, [board]);

  const tasksByStatus = useMemo(() => {
    const map: Record<'TODO' | 'IN_PROGRESS' | 'DONE', ActivityTask[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const t of board.tasks) {
      if (t.completed || t.status === 'DONE') {
        map.DONE.push(t);
      } else if (t.status === 'IN_PROGRESS') {
        map.IN_PROGRESS.push(t);
      } else {
        map.TODO.push(t);
      }
    }
    return map;
  }, [board.tasks]);

  return (
    <section className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-md">
          <TabsTrigger value="activities" className="flex-1 gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Actividades
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Mis tareas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="mt-3">
          {board.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay actividades activas para mostrar en el tablero.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {board.statuses.map((status) => {
                const items = activitiesByStatus.get(status.name) ?? [];
                return (
                  <KanbanColumn
                    key={status.id}
                    title={status.name}
                    color={status.color}
                    count={items.length}
                  >
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1 py-4 text-center">
                        Vacío
                      </p>
                    ) : (
                      items.map((a) => <ActivityKanbanCard key={a.id} activity={a} />)
                    )}
                  </KanbanColumn>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-3">
          {board.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No tienes tareas pendientes ni recientes.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {TASK_COLUMNS.map((col) => {
                const items = tasksByStatus[col.key];
                return (
                  <KanbanColumn
                    key={col.key}
                    title={col.label}
                    color={col.color}
                    count={items.length}
                  >
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1 py-4 text-center">
                        Vacío
                      </p>
                    ) : (
                      items.map((t) => <TaskKanbanCard key={t.id} task={t} />)
                    )}
                  </KanbanColumn>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function KanbanColumn({
  title,
  color,
  count,
  children,
}: {
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[min(16.5rem,78vw)] shrink-0 snap-start flex flex-col rounded-2xl border border-border bg-muted/40 min-h-[12rem] max-h-[28rem]">
      <div className="sticky top-0 z-[1] flex items-center gap-2 px-3 py-2.5 border-b border-border/80 bg-muted/80 backdrop-blur-sm rounded-t-2xl">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
        <h3 className="text-xs font-semibold truncate flex-1" style={{ color }}>
          {title}
        </h3>
        <span className="text-[11px] tabular-nums text-muted-foreground font-medium">{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">{children}</div>
    </div>
  );
}

function ActivityKanbanCard({ activity }: { activity: Activity }) {
  const progress = activity.progress;
  return (
    <Link
      to={`/actividades/${activity.id}`}
      className={cn(
        'block rounded-xl border border-border bg-card p-3 space-y-2',
        'hover:border-leaf/40 hover:shadow-sm transition-all active:scale-[0.99]',
      )}
    >
      <div className="flex items-start gap-2">
        <p className="text-sm font-medium leading-snug flex-1 min-w-0 break-words">
          {activity.name}
        </p>
        {activity.team && (
          <span
            className="h-2 w-2 rounded-full shrink-0 mt-1.5"
            style={{ background: activity.team.color || '#84bd31' }}
            title={activity.team.name}
          />
        )}
      </div>
      <div className="space-y-1 text-[11px] text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {formatDateShort(activity.date)}
          {activity.startTime ? ` · ${activity.startTime}` : ''}
        </p>
        {activity.location && (
          <p className="flex items-start gap-1.5 min-w-0">
            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="truncate">{activity.location}</span>
          </p>
        )}
      </div>
      {activity.team && (
        <p className="text-[11px] text-muted-foreground truncate">{activity.team.name}</p>
      )}
      {progress && progress.total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Tareas</span>
            <span>
              {progress.completed}/{progress.total}
            </span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-leaf transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

function TaskKanbanCard({ task }: { task: ActivityTask }) {
  const overdue =
    !task.completed &&
    task.dueDate &&
    task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);

  return (
    <Link
      to={task.activity?.id ? `/actividades/${task.activity.id}` : '/tareas'}
      className={cn(
        'block rounded-xl border border-border bg-card p-3 space-y-2',
        'hover:border-leaf/40 hover:shadow-sm transition-all active:scale-[0.99]',
        task.completed && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-2">
        <p
          className={cn(
            'text-sm font-medium leading-snug flex-1 min-w-0 break-words',
            task.completed && 'line-through text-muted-foreground',
          )}
        >
          {task.name}
        </p>
        <Badge
          variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}
          className="shrink-0 text-[10px] px-1.5 py-0"
        >
          {priorityLabel(task.priority)}
        </Badge>
      </div>
      {task.activity && (
        <p className="text-[11px] text-muted-foreground truncate">{task.activity.name}</p>
      )}
      {task.dueDate && (
        <p
          className={cn(
            'text-[11px]',
            overdue ? 'text-amber-700 font-medium' : 'text-muted-foreground',
          )}
        >
          {overdue ? 'Vencida · ' : 'Vence '}
          {formatDateShort(task.dueDate)}
        </p>
      )}
    </Link>
  );
}
