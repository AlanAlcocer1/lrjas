import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, RefreshCw, ScanLine, Hash, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { attendanceApi, fieldsApi } from '@/services/api';
import { exportToExcel, buildDynamicFieldColumns } from '@/lib/export';
import { mexicoDateKey } from '@/lib/mexico-time';
import { cn } from '@/lib/utils';
import type { FieldDefinition, TodayAttendanceResponse } from '@/types';

type Period = 'day' | 'week' | 'month';

const periodLabels: Record<Period, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
};

export default function AttendanceTodayPage() {
  const [period, setPeriod] = useState<Period>('day');
  const [dateKey, setDateKey] = useState(mexicoDateKey());
  const [data, setData] = useState<TodayAttendanceResponse | null>(null);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const isToday = dateKey === mexicoDateKey();

  useEffect(() => {
    fieldsApi.getActive().then(setFields);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await attendanceApi.getRange(period, dateKey));
    } catch {
      toast.error('Error al cargar asistencias');
    } finally {
      setLoading(false);
    }
  }, [period, dateKey]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPeriod = (p: Period) => {
    if (p === 'day') setDateKey(mexicoDateKey());
    setPeriod(p);
  };

  const goToToday = () => {
    setDateKey(mexicoDateKey());
  };

  const refresh = () => {
    void load();
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
                    {data?.total ?? 0} registrados
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
                <Input
                  type="date"
                  value={dateKey}
                  onChange={(e) => setDateKey(e.target.value || mexicoDateKey())}
                  className="sm:max-w-[180px]"
                />
                {period === 'day' && !isToday && (
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoy
                  </Button>
                )}
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
                          <th className="text-left p-4 font-medium">Código</th>
                          <th className="text-left p-4 font-medium">Nombre</th>
                          <th className="text-left p-4 font-medium hidden md:table-cell">Estaca</th>
                          <th className="text-left p-4 font-medium hidden lg:table-cell">Barrio</th>
                          <th className="text-left p-4 font-medium">Hora</th>
                          <th className="text-left p-4 font-medium hidden sm:table-cell">Método</th>
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
    </AdminLayout>
  );
}
