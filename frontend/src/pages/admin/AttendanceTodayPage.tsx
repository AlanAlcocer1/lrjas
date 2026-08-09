import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, RefreshCw, ScanLine, Hash, FileSpreadsheet, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { attendanceApi, eventsApi, fieldsApi, getApiErrorMessage } from '@/services/api';
import { exportToExcel, buildDynamicFieldColumns } from '@/lib/export';
import { mexicoDateKey } from '@/lib/mexico-time';
import { cn } from '@/lib/utils';
import type { EventItem, FieldDefinition, TodayAttendanceItem, TodayAttendanceResponse } from '@/types';

type Period = 'day' | 'week' | 'month';

const periodLabels: Record<Period, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_OPTIONS = [
  { value: 'all', label: 'Todos los días' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

function monthKeyFromDateKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function firstDayOfMonthKey(monthKey: string) {
  return `${monthKey}-01`;
}

function buildMonthOptions(monthsBack = 24) {
  const today = mexicoDateKey();
  const [y, m] = today.split('-').map(Number);
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(Date.UTC(y, m - 1 - i, 1, 12, 0, 0));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const value = `${year}-${String(month).padStart(2, '0')}`;
    options.push({ value, label: `${MONTH_NAMES[month - 1]} ${year}` });
  }
  return options;
}

export default function AttendanceTodayPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [dateKey, setDateKey] = useState(mexicoDateKey());
  const [eventFilter, setEventFilter] = useState('all');
  const [weekdayFilter, setWeekdayFilter] = useState('all');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [data, setData] = useState<TodayAttendanceResponse | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<TodayAttendanceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isToday = dateKey === mexicoDateKey();
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const monthKey = monthKeyFromDateKey(dateKey);

  useEffect(() => {
    fieldsApi.getActive().then(setFields);
    eventsApi.getAll().then(setEvents).catch(() => toast.error('Error al cargar eventos'));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryDate = period === 'month' ? firstDayOfMonthKey(monthKeyFromDateKey(dateKey)) : dateKey;
      setData(
        await attendanceApi.getRange(period, queryDate, {
          eventId: eventFilter === 'all' ? undefined : eventFilter,
          weekday: weekdayFilter === 'all' ? undefined : Number(weekdayFilter),
        }),
      );
    } catch {
      toast.error('Error al cargar asistencias');
    } finally {
      setLoading(false);
    }
  }, [period, dateKey, eventFilter, weekdayFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPeriod = (p: Period) => {
    if (p === 'day') {
      setDateKey(mexicoDateKey());
    } else if (p === 'month') {
      setDateKey(firstDayOfMonthKey(monthKeyFromDateKey(mexicoDateKey())));
    }
    setPeriod(p);
  };

  const goToToday = () => {
    setDateKey(mexicoDateKey());
  };

  const refresh = () => {
    void load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await attendanceApi.remove(pendingDelete.id);
      toast.success('Asistencia eliminada');
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar la asistencia'));
    } finally {
      setDeleting(false);
    }
  };

  const exportExcel = () => {
    if (!data?.items.length) {
      toast.error('No hay datos para exportar');
      return;
    }
    exportToExcel(
      data.items.map((item, i) => ({
        '#': i + 1,
        ...(period !== 'day' ? { Fecha: item.dateMexico ?? '' } : {}),
        Evento: item.event?.name || 'General',
        Código: item.participant.code,
        Nombre: item.participant.fullName,
        Estaca: item.participant.stake,
        Barrio: item.participant.ward,
        Hora: item.timeMexico,
        Método: item.method === 'QR' ? 'QR' : 'Manual',
        ...buildDynamicFieldColumns(fields, item.participant.dynamicFields),
      })),
      `asistencias-${period}-${dateKey}`,
    );
    toast.success('Excel descargado');
  };

  const badgeLabel = (() => {
    if (!data) return '0 registrados';
    if (eventFilter === 'all' && (data.recordsTotal ?? data.total) > data.total) {
      return `${data.total} personas · ${data.recordsTotal} registros`;
    }
    return `${data.total} registrados`;
  })();

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6">
          <FadeIn>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Asistencias</h1>
                  <p className="text-sm text-muted-foreground capitalize">{data?.date ?? 'Cargando...'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="success" className="text-sm px-3 py-1">
                    {badgeLabel}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="gap-2">
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Actualizar
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border">
                    {(Object.keys(periodLabels) as Period[]).map((p) => (
                      <Button
                        key={p}
                        variant={period === p ? 'default' : 'ghost'}
                        size="sm"
                        className="flex-1"
                        onClick={() => selectPeriod(p)}
                      >
                        {periodLabels[p]}
                      </Button>
                    ))}
                  </div>
                  {period === 'month' ? (
                    <Select
                      value={monthKey}
                      onValueChange={(value) => setDateKey(firstDayOfMonthKey(value))}
                    >
                      <SelectTrigger className="sm:max-w-[220px]">
                        <SelectValue placeholder="Selecciona mes" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="date"
                      value={dateKey}
                      onChange={(e) => setDateKey(e.target.value || mexicoDateKey())}
                      className="sm:max-w-[180px]"
                    />
                  )}
                  {period === 'day' && !isToday && (
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Hoy
                    </Button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="sm:max-w-[240px]">
                      <SelectValue placeholder="Evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos (general)</SelectItem>
                      {events.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={weekdayFilter} onValueChange={setWeekdayFilter}>
                    <SelectTrigger className="sm:max-w-[220px]">
                      <SelectValue placeholder="Día de la semana" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !data?.items.length ? (
                  <EmptyState
                    icon={CalendarCheck}
                    title="Sin asistencias"
                    description="No hay registros para el periodo seleccionado"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left p-4 font-medium">#</th>
                          {period !== 'day' && <th className="text-left p-4 font-medium">Fecha</th>}
                          <th className="text-left p-4 font-medium">Evento</th>
                          <th className="text-left p-4 font-medium">Código</th>
                          <th className="text-left p-4 font-medium">Nombre</th>
                          <th className="text-left p-4 font-medium hidden md:table-cell">Estaca</th>
                          <th className="text-left p-4 font-medium hidden lg:table-cell">Barrio</th>
                          <th className="text-left p-4 font-medium">Hora</th>
                          <th className="text-left p-4 font-medium hidden sm:table-cell">Método</th>
                          <th className="text-right p-4 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item, i) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="border-b border-border/70 hover:bg-muted/60"
                          >
                            <td className="p-4 text-muted-foreground">{i + 1}</td>
                            {period !== 'day' && (
                              <td className="p-4 text-muted-foreground">{item.dateMexico}</td>
                            )}
                            <td className="p-4 text-muted-foreground">{item.event?.name || 'General'}</td>
                            <td className="p-4">
                              <span className="font-mono font-bold text-leaf-dark">{item.participant.code}</span>
                            </td>
                            <td className="p-4">{item.participant.fullName}</td>
                            <td className="p-4 hidden md:table-cell text-muted-foreground">{item.participant.stake}</td>
                            <td className="p-4 hidden lg:table-cell text-muted-foreground">{item.participant.ward}</td>
                            <td className="p-4 font-medium">{item.timeMexico}</td>
                            <td className="p-4 hidden sm:table-cell">
                              <Badge variant="outline" className="gap-1">
                                {item.method === 'QR' ? <ScanLine className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                                {item.method === 'QR' ? 'QR' : 'Manual'}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => setPendingDelete(item)}
                                title="Eliminar asistencia"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </PageTransition>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar asistencia</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres quitar este registro? Después podrás marcar la asistencia correcta.
            </DialogDescription>
          </DialogHeader>

          {pendingDelete && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
              <p className="font-medium">{pendingDelete.participant.fullName}</p>
              <p className="text-sm text-muted-foreground">
                Código{' '}
                <span className="font-mono font-semibold text-leaf-dark">
                  {pendingDelete.participant.code}
                </span>
                {' · '}
                {pendingDelete.event?.name || 'General'}
                {' · '}
                {pendingDelete.timeMexico}
                {pendingDelete.dateMexico ? ` · ${pendingDelete.dateMexico}` : ''}
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Sí, eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
