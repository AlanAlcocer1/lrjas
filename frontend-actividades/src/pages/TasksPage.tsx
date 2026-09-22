import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { activitiesApi } from '@/services/api';
import type { ActivityTask } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateShort, getErrorMessage, priorityLabel, canCompleteTasks, isActivityClosed } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function TasksPage() {
  const { hasPermission } = useAuth();
  const [tasks, setTasks] = useState<ActivityTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    activitiesApi
      .myTasks()
      .then(setTasks)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const complete = async (task: ActivityTask) => {
    if (!hasPermission('tasks.complete') && !hasPermission('tasks.edit')) {
      toast.error('No tienes permiso para completar tareas');
      return;
    }
    if (isActivityClosed(task.activity?.status?.name)) {
      toast.error('Esta actividad ya está cerrada');
      return;
    }
    if (!canCompleteTasks(task.activity?.status?.name)) {
      toast.error('No puedes completar tareas hasta que la actividad esté en Planificación o posterior');
      return;
    }
    try {
      await activitiesApi.updateTask(task.id, { completed: true, status: 'DONE' });
      toast.success('Tarea completada');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Mis tareas</h1>
        <p className="text-sm text-muted-foreground">Pendientes asignadas a ti</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Sin tareas pendientes"
          description="Cuando te asignen trabajo aparecerá aquí."
        />
      ) : (
        <div className="grid gap-2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{task.name}</p>
                    {task.activity && (
                      <Link
                        to={`/actividades/${task.activity.id}`}
                        className="text-xs text-leaf-dark hover:underline"
                      >
                        {task.activity.name}
                      </Link>
                    )}
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vence {formatDateShort(task.dueDate)}
                      </p>
                    )}
                    {task.activity?.status &&
                      !canCompleteTasks(task.activity.status.name) && (
                      <p className="text-xs text-amber-700 mt-1">
                        {task.activity.status.name} — aún no se puede completar
                      </p>
                    )}
                  </div>
                  <Badge variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                    {priorityLabel(task.priority)}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => complete(task)}
                  disabled={
                    isActivityClosed(task.activity?.status?.name) ||
                    !canCompleteTasks(task.activity?.status?.name)
                  }
                >
                  Marcar como completada
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
