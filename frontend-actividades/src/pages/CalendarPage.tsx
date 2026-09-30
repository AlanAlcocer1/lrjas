import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { activitiesApi } from '@/services/api';
import type { Activity, ActivityTask } from '@/types';
import { ActivitiesCalendar } from '@/components/calendar/ActivitiesCalendar';
import { CalendarSubscribeButton } from '@/components/calendar/CalendarSubscribeButton';
import { Skeleton } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';

export function CalendarPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<ActivityTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const canViewTasks = hasPermission('tasks.view');

  const load = useCallback(
    (from: string, to: string) => {
      setLoading(true);
      Promise.all([
        activitiesApi.list({ from, to }),
        canViewTasks ? activitiesApi.listTasks({ from, to }).catch(() => []) : Promise.resolve([]),
      ])
        .then(([acts, tks]) => {
          setItems(acts);
          setTasks(tks);
        })
        .catch((err) => toast.error(getErrorMessage(err)))
        .finally(() => setLoading(false));
    },
    [canViewTasks],
  );

  useEffect(() => {
    if (!range) return;
    load(range.from, range.to);
  }, [range, load]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground">
            Actividades y tareas · toca un día para ver el detalle
          </p>
        </div>
        <CalendarSubscribeButton />
      </div>

      {loading && items.length === 0 && !range ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : null}

      <ActivitiesCalendar
        items={items}
        tasks={canViewTasks ? tasks : []}
        loading={loading}
        mode="admin"
        onRangeChange={(from, to) => {
          setRange((prev) =>
            prev?.from === from && prev?.to === to ? prev : { from, to },
          );
        }}
      />
    </div>
  );
}
