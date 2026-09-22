import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Check,
  Loader2,
  MapPin,
  Plus,
  XCircle,
} from 'lucide-react';
import { activitiesApi, usersApi } from '@/services/api';
import type {
  ActividadesUserRow,
  Activity,
  ActivityHistoryEntry,
  ActivityTask,
  TaskPriority,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import {
  approvalLabel,
  formatDate,
  formatFullName,
  formatMoney,
  getErrorMessage,
  priorityLabel,
  taskStatusLabel,
} from '@/lib/utils';

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [history, setHistory] = useState<ActivityHistoryEntry[]>([]);
  const [users, setUsers] = useState<ActividadesUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', assigneeId: '', dueDate: '', priority: 'MEDIUM' as TaskPriority });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const a = await activitiesApi.get(id);
      setActivity(a);
      if (hasPermission('history.view')) {
        activitiesApi.history(id).then(setHistory).catch(() => setHistory([]));
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      navigate('/actividades');
    } finally {
      setLoading(false);
    }
  }, [id, hasPermission, navigate]);

  useEffect(() => {
    load();
    if (hasPermission('users.view')) {
      usersApi.search().then(setUsers).catch(() => []);
    }
  }, [load, hasPermission]);

  const runApproval = async (action: 'approve' | 'reject' | 'changes') => {
    if (!id) return;
    setActionLoading(true);
    try {
      if (action === 'approve') await activitiesApi.approve(id, comments || undefined);
      if (action === 'reject') {
        if (!rejectReason.trim()) {
          toast.error('Indica el motivo de rechazo');
          setActionLoading(false);
          return;
        }
        await activitiesApi.reject(id, rejectReason.trim(), comments || undefined);
      }
      if (action === 'changes') await activitiesApi.requestChanges(id, comments || undefined);
      toast.success('Decisión registrada');
      setComments('');
      setRejectReason('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleTask = async (task: ActivityTask) => {
    try {
      await activitiesApi.updateTask(task.id, { completed: !task.completed });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const createTask = async () => {
    if (!id || !newTask.name.trim()) return;
    try {
      await activitiesApi.createTask(id, {
        name: newTask.name.trim(),
        assigneeId: newTask.assigneeId || undefined,
        dueDate: newTask.dueDate || undefined,
        priority: newTask.priority,
      });
      toast.success('Tarea agregada');
      setTaskOpen(false);
      setNewTask({ name: '', assigneeId: '', dueDate: '', priority: 'MEDIUM' });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!activity) {
    return (
      <EmptyState
        icon={Calendar}
        title="No encontrada"
        description="Esta actividad no existe o no tienes acceso."
      />
    );
  }

  const primary = activity.responsibles?.find((r) => r.type === 'PRIMARY')?.participant;

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/actividades">
            <ArrowLeft className="h-4 w-4" />
            Actividades
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{activity.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant={
                  activity.approvalStatus === 'APPROVED'
                    ? 'success'
                    : activity.approvalStatus === 'REJECTED'
                      ? 'destructive'
                      : activity.approvalStatus === 'CHANGES_REQUESTED'
                        ? 'warning'
                        : 'secondary'
                }
              >
                {approvalLabel(activity.approvalStatus)}
              </Badge>
              {activity.status && (
                <Badge variant="outline" style={{ borderColor: activity.status.color, color: activity.status.color }}>
                  {activity.status.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          <TabsTrigger value="aprobacion">Aprobación</TabsTrigger>
          {hasPermission('history.view') && <TabsTrigger value="historial">Historial</TabsTrigger>}
        </TabsList>

        <TabsContent value="resumen" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <p className="text-muted-foreground whitespace-pre-wrap">{activity.publicDescription}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(activity.date)} · {activity.startTime}
                {activity.endTime ? `–${activity.endTime}` : ''}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {activity.locationUrl ? (
                  <a href={activity.locationUrl} target="_blank" rel="noreferrer" className="text-leaf-dark underline">
                    {activity.location}
                  </a>
                ) : (
                  activity.location
                )}
              </div>
              {activity.team && <p>Equipo: {activity.team.name}</p>}
              {primary && <p>Responsable: {formatFullName(primary)}</p>}
              {activity.progress && activity.progress.total > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progreso de tareas</span>
                    <span>{activity.progress.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${activity.progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
              {activity.internalDescription && hasPermission('activities.edit') && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs font-medium mb-1">Interno</p>
                  <p className="whitespace-pre-wrap">{activity.internalDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tareas" className="space-y-3">
          {hasPermission('tasks.create') && (
            <Button size="sm" onClick={() => setTaskOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva tarea
            </Button>
          )}
          {activity.tasks.length === 0 ? (
            <EmptyState
              icon={Check}
              title="Sin tareas"
              description="Agrega tareas para organizar el trabajo."
            />
          ) : (
            activity.tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <button
                    type="button"
                    disabled={!hasPermission('tasks.edit') && !hasPermission('tasks.complete')}
                    onClick={() => toggleTask(task)}
                    className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                      task.completed ? 'bg-primary border-primary text-white' : 'border-border'
                    }`}
                  >
                    {task.completed ? <Check className="h-3 w-3" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {taskStatusLabel(task.status)} · {priorityLabel(task.priority)}
                      {task.assignee ? ` · ${formatFullName(task.assignee)}` : ''}
                      {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="presupuesto">
          {!activity.requiresBudget || !activity.budget ? (
            <EmptyState
              icon={Calendar}
              title="Sin presupuesto"
              description="Esta actividad no requiere presupuesto."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Presupuesto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MoneyStat label="Solicitado" value={activity.budget.requestedAmount} />
                  <MoneyStat label="Aprobado" value={activity.budget.approvedAmount} />
                  <MoneyStat label="Gastado" value={activity.budget.spentAmount} />
                </div>
                {activity.budget.items?.length > 0 && (
                  <div className="space-y-2">
                    {activity.budget.items.map((item, i) => (
                      <div key={item.id || i} className="flex justify-between text-sm border-b border-border pb-2">
                        <span>
                          {item.concept}{' '}
                          <span className="text-muted-foreground">
                            ×{item.quantity}
                          </span>
                        </span>
                        <span className="font-medium">
                          {formatMoney(item.total ?? Number(item.quantity) * Number(item.unitPrice))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {activity.budget.notes && (
                  <p className="text-sm text-muted-foreground">{activity.budget.notes}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="aprobacion" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <p>
                Estado: <strong>{approvalLabel(activity.approvalStatus)}</strong>
              </p>
              {activity.approvedBy && (
                <p>
                  Revisado por {formatFullName(activity.approvedBy)}
                  {activity.approvedAt ? ` · ${formatDate(activity.approvedAt)}` : ''}
                </p>
              )}
              {activity.approvalRequests?.[0] && (
                <div className="rounded-lg bg-muted p-3 space-y-1">
                  <p className="text-xs font-medium">Última solicitud</p>
                  <p>{approvalLabel(activity.approvalRequests[0].status)}</p>
                  {activity.approvalRequests[0].comments && (
                    <p className="text-muted-foreground">{activity.approvalRequests[0].comments}</p>
                  )}
                  {activity.approvalRequests[0].rejectionReason && (
                    <p className="text-red-600">{activity.approvalRequests[0].rejectionReason}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {(hasPermission('activities.approve') ||
            hasPermission('approvals.reject') ||
            hasPermission('approvals.request_changes')) &&
            activity.approvalStatus === 'PENDING' && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Comentarios</Label>
                    <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
                  </div>
                  {hasPermission('approvals.reject') && (
                    <div className="space-y-2">
                      <Label>Motivo de rechazo</Label>
                      <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {hasPermission('activities.approve') && (
                      <Button disabled={actionLoading} onClick={() => runApproval('approve')}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Aprobar
                      </Button>
                    )}
                    {hasPermission('approvals.request_changes') && (
                      <Button variant="secondary" disabled={actionLoading} onClick={() => runApproval('changes')}>
                        Pedir cambios
                      </Button>
                    )}
                    {hasPermission('approvals.reject') && (
                      <Button variant="destructive" disabled={actionLoading} onClick={() => runApproval('reject')}>
                        <XCircle className="h-4 w-4" />
                        Rechazar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {hasPermission('history.view') && (
          <TabsContent value="historial" className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin eventos aún</p>
            ) : (
              history.map((h) => (
                <Card key={h.id}>
                  <CardContent className="p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium capitalize">{h.action}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(h.createdAt)}</span>
                    </div>
                    {h.participant && (
                      <p className="text-xs text-muted-foreground mt-1">{formatFullName(h.participant)}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={newTask.priority}
                onValueChange={(v) => setNewTask({ ...newTask, priority: v as TaskPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baja</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vence</Label>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
            </div>
            {users.length > 0 && (
              <div className="space-y-2">
                <Label>Asignar a</Label>
                <Select
                  value={newTask.assigneeId || 'none'}
                  onValueChange={(v) => setNewTask({ ...newTask, assigneeId: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={createTask}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoneyStat({ label, value }: { label: string; value: number | string | null | undefined }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">{formatMoney(value)}</p>
    </div>
  );
}
