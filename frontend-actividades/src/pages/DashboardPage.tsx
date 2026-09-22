import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Calendar, CheckSquare, ClipboardCheck } from 'lucide-react';
import { activitiesApi } from '@/services/api';
import type { DashboardData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityCard } from '@/components/activities/ActivityCard';
import { useAuth } from '@/hooks/useAuth';
import { formatDateShort, getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activitiesApi
      .dashboard()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {firstName}</h1>
        <p className="text-sm text-muted-foreground">Resumen de actividades y tareas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Calendar}
          label="Próximas"
          value={data.upcoming.length}
          to="/actividades"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Por aprobar"
          value={data.counts.pendingApproval}
          to={hasPermission('approvals.view') || hasPermission('activities.approve') ? '/aprobaciones' : undefined}
          highlight={data.counts.pendingApproval > 0}
        />
        <StatCard
          icon={CheckSquare}
          label="Mis tareas"
          value={data.myTasks.length}
          to="/tareas"
        />
        <StatCard
          icon={AlertCircle}
          label="Vencidas"
          value={data.counts.overdueTasks}
          to="/tareas"
          highlight={data.counts.overdueTasks > 0}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Próximas actividades</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/actividades">Ver todas</Link>
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
                  <Link to="/actividades/nueva">Crear actividad</Link>
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
            <Link to="/tareas">Ver todas</Link>
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
              <Link key={task.id} to={`/actividades/${task.activity?.id}`}>
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
                      {task.priority === 'HIGH' ? 'Alta' : task.priority === 'LOW' ? 'Baja' : 'Media'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
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
