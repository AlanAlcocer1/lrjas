import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  LayoutGrid,
  List,
} from 'lucide-react';
import { activitiesApi } from '@/services/api';
import type { DashboardData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityCard } from '@/components/activities/ActivityCard';
import { DashboardKanban } from '@/components/dashboard/DashboardKanban';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatDateShort, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

type ViewMode = 'list' | 'kanban';
const VIEW_KEY = 'actividades.dashboard.view';

function readViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'kanban' ? 'kanban' : 'list';
  } catch {
    return 'list';
  }
}

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>(readViewMode);

  useEffect(() => {
    activitiesApi
      .dashboard()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="No se pudo cargar"
        description="Revisa tu conexión e intenta de nuevo."
      />
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hola, {firstName}</h1>
          <p className="text-sm text-muted-foreground">Resumen de actividades y tareas</p>
        </div>
        <div
          className="inline-flex shrink-0 rounded-xl border border-border bg-muted p-1"
          role="group"
          aria-label="Cambiar vista"
        >
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              'h-8 gap-1.5 px-2.5',
              view === 'list' && 'bg-card text-foreground shadow-sm hover:bg-card',
            )}
            onClick={() => changeView('list')}
            aria-pressed={view === 'list'}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              'h-8 gap-1.5 px-2.5',
              view === 'kanban' && 'bg-card text-foreground shadow-sm hover:bg-card',
            )}
            onClick={() => changeView('kanban')}
            aria-pressed={view === 'kanban'}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Calendar}
          label="Próximas"
          value={data.upcoming.length}
          to="/app/actividades"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Por aprobar"
          value={data.counts.pendingApproval}
          to={
            hasPermission('approvals.view') || hasPermission('activities.approve')
              ? '/app/aprobaciones'
              : undefined
          }
          highlight={data.counts.pendingApproval > 0}
        />
        <StatCard
          icon={CheckSquare}
          label="Mis tareas"
          value={data.myTasks.length}
          to="/app/tareas"
        />
        <StatCard
          icon={AlertCircle}
          label="Vencidas"
          value={data.counts.overdueTasks}
          to="/app/tareas"
          highlight={data.counts.overdueTasks > 0}
        />
      </div>

      {view === 'kanban' ? (
        data.board ? (
          <DashboardKanban board={data.board} />
        ) : (
          <EmptyState
            icon={LayoutGrid}
            title="Tablero no disponible"
            description="Reinicia el backend para cargar el tablero kanban."
          />
        )
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Próximas actividades</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/actividades">Ver todas</Link>
              </Button>
            </div>
            {data.upcoming.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin próximas actividades"
                description="Cuando se creen actividades aparecerán aquí."
                action={
                  hasPermission('activities.create') ? (
                    <Button asChild>
                      <Link to="/app/actividades/nueva">Crear actividad</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-3">
                {data.upcoming.slice(0, 5).map((a) => (
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Mis tareas</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/tareas">Ver todas</Link>
              </Button>
            </div>
            {data.myTasks.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No tienes tareas pendientes
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-2">
                {data.myTasks.slice(0, 5).map((task) => (
                  <Link key={task.id} to={`/app/actividades/${task.activity?.id}`}>
                    <Card className="hover:border-leaf/40 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{task.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {task.activity?.name}
                            {task.dueDate ? ` · vence ${formatDateShort(task.dueDate)}` : ''}
                          </p>
                        </div>
                        <Badge variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                          {task.priority === 'HIGH'
                            ? 'Alta'
                            : task.priority === 'LOW'
                              ? 'Baja'
                              : 'Media'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  to?: string;
  highlight?: boolean;
}) {
  const content = (
    <Card className={highlight ? 'border-amber-300 bg-amber-50/50' : ''}>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
}
