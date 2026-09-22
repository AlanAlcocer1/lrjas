import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Download, MapPin, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { activitiesApi } from '@/services/api';
import type { PublicActivity } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/badge';
import { formatDate, getErrorMessage } from '@/lib/utils';

export function PublicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<PublicActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    activitiesApi
      .getPublic(id)
      .then(setActivity)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!activity) {
    return (
      <EmptyState
        icon={Calendar}
        title="No disponible"
        description="Esta actividad no es pública o no existe."
        action={
          <Button asChild variant="outline">
            <Link to="/public">Volver a la agenda</Link>
          </Button>
        }
      />
    );
  }

  const icsUrl = activitiesApi.eventIcsUrl(activity.id);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/public">
          <ArrowLeft className="h-4 w-4" />
          Agenda
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">{activity.name}</h1>
        {activity.team && (
          <p className="text-sm text-muted-foreground mt-1">{activity.team.name}</p>
        )}
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{activity.publicDescription}</p>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-leaf-dark" />
            {formatDate(activity.date)}
            {activity.endDate && activity.endDate.slice(0, 10) !== activity.date.slice(0, 10)
              ? ` – ${formatDate(activity.endDate)}`
              : ''}
            {' · '}
            {activity.startTime}
            {activity.endTime ? `–${activity.endTime}` : ''}
          </div>
          {(activity.recurrenceType === 'INTERVAL' || activity.recurrenceType === 'WEEKLY') && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Repeat className="h-4 w-4 text-leaf-dark" />
              {activity.recurrenceType === 'INTERVAL'
                ? `Cada ${activity.recurrenceInterval ?? 1} día${(activity.recurrenceInterval ?? 1) === 1 ? '' : 's'}`
                : `Semanal: ${(activity.recurrenceWeekdays ?? [])
                    .map((d) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d])
                    .join(', ')}`}
              {activity.recurrenceUntil
                ? ` · hasta ${formatDate(activity.recurrenceUntil)}`
                : ''}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-leaf-dark" />
            {activity.locationUrl ? (
              <a href={activity.locationUrl} target="_blank" rel="noreferrer" className="text-leaf-dark underline">
                {activity.location}
              </a>
            ) : (
              activity.location
            )}
          </div>
          <Button asChild className="w-full sm:w-auto">
            <a href={icsUrl} download>
              <Download className="h-4 w-4" />
              Descargar .ics
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
