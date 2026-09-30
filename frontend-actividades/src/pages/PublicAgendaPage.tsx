import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { activitiesApi } from '@/services/api';
import type { PublicActivity } from '@/types';
import { ActivitiesCalendar } from '@/components/calendar/ActivitiesCalendar';
import { CalendarSubscribeButton } from '@/components/calendar/CalendarSubscribeButton';
import { Skeleton } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/utils';

export function PublicAgendaPage() {
  const [items, setItems] = useState<PublicActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);

  const load = useCallback((from: string, to: string) => {
    setLoading(true);
    activitiesApi
      .listPublic({ from, to })
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!range) return;
    load(range.from, range.to);
  }, [range, load]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ver actividades</h1>
          <p className="text-sm text-muted-foreground">
            Toca un día para ver el detalle
          </p>
        </div>
        <CalendarSubscribeButton />
      </div>

      {loading && items.length === 0 && !range ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : null}

      <ActivitiesCalendar
        items={items}
        loading={loading}
        mode="public"
        onRangeChange={(from, to) => {
          setRange((prev) =>
            prev?.from === from && prev?.to === to ? prev : { from, to },
          );
        }}
      />
    </div>
  );
}
