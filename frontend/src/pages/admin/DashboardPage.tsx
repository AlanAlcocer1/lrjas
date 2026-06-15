import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserPlus,
  Activity,
  TrendingUp,
  FileDown,
  Loader2,
  CalendarRange,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/useIsMobile';
import { dashboardApi } from '@/services/api';
import { exportDashboardPdf } from '@/lib/dashboard-pdf';
import { mexicoDateKey } from '@/lib/mexico-time';
import type { DashboardStats } from '@/types';
import { cn, formatDate } from '@/lib/utils';

const COLORS = ['#84BD31', '#4B7914', '#006837', '#A2C95D', '#5B7235', '#538D4E'];

const defaultKpis = [
  { key: 'totalParticipants' as const, label: 'Usuarios activos', icon: Users, color: 'text-leaf-dark' },
  { key: 'totalAttendances' as const, label: 'Asistencias totales', icon: UserCheck, color: 'text-leaf' },
  { key: 'newThisMonth' as const, label: 'Nuevos este mes', icon: UserPlus, color: 'text-leaf-darker' },
  { key: 'activeParticipants' as const, label: 'Activos (30 días)', icon: Activity, color: 'text-amber-600' },
];

const filteredKpis = [
  { key: 'totalParticipants' as const, label: 'Usuarios activos', icon: Users, color: 'text-leaf-dark' },
  { key: 'totalAttendances' as const, label: 'Asistencias en periodo', icon: UserCheck, color: 'text-leaf' },
  { key: 'newThisMonth' as const, label: 'Nuevos registros', icon: UserPlus, color: 'text-leaf-darker' },
  { key: 'activeParticipants' as const, label: 'Asistieron en periodo', icon: Activity, color: 'text-amber-600' },
];

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #dce8cc',
  borderRadius: 8,
  color: '#1a3320',
};

const legendStyle = { fontSize: 12, color: '#5b7235' };

function ChartContainer({
  loading,
  children,
  height = 200,
}: {
  loading: boolean;
  children: ReactNode;
  height?: number;
}) {
  if (loading) return <Skeleton className="w-full" style={{ height }} />;
  return (
    <div className="w-full min-w-0" style={{ height }}>
      {children}
    </div>
  );
}

function firstDayOfMonth(): string {
  const key = mexicoDateKey();
  const [y, m] = key.split('-');
  return `${y}-${m}-01`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>();
  const [appliedTo, setAppliedTo] = useState<string | undefined>();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const chartHeight = isMobile ? 220 : 200;
  const pieOuterRadius = isMobile ? 58 : 70;
  const hasFilter = Boolean(appliedFrom && appliedTo);
  const kpis = hasFilter ? filteredKpis : defaultKpis;

  const loadStats = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const data = await dashboardApi.getStats(from && to ? { from, to } : undefined);
      setStats(data);
    } catch {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const applyFilter = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Selecciona fecha inicial y final');
      return;
    }
    if (dateFrom > dateTo) {
      toast.error('La fecha inicial no puede ser posterior a la final');
      return;
    }
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    loadStats(dateFrom, dateTo);
  };

  const clearFilter = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    loadStats();
  };

  const setThisMonth = () => {
    const from = firstDayOfMonth();
    const to = mexicoDateKey();
    setDateFrom(from);
    setDateTo(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    loadStats(from, to);
  };

  const handleExportPdf = async () => {
    if (!dashboardRef.current || !stats) return;
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      window.dispatchEvent(new Event('resize'));
      await new Promise((resolve) => setTimeout(resolve, 500));
      await exportDashboardPdf(dashboardRef.current);
      toast.success('PDF descargado');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el PDF');
    } finally {
      setExporting(false);
    }
  };

  const animateCharts = !exporting;
  const attendanceTitle = hasFilter ? 'Asistencias en el periodo' : 'Asistencias por mes';
  const registrationTitle = hasFilter ? 'Registros en el periodo' : 'Nuevos registros';

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6 min-w-0">
          <FadeIn>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {hasFilter && stats?.period
                    ? `Reporte del ${formatDate(stats.period.from)} al ${formatDate(stats.period.to)}`
                    : 'Resumen general de usuarios y asistencias'}
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 shrink-0 w-full sm:w-auto"
                disabled={!stats || loading || exporting}
                onClick={handleExportPdf}
                data-no-export
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Descargar PDF
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card data-no-export>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarRange className="h-4 w-4 text-leaf-dark" />
                  Filtrar por fechas
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="dash-from">Desde</Label>
                    <Input id="dash-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dash-to">Hasta</Label>
                    <Input id="dash-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                  <Button onClick={applyFilter} disabled={loading} className="w-full sm:w-auto">
                    Generar reporte
                  </Button>
                  <Button variant="outline" onClick={setThisMonth} disabled={loading} className="w-full sm:w-auto">
                    Este mes
                  </Button>
                  <Button variant="ghost" onClick={clearFilter} disabled={loading || !hasFilter} className="gap-2 w-full sm:w-auto">
                    <RotateCcw className="h-4 w-4" />
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <div
            ref={dashboardRef}
            data-dashboard-export
            className={cn(
              'space-y-4 sm:space-y-6 bg-white p-3 sm:p-4 rounded-xl w-full min-w-0',
              exporting && 'min-w-[720px]',
            )}
          >
            {hasFilter && stats?.period && (
              <p className="text-sm text-muted-foreground" data-pdf-section>
                Periodo: {stats.period.from} — {stats.period.to}
              </p>
            )}

            <div data-pdf-section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.key} className="min-w-0">
                  <Card>
                    <CardContent className="p-3 sm:p-6">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.color}`} />
                        <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground/60" />
                      </div>
                      {loading ? (
                        <Skeleton className="h-7 sm:h-8 w-16 mb-1" />
                      ) : (
                        <motion.p
                          initial={false}
                          animate={{ opacity: 1 }}
                          className="text-xl sm:text-3xl font-bold"
                        >
                          {stats?.kpis[kpi.key] ?? 0}
                        </motion.p>
                      )}
                      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-tight">{kpi.label}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            <div className={cn('grid gap-3 sm:gap-4 grid-cols-1', !exporting && 'lg:grid-cols-2')}>
              <Card data-pdf-section className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">{attendanceTitle}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.charts.monthlyAttendances} margin={{ left: isMobile ? -16 : 0, right: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dce8cc" />
                        <XAxis
                          dataKey="month"
                          stroke="#5b7235"
                          fontSize={isMobile ? 10 : 12}
                          interval={0}
                          angle={isMobile ? -35 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 50 : 30}
                        />
                        <YAxis stroke="#5b7235" fontSize={isMobile ? 10 : 12} width={isMobile ? 28 : 36} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#84BD31" radius={[4, 4, 0, 0]} isAnimationActive={animateCharts} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">{registrationTitle}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats?.charts.monthlyRegistrations} margin={{ left: isMobile ? -16 : 0, right: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dce8cc" />
                        <XAxis
                          dataKey="month"
                          stroke="#5b7235"
                          fontSize={isMobile ? 10 : 12}
                          interval={0}
                          angle={isMobile ? -35 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 50 : 30}
                        />
                        <YAxis stroke="#5b7235" fontSize={isMobile ? 10 : 12} width={isMobile ? 28 : 36} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#4B7914"
                          strokeWidth={2}
                          dot={{ fill: '#4B7914', r: isMobile ? 3 : 4 }}
                          isAnimationActive={animateCharts}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Distribución por sexo</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats?.charts.sexDistribution}
                          dataKey="count"
                          nameKey="sex"
                          cx="50%"
                          cy="45%"
                          outerRadius={pieOuterRadius}
                          isAnimationActive={animateCharts}
                        >
                          {stats?.charts.sexDistribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend verticalAlign="bottom" wrapperStyle={legendStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Distribución por edad</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.charts.ageDistribution} margin={{ left: isMobile ? -16 : 0, right: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dce8cc" />
                        <XAxis
                          dataKey="range"
                          stroke="#5b7235"
                          fontSize={isMobile ? 10 : 12}
                          interval={0}
                        />
                        <YAxis stroke="#5b7235" fontSize={isMobile ? 10 : 12} width={isMobile ? 28 : 36} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#006837" radius={[4, 4, 0, 0]} isAnimationActive={animateCharts} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Distribución por estaca</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={Math.max(chartHeight, (stats?.charts.stakeDistribution.length ?? 0) * (isMobile ? 28 : 24) + 40)}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats?.charts.stakeDistribution}
                        layout="vertical"
                        margin={{ left: isMobile ? 4 : 8, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#dce8cc" />
                        <XAxis type="number" stroke="#5b7235" fontSize={isMobile ? 10 : 12} />
                        <YAxis
                          dataKey="stake"
                          type="category"
                          stroke="#5b7235"
                          fontSize={isMobile ? 9 : 10}
                          width={isMobile ? 72 : 88}
                          tickFormatter={(value: string) =>
                            value.length > 14 ? `${value.slice(0, 14)}…` : value
                          }
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#4B7914" radius={[0, 4, 4, 0]} isAnimationActive={animateCharts} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {!loading && (stats?.charts.fieldDistributions ?? []).map((field) => (
                <Card key={field.fieldName} data-pdf-section className="min-w-0 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base leading-snug">{field.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <ChartContainer loading={false} height={chartHeight}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={field.data}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="45%"
                            outerRadius={pieOuterRadius}
                            isAnimationActive={animateCharts}
                          >
                            {field.data.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend verticalAlign="bottom" wrapperStyle={legendStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    </AdminLayout>
  );
}
