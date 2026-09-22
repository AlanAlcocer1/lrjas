import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { activitiesApi, teamsApi } from '@/services/api';
import type { Activity, ActivityStatus, ApprovalStatus, Team } from '@/types';
import { ActivityCard } from '@/components/activities/ActivityCard';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

export function ActivitiesPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Activity[]>([]);
  const [statuses, setStatuses] = useState<ActivityStatus[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string>('all');
  const [statusId, setStatusId] = useState<string>('all');
  const [teamId, setTeamId] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      activitiesApi.listStatuses().catch(() => []),
      hasPermission('teams.view') ? teamsApi.list().catch(() => []) : Promise.resolve([]),
    ]).then(([s, t]) => {
      setStatuses(s);
      setTeams(t);
    });
  }, [hasPermission]);

  useEffect(() => {
    setLoading(true);
    activitiesApi
      .list({
        approvalStatus: approvalStatus === 'all' ? undefined : (approvalStatus as ApprovalStatus),
        statusId: statusId === 'all' ? undefined : statusId,
        teamId: teamId === 'all' ? undefined : teamId,
      })
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [approvalStatus, statusId, teamId]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Actividades</h1>
          <p className="text-sm text-muted-foreground">Lista y seguimiento</p>
        </div>
        {hasPermission('activities.create') && (
          <Button asChild className="shrink-0">
            <Link to="/actividades/nueva">
              <Plus className="h-4 w-4" />
              Nueva
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={approvalStatus} onValueChange={setApprovalStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Aprobación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las aprobaciones</SelectItem>
            <SelectItem value="PENDING">En espera de aprobación</SelectItem>
            <SelectItem value="APPROVED">Aprobada</SelectItem>
            <SelectItem value="REJECTED">Rechazada</SelectItem>
            <SelectItem value="CHANGES_REQUESTED">Cambios solicitados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusId} onValueChange={setStatusId}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {teams.length > 0 && (
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin actividades"
          description="No hay actividades con estos filtros."
          action={
            hasPermission('activities.create') ? (
              <Button asChild>
                <Link to="/actividades/nueva">Crear la primera</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3">
          {items.map((a) => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}
