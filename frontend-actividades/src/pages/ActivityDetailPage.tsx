import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Check,
  Loader2,
  MapPin,
  Plus,
  Repeat,
  Trash2,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/hooks/useAuth';
import {
  approvalLabel,
  canCompleteTasks,
  formatDate,
  formatFullName,
  formatMoney,
  getErrorMessage,
  historyActionDetail,
  historyActionLabel,
  isActivityClosed,
  canManageActivityTeam,
  priorityLabel,
  taskStatusLabel,
} from '@/lib/utils';

type DraftBudgetItem = {
  concept: string;
  quantity: number;
  unitPrice: number;
};

const PENDING_BUDGET_STATUSES = new Set([
  'En espera de aprobación',
  'Cambios solicitados',
]);

export function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [history, setHistory] = useState<ActivityHistoryEntry[]>([]);
  const [users, setUsers] = useState<ActividadesUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetNotes, setBudgetNotes] = useState('');
  const [budgetItems, setBudgetItems] = useState<DraftBudgetItem[]>([
    { concept: '', quantity: 1, unitPrice: 0 },
  ]);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [postponeSaving, setPostponeSaving] = useState(false);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeEndDate, setPostponeEndDate] = useState('');
  const [postponeStart, setPostponeStart] = useState('18:00');
  const [postponeEnd, setPostponeEnd] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  const [postponeTaskDates, setPostponeTaskDates] = useState<Record<string, string>>({});
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [taskOpen, setTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', assigneeId: '', dueDate: '', priority: 'MEDIUM' as TaskPriority });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const budgetTotal = useMemo(
    () => budgetItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0),
    [budgetItems],
  );

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
      navigate('/app/actividades');
    } finally {
      setLoading(false);
    }
  }, [id, hasPermission, navigate]);

  useEffect(() => {
    load();
    if (hasPermission('users.view') || hasPermission('users.assign')) {
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
    if (isActivityClosed(activity?.status?.name)) {
      toast.error('Esta actividad ya está cerrada');
      return;
    }
    if (!task.completed && !canCompleteTasks(activity?.status?.name)) {
      toast.error('No puedes completar tareas hasta que la actividad esté en Planificación o posterior');
      return;
    }
    try {
      await activitiesApi.updateTask(task.id, { completed: !task.completed });
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const runStatusAction = async (
    action: 'resubmit' | 'finalize' | 'cancel' | 'incomplete',
  ) => {
    if (!id) return;
    setStatusSaving(true);
    try {
      const updated =
        action === 'resubmit'
          ? await activitiesApi.resubmit(id)
          : action === 'finalize'
            ? await activitiesApi.finalize(id)
            : action === 'cancel'
              ? await activitiesApi.cancel(id)
              : await activitiesApi.markIncomplete(id);
      setActivity(updated);
      toast.success(
        action === 'resubmit'
          ? 'Reenviada a aprobación'
          : action === 'finalize'
            ? 'Actividad finalizada'
            : action === 'cancel'
              ? 'Actividad cancelada'
              : 'Marcada como incompleta',
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatusSaving(false);
    }
  };

  const removeActivity = async () => {
    if (!id || !activity) return;
    try {
      await activitiesApi.remove(id);
      toast.success('Actividad eliminada');
      navigate('/app/actividades');
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  };

  const createTask = async () => {
    if (!id || !newTask.name.trim()) return;
    if (isActivityClosed(activity?.status?.name)) {
      toast.error('Esta actividad ya está cerrada');
      return;
    }
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

  const openPostpone = () => {
    if (!activity) return;
    const dateKey = activity.date.slice(0, 10);
    setPostponeDate(dateKey);
    setPostponeEndDate(activity.endDate ? activity.endDate.slice(0, 10) : '');
    setPostponeStart(activity.startTime || '18:00');
    setPostponeEnd(activity.endTime || '');
    setPostponeReason('');
    const map: Record<string, string> = {};
    for (const t of activity.tasks) {
      if (t.dueDate) map[t.id] = t.dueDate.slice(0, 10);
    }
    setPostponeTaskDates(map);
    setPostponeOpen(true);
  };

  const applyPostponeDateShift = (newDate: string) => {
    if (!activity) {
      setPostponeDate(newDate);
      return;
    }
    const oldKey = activity.date.slice(0, 10);
    const deltaDays = Math.round(
      (Date.parse(`${newDate}T12:00:00`) - Date.parse(`${oldKey}T12:00:00`)) / 86400000,
    );
    setPostponeDate(newDate);
    if (activity.endDate) {
      const endKey = activity.endDate.slice(0, 10);
      setPostponeEndDate(
        new Date(Date.parse(`${endKey}T12:00:00`) + deltaDays * 86400000)
          .toISOString()
          .slice(0, 10),
      );
    } else {
      setPostponeEndDate('');
    }
    const map: Record<string, string> = {};
    for (const t of activity.tasks) {
      if (t.dueDate) {
        map[t.id] = new Date(
          Date.parse(`${t.dueDate.slice(0, 10)}T12:00:00`) + deltaDays * 86400000,
        )
          .toISOString()
          .slice(0, 10);
      }
    }
    setPostponeTaskDates(map);
  };

  const savePostpone = async () => {
    if (!id || !postponeDate || !postponeStart) return;
    setPostponeSaving(true);
    try {
      const updated = await activitiesApi.postpone(id, {
        date: postponeDate,
        endDate: postponeEndDate || null,
        startTime: postponeStart,
        endTime: postponeEnd || null,
        reason: postponeReason.trim() || undefined,
        taskDueDates: Object.entries(postponeTaskDates).map(([taskId, dueDate]) => ({
          taskId,
          dueDate,
        })),
      });
      setActivity(updated);
      setPostponeOpen(false);
      toast.success('Actividad pospuesta — pendiente de reaprobación');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPostponeSaving(false);
    }
  };

  const openAddBudget = () => {
    setBudgetNotes('');
    setBudgetItems([{ concept: '', quantity: 1, unitPrice: 0 }]);
    setBudgetOpen(true);
  };

  const saveBudget = async () => {
    if (!id) return;
    const items = budgetItems.filter((i) => i.concept.trim() && i.quantity > 0);
    if (items.length === 0) {
      toast.error('Agrega al menos un concepto');
      return;
    }
    setBudgetSaving(true);
    try {
      const updated = await activitiesApi.update(id, {
        requiresBudget: true,
        budget: {
          requestedAmount: budgetTotal,
          notes: budgetNotes.trim() || undefined,
          items: items.map((i) => ({
            concept: i.concept.trim(),
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          })),
        },
      });
      setActivity(updated);
      setBudgetOpen(false);
      toast.success('Presupuesto agregado');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBudgetSaving(false);
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
  const canManage = canManageActivityTeam(user, activity.teamId);

  return (
    <div className="space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/actividades">
            <ArrowLeft className="h-4 w-4" />
            Actividades
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{activity.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {activity.status && (
                <Badge
                  variant="outline"
                  style={{ borderColor: activity.status.color, color: activity.status.color }}
                >
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
            <CardContent className="p-5 sm:p-6 space-y-3 text-sm">
              <p className="text-muted-foreground whitespace-pre-wrap">{activity.publicDescription}</p>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(activity.date)}
                {activity.endDate && activity.endDate.slice(0, 10) !== activity.date.slice(0, 10)
                  ? ` – ${formatDate(activity.endDate)}`
                  : ''}
                {' · '}
                {activity.startTime}
                {activity.endTime ? `–${activity.endTime}` : ''}
              </div>
              {(activity.recurrenceType === 'INTERVAL' || activity.recurrenceType === 'WEEKLY') && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Repeat className="h-4 w-4" />
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
              {canManage && hasPermission('activities.edit') && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {activity.approvalStatus === 'CHANGES_REQUESTED' && (
                    <Button
                      size="sm"
                      disabled={statusSaving}
                      onClick={() => runStatusAction('resubmit')}
                    >
                      Reenviar a aprobación
                    </Button>
                  )}
                  {(activity.status?.name === 'Planificación' ||
                    activity.status?.name === 'En curso' ||
                    activity.status?.name === 'Incompleta') && (
                    <>
                      <Button
                        size="sm"
                        disabled={statusSaving}
                        onClick={() => runStatusAction('finalize')}
                      >
                        Finalizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={statusSaving}
                        onClick={openPostpone}
                      >
                        Posponer
                      </Button>
                    </>
                  )}
                  {(activity.status?.name === 'Planificación' ||
                    activity.status?.name === 'En curso') && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={statusSaving}
                      onClick={() => runStatusAction('incomplete')}
                    >
                      Marcar incompleta
                    </Button>
                  )}
                  {activity.status?.name !== 'Finalizada' &&
                    activity.status?.name !== 'Cancelada' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        disabled={statusSaving}
                        onClick={() => setConfirmCancelOpen(true)}
                      >
                        Cancelar actividad
                      </Button>
                    )}
                  {hasPermission('activities.delete') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDeleteOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  )}
                </div>
              )}
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
          {isActivityClosed(activity.status?.name) ? (
            <p className="text-sm text-muted-foreground bg-muted border border-border rounded-xl px-3 py-2">
              Esta actividad está {activity.status?.name?.toLowerCase()}: ya no se pueden agregar ni
              modificar tareas.
            </p>
          ) : !canCompleteTasks(activity.status?.name) ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Las tareas se completan cuando la actividad esté en Planificación, En curso o Incompleta.
            </p>
          ) : null}
          {canManage && hasPermission('tasks.create') && !isActivityClosed(activity.status?.name) && (
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
            activity.tasks.map((task) => {
              const canToggle =
                !isActivityClosed(activity.status?.name) &&
                (hasPermission('tasks.edit') || hasPermission('tasks.complete')) &&
                (task.completed || canCompleteTasks(activity.status?.name));
              return (
              <Card key={task.id}>
                <CardContent className="p-3 flex items-start gap-3">
                  <button
                    type="button"
                    disabled={!canToggle}
                    onClick={() => toggleTask(task)}
                    title={
                      isActivityClosed(activity.status?.name)
                        ? 'Actividad cerrada'
                        : !task.completed && !canCompleteTasks(activity.status?.name)
                          ? 'Espera a que aprueben la actividad'
                          : undefined
                    }
                    className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                      task.completed ? 'bg-primary border-primary text-white' : 'border-border'
                    } ${!canToggle ? 'opacity-40 cursor-not-allowed' : ''}`}
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
              );
            })
          )}
        </TabsContent>

        <TabsContent value="presupuesto" className="space-y-3">
          {(() => {
            const canAddLater =
              !activity.budget &&
              canManage &&
              PENDING_BUDGET_STATUSES.has(activity.status?.name ?? '') &&
              (hasPermission('budgets.create') ||
                hasPermission('budgets.edit') ||
                hasPermission('activities.edit'));

            if (!activity.requiresBudget || !activity.budget) {
              return (
                <div className="space-y-3">
                  <EmptyState
                    icon={Calendar}
                    title="Sin presupuesto"
                    description={
                      canAddLater
                        ? 'Se les olvidó? Puedes agregarlo mientras esté en espera.'
                        : 'Esta actividad no tiene presupuesto.'
                    }
                  />
                  {canAddLater && (
                    <Button onClick={openAddBudget}>
                      <Plus className="h-4 w-4" />
                      Agregar presupuesto
                    </Button>
                  )}
                </div>
              );
            }

            return (
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
            );
          })()}
        </TabsContent>

        <TabsContent value="aprobacion" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <p>
                Estado: <strong>{activity.status?.name ?? approvalLabel(activity.approvalStatus)}</strong>
              </p>
              {activity.status?.name === 'Pospuesta' && (
                <p className="text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                  Fue pospuesta: hay que aprobar la nueva fecha antes de continuar.
                </p>
              )}
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
              history.map((h) => {
                const detail = historyActionDetail(h.action, h.oldValue, h.newValue);
                return (
                  <Card key={h.id}>
                    <CardContent className="p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{historyActionLabel(h.action)}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(h.createdAt)}
                        </span>
                      </div>
                      {detail && (
                        <p className="text-xs text-muted-foreground mt-1 break-words">{detail}</p>
                      )}
                      {h.participant && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatFullName(h.participant)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
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

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar presupuesto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {budgetItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                <div className="col-span-6 sm:col-span-3 space-y-1">
                  <Label className="text-xs">Concepto</Label>
                  <Input
                    value={item.concept}
                    onChange={(e) => {
                      const next = [...budgetItems];
                      next[idx] = { ...item, concept: e.target.value };
                      setBudgetItems(next);
                    }}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <Label className="text-xs">Cant.</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...budgetItems];
                      next[idx] = { ...item, quantity: Number(e.target.value) };
                      setBudgetItems(next);
                    }}
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 space-y-1">
                  <Label className="text-xs">P. unit.</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => {
                      const next = [...budgetItems];
                      next[idx] = { ...item, unitPrice: Number(e.target.value) };
                      setBudgetItems(next);
                    }}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={budgetItems.length <= 1}
                    onClick={() => setBudgetItems(budgetItems.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setBudgetItems([...budgetItems, { concept: '', quantity: 1, unitPrice: 0 }])}
            >
              <Plus className="h-4 w-4" />
              Agregar partida
            </Button>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={budgetNotes} onChange={(e) => setBudgetNotes(e.target.value)} />
            </div>
            <p className="text-sm font-medium text-right">
              Total: {formatMoney(budgetTotal)}
            </p>
            <Button className="w-full" disabled={budgetSaving} onClick={saveBudget}>
              {budgetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar presupuesto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={postponeOpen} onOpenChange={setPostponeOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Posponer actividad</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se actualizará la fecha/hora y las tareas; la actividad quedará como Pospuesta y deberá
            aprobarse de nuevo.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nueva fecha inicio</Label>
                <Input
                  type="date"
                  value={postponeDate}
                  onChange={(e) => applyPostponeDateShift(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin (opcional)</Label>
                <Input
                  type="date"
                  value={postponeEndDate}
                  min={postponeDate || undefined}
                  onChange={(e) => setPostponeEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hora inicio</Label>
                <Input
                  type="time"
                  value={postponeStart}
                  onChange={(e) => setPostponeStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora fin</Label>
                <Input
                  type="time"
                  value={postponeEnd}
                  onChange={(e) => setPostponeEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={postponeReason}
                onChange={(e) => setPostponeReason(e.target.value)}
                placeholder="Ej. Lluvia, cambio de sede…"
              />
            </div>
            {activity && Object.keys(postponeTaskDates).length > 0 && (
              <div className="space-y-2">
                <Label>Fechas de tareas</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border border-border p-3">
                  {activity.tasks
                    .filter((t) => postponeTaskDates[t.id] !== undefined)
                    .map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 min-w-0 truncate">{t.name}</span>
                        <Input
                          type="date"
                          className="w-auto"
                          value={postponeTaskDates[t.id] || ''}
                          onChange={(e) =>
                            setPostponeTaskDates((prev) => ({
                              ...prev,
                              [t.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}
            <Button
              className="w-full"
              disabled={postponeSaving || !postponeDate || !postponeStart}
              onClick={savePostpone}
            >
              {postponeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Posponer y pedir reaprobación
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Eliminar actividad"
        description={
          activity
            ? `¿Eliminar permanentemente "${activity.name}"? Esta acción no se puede deshacer.`
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel="Eliminar"
        onConfirm={removeActivity}
      />

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancelar actividad"
        description="La actividad quedará cancelada y ya no aparecerá como activa."
        confirmLabel="Sí, cancelar"
        onConfirm={async () => {
          await runStatusAction('cancel');
        }}
      />
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
