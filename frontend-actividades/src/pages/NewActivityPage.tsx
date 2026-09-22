import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { activitiesApi, teamsApi, usersApi } from '@/services/api';
import type { ActividadesUserRow, CreateActivityPayload, RecurrenceType, TaskPriority, Team } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { cn, getErrorMessage } from '@/lib/utils';

const STEPS = ['Info', 'Fecha y lugar', 'Equipo', 'Tareas', 'Presupuesto', 'Confirmar'] as const;

type DraftTask = {
  name: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority: TaskPriority;
};

type DraftBudgetItem = {
  concept: string;
  quantity: number;
  unitPrice: number;
};

export function NewActivityPage() {
  const navigate = useNavigate();
  const { user, hasPermission, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<ActividadesUserRow[]>([]);
  const [sessionUser, setSessionUser] = useState(user);

  const manageAll = hasPermission('activities.manage_all');
  const myTeamIds = sessionUser?.teamIds ?? [];

  const selectableTeams = useMemo(() => {
    if (manageAll) return teams;
    return teams.filter((t) => myTeamIds.includes(t.id));
  }, [teams, manageAll, myTeamIds]);

  const [name, setName] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [internalDescription, setInternalDescription] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('NONE');
  const [recurrenceInterval, setRecurrenceInterval] = useState(7);
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([]);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  const [primaryResponsibleId, setPrimaryResponsibleId] = useState(user?.id ?? '');
  const [secondaryIds, setSecondaryIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<DraftTask[]>([]);
  const [requiresBudget, setRequiresBudget] = useState(false);
  const [budgetNotes, setBudgetNotes] = useState('');
  const [budgetItems, setBudgetItems] = useState<DraftBudgetItem[]>([
    { concept: '', quantity: 1, unitPrice: 0 },
  ]);
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    if (!hasPermission('activities.create')) {
      navigate('/');
      return;
    }
    let cancelled = false;
    (async () => {
      const me = await refreshUser();
      if (cancelled) return;
      setSessionUser(me);
      const [t, u] = await Promise.all([
        hasPermission('teams.view') ? teamsApi.list().catch(() => []) : Promise.resolve([] as Team[]),
        hasPermission('users.view') || hasPermission('users.assign')
          ? usersApi.search().catch(() => [])
          : Promise.resolve([] as ActividadesUserRow[]),
      ]);
      if (cancelled) return;
      setTeams(t);
      setUsers(u);
      if (me?.id) setPrimaryResponsibleId((prev) => prev || me.id);
      const teamIds = me?.teamIds ?? [];
      const mine = hasPermission('activities.manage_all')
        ? t
        : t.filter((team) => teamIds.includes(team.id));
      if (mine.length === 1) setTeamId(mine[0].id);
    })();
    return () => {
      cancelled = true;
    };
    // Solo al entrar a la pantalla: refreshUser trae equipos actualizados
  }, [hasPermission, navigate, refreshUser]);

  const requestedAmount = useMemo(
    () => budgetItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0),
    [budgetItems],
  );

  const canNext = () => {
    if (step === 0) return name.trim().length >= 2 && publicDescription.trim().length >= 1;
    if (step === 1) {
      if (!date || !startTime || location.trim().length < 1) return false;
      if (endDate && endDate < date) return false;
      if (recurrenceType === 'WEEKLY' && recurrenceWeekdays.length === 0) return false;
      if (recurrenceType === 'INTERVAL' && recurrenceInterval < 1) return false;
      return true;
    }
    if (step === 2) return !!primaryResponsibleId && (!!teamId || manageAll);
    if (step === 4 && requiresBudget) {
      return budgetItems.some((i) => i.concept.trim() && i.quantity > 0);
    }
    return true;
  };

  const toggleWeekday = (day: number) => {
    setRecurrenceWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  };

  const toggleSecondary = (id: string) => {
    setSecondaryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload: CreateActivityPayload = {
        name: name.trim(),
        publicDescription: publicDescription.trim(),
        internalDescription: internalDescription.trim() || undefined,
        date,
        endDate: endDate || undefined,
        startTime,
        endTime: endTime || undefined,
        location: location.trim(),
        locationUrl: locationUrl.trim() || undefined,
        teamId: teamId || undefined,
        primaryResponsibleId,
        secondaryResponsibleIds: secondaryIds.filter((id) => id !== primaryResponsibleId),
        requiresBudget,
        internalNotes: internalNotes.trim() || undefined,
        recurrenceType,
        recurrenceInterval: recurrenceType === 'INTERVAL' ? recurrenceInterval : undefined,
        recurrenceWeekdays: recurrenceType === 'WEEKLY' ? recurrenceWeekdays : undefined,
        recurrenceUntil: recurrenceType !== 'NONE' && recurrenceUntil ? recurrenceUntil : undefined,
        tasks: tasks
          .filter((t) => t.name.trim())
          .map((t) => ({
            name: t.name.trim(),
            description: t.description?.trim() || undefined,
            assigneeId: t.assigneeId || undefined,
            dueDate: t.dueDate || undefined,
            priority: t.priority,
          })),
        budget: requiresBudget
          ? {
              requestedAmount,
              notes: budgetNotes.trim() || undefined,
              items: budgetItems
                .filter((i) => i.concept.trim())
                .map((i) => ({
                  concept: i.concept.trim(),
                  quantity: Number(i.quantity),
                  unitPrice: Number(i.unitPrice),
                })),
            }
          : undefined,
      };
      const created = await activitiesApi.create(payload);
      toast.success('Actividad creada');
      navigate(`/actividades/${created.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto">
      <div>
        <Button variant="ghost" size="sm" onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}>
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
        <h1 className="text-2xl font-bold mt-2">Nueva actividad</h1>
        <p className="text-sm text-muted-foreground">
          Paso {step + 1} de {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i <= step ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {step === 0 && (
            <>
              <Field label="Nombre">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Noche de juegos" />
              </Field>
              <Field label="Descripción pública">
                <Textarea
                  value={publicDescription}
                  onChange={(e) => setPublicDescription(e.target.value)}
                  placeholder="Lo que verá la comunidad"
                />
              </Field>
              <Field label="Notas internas (opcional)">
                <Textarea
                  value={internalDescription}
                  onChange={(e) => setInternalDescription(e.target.value)}
                  placeholder="Solo para el equipo"
                />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha inicio">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Fecha fin (opcional)">
                  <Input
                    type="date"
                    value={endDate}
                    min={date || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Si dura varios días, pon la fecha fin. Si es un solo día, déjala vacía.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Inicio">
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </Field>
                <Field label="Fin (opcional)">
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </Field>
              </div>
              <Field label="Lugar">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Dirección o sede" />
              </Field>
              <Field label="Link del lugar (opcional)">
                <Input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="https://maps..." />
              </Field>

              <Field label="Repetición">
                <Select
                  value={recurrenceType}
                  onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No se repite</SelectItem>
                    <SelectItem value="INTERVAL">Cada X días</SelectItem>
                    <SelectItem value="WEEKLY">Días fijos de la semana</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {recurrenceType === 'INTERVAL' && (
                <Field label="Cada cuántos días">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))}
                  />
                </Field>
              )}

              {recurrenceType === 'WEEKLY' && (
                <div className="space-y-2">
                  <Label>Días de la semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { d: 0, label: 'Dom' },
                      { d: 1, label: 'Lun' },
                      { d: 2, label: 'Mar' },
                      { d: 3, label: 'Mié' },
                      { d: 4, label: 'Jue' },
                      { d: 5, label: 'Vie' },
                      { d: 6, label: 'Sáb' },
                    ].map(({ d, label }) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleWeekday(d)}
                        className={cn(
                          'h-9 min-w-11 rounded-lg border px-2.5 text-sm font-medium transition-colors',
                          recurrenceWeekdays.includes(d)
                            ? 'border-leaf bg-leaf/15 text-leaf-darker'
                            : 'border-border bg-card text-muted-foreground hover:border-leaf/40',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recurrenceType !== 'NONE' && (
                <Field label="Repetir hasta (opcional)">
                  <Input
                    type="date"
                    value={recurrenceUntil}
                    min={date || undefined}
                    onChange={(e) => setRecurrenceUntil(e.target.value)}
                  />
                </Field>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {selectableTeams.length > 0 && (
                <Field label="Equipo">
                  <Select
                    value={teamId || (manageAll ? 'none' : '')}
                    onValueChange={(v) => setTeamId(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={manageAll ? 'Sin equipo' : 'Tu equipo'} />
                    </SelectTrigger>
                    <SelectContent>
                      {manageAll && <SelectItem value="none">Sin equipo</SelectItem>}
                      {selectableTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {!manageAll && selectableTeams.length === 0 && (
                <p className="text-sm text-amber-700">
                  No perteneces a ningún equipo. Pide a un administrador que te asigne a uno.
                </p>
              )}
              <Field label="Responsable principal">
                <Select value={primaryResponsibleId} onValueChange={setPrimaryResponsibleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {(users.length
                      ? users
                      : user
                        ? [{ id: user.id, code: user.code, name: user.name, active: true, roles: [], teams: [] }]
                        : []
                    ).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {users.length > 0 && (
                <div className="space-y-2">
                  <Label>Responsables secundarios</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-border p-3">
                    {users
                      .filter((u) => u.id !== primaryResponsibleId)
                      .map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={secondaryIds.includes(u.id)}
                            onCheckedChange={() => toggleSecondary(u.id)}
                          />
                          {u.name} <span className="text-muted-foreground">({u.code})</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {tasks.map((task, idx) => (
                <div key={idx} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre de la tarea"
                      value={task.name}
                      onChange={(e) => {
                        const next = [...tasks];
                        next[idx] = { ...task, name: e.target.value };
                        setTasks(next);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setTasks(tasks.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={task.priority}
                      onValueChange={(v) => {
                        const next = [...tasks];
                        next[idx] = { ...task, priority: v as TaskPriority };
                        setTasks(next);
                      }}
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
                    <Input
                      type="date"
                      value={task.dueDate || ''}
                      onChange={(e) => {
                        const next = [...tasks];
                        next[idx] = { ...task, dueDate: e.target.value };
                        setTasks(next);
                      }}
                    />
                  </div>
                  {users.length > 0 && (
                    <Select
                      value={task.assigneeId || 'none'}
                      onValueChange={(v) => {
                        const next = [...tasks];
                        next[idx] = { ...task, assigneeId: v === 'none' ? undefined : v };
                        setTasks(next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Asignar" />
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
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setTasks([...tasks, { name: '', priority: 'MEDIUM' }])}
              >
                <Plus className="h-4 w-4" />
                Agregar tarea
              </Button>
              <p className="text-xs text-muted-foreground">Opcional: puedes agregar tareas después.</p>
            </div>
          )}

          {step === 4 && (
            <>
              <label className="flex items-center gap-3 rounded-xl border border-border p-4">
                <Checkbox
                  checked={requiresBudget}
                  onCheckedChange={(v) => setRequiresBudget(v === true)}
                />
                <div>
                  <p className="font-medium text-sm">¿Requiere presupuesto?</p>
                  <p className="text-xs text-muted-foreground">Si no, continúa sin partidas.</p>
                </div>
              </label>
              {requiresBudget && (
                <div className="space-y-3">
                  {budgetItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                      <div className="col-span-6 sm:col-span-3">
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
                      <div className="col-span-2 sm:col-span-1">
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
                      <div className="col-span-3 sm:col-span-1">
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
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
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
                    size="sm"
                    onClick={() =>
                      setBudgetItems([...budgetItems, { concept: '', quantity: 1, unitPrice: 0 }])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Partida
                  </Button>
                  <Field label="Notas del presupuesto">
                    <Textarea value={budgetNotes} onChange={(e) => setBudgetNotes(e.target.value)} />
                  </Field>
                  <p className="text-sm font-medium">
                    Total solicitado: ${requestedAmount.toLocaleString('es-MX')}
                  </p>
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <div className="space-y-3 text-sm">
              <ConfirmRow label="Nombre" value={name} />
              <ConfirmRow
                label="Fecha"
                value={`${date}${endDate && endDate !== date ? ` → ${endDate}` : ''} · ${startTime}${endTime ? `–${endTime}` : ''}`}
              />
              {recurrenceType !== 'NONE' && (
                <ConfirmRow
                  label="Repetición"
                  value={
                    recurrenceType === 'INTERVAL'
                      ? `Cada ${recurrenceInterval} día${recurrenceInterval === 1 ? '' : 's'}${recurrenceUntil ? ` hasta ${recurrenceUntil}` : ''}`
                      : `Semanal (${recurrenceWeekdays.map((d) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d]).join(', ')})${recurrenceUntil ? ` hasta ${recurrenceUntil}` : ''}`
                  }
                />
              )}
              <ConfirmRow label="Lugar" value={location} />
              <ConfirmRow
                label="Responsable"
                value={users.find((u) => u.id === primaryResponsibleId)?.name || user?.name || '—'}
              />
              <ConfirmRow label="Tareas" value={String(tasks.filter((t) => t.name.trim()).length)} />
              <ConfirmRow
                label="Presupuesto"
                value={requiresBudget ? `$${requestedAmount.toLocaleString('es-MX')}` : 'No'}
              />
              <Field label="Notas internas finales (opcional)">
                <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" size="lg" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="flex-1" size="lg" disabled={saving || !canNext()} onClick={submit}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            Crear actividad
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
