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
  MapPinned,
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
import { formatDate } from '@/lib/utils';

const COLORS = ['#84BD31', '#4B7914', '#006837', '#A2C95D', '#5B7235', '#538D4E'];

const defaultKpis = [
  { key: 'totalParticipants' as const, label: 'Usuarios en el sistema', icon: Users, color: 'text-leaf-dark', hint: 'Cuentas activas registradas' },
  { key: 'totalAttendances' as const, label: 'Asistencias totales', icon: UserCheck, color: 'text-leaf', hint: 'Personas-día únicas (varios eventos el mismo día = 1)' },
  { key: 'newThisMonth' as const, label: 'Nuevos usuarios (mes)', icon: UserPlus, color: 'text-leaf-darker', hint: 'Registros de cuenta este mes' },
  { key: 'activeParticipants' as const, label: 'Asistieron (30 días)', icon: Activity, color: 'text-amber-600', hint: 'Personas distintas con al menos 1 check-in' },
  { key: 'totalVisitors' as const, label: 'Visitantes', icon: MapPinned, color: 'text-sky-700', hint: 'Miembros de otra estaca / ciudad' },
];

const filteredKpis = [
  { key: 'totalAttendances' as const, label: 'Asistencias en periodo', icon: UserCheck, color: 'text-leaf', hint: 'Personas-día únicas en el periodo' },
  { key: 'activeParticipants' as const, label: 'Personas que asistieron', icon: Activity, color: 'text-amber-600', hint: 'Usuarios distintos con check-in' },
  { key: 'newThisMonth' as const, label: 'Nuevos usuarios', icon: UserPlus, color: 'text-leaf-darker', hint: 'Cuentas creadas en el periodo (no check-ins)' },
  { key: 'totalVisitors' as const, label: 'Visitantes', icon: MapPinned, color: 'text-sky-700', hint: 'Visitantes entre quienes asistieron' },
  { key: 'totalParticipants' as const, label: 'Usuarios en el sistema', icon: Users, color: 'text-leaf-dark', hint: 'Total de cuentas activas (referencia)' },
];

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #dce8cc',
  borderRadius: 8,
  color: '#1a3320',
};

const legendStyle = { fontSize: 13, color: '#1a3320', paddingTop: 4 };

function withPiePercents<T extends { count: number }>(items: T[] | undefined) {
  const list = items ?? [];
  const total = list.reduce((sum, item) => sum + item.count, 0) || 1;
  return list.map((item) => ({ ...item, percent: item.count / total }));
}

function pieLabelContent(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  value?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, value = 0 } = props;
  if (percent < 0.04 || value <= 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
      style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.25)', strokeWidth: 2 }}
    >
      {value}
    </text>
  );
}

function pieLegendFormatter(
  value: string,
  entry: { payload?: { count?: number; percent?: number } },
) {
  const count = entry.payload?.count ?? 0;
  const pct = typeof entry.payload?.percent === 'number'
    ? Math.round(entry.payload.percent * 100)
    : null;
  return pct !== null ? `${value}: ${count} (${pct}%)` : `${value}: ${count}`;
}

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

  const chartHeight = isMobile ? 240 : 230;
  const pieChartHeight = isMobile ? 260 : 250;
  const pieOuterRadius = isMobile ? 68 : 78;
  const axisFontSize = isMobile ? 11 : 13;
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
      await exportDashboardPdf(dashboardRef.current);
      toast.success('PDF descargado');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el PDF');
    } finally {
      setExporting(false);
    }
  };

  const attendanceTitle = hasFilter ? 'Check-ins en el periodo' : 'Asistencias por mes';
  const registrationTitle = hasFilter ? 'Nuevos usuarios en el periodo' : 'Nuevos usuarios por mes';
  const distributionSuffix = hasFilter ? ' (quienes asistieron)' : '';

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
            className="space-y-4 sm:space-y-6 bg-white p-3 sm:p-4 rounded-xl w-full min-w-0"
          >
            {hasFilter && stats?.period && (
              <p className="text-sm text-muted-foreground" data-pdf-section data-pdf-kind="meta">
                Periodo: {stats.period.from} — {stats.period.to}
              </p>
            )}

            <div data-pdf-section data-pdf-kind="kpis" className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
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
                      {'hint' in kpi && (
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight hidden sm:block">{kpi.hint}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
              <Card data-pdf-section data-pdf-kind="chart" className="min-w-0 overflow-hidden">
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
                          fontSize={axisFontSize}
                          interval={0}
                          angle={isMobile ? -35 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 50 : 30}
                        />
                        <YAxis stroke="#5b7235" fontSize={axisFontSize} width={isMobile ? 28 : 40} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#84BD31" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section data-pdf-kind="chart" className="min-w-0 overflow-hidden">
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
                          fontSize={axisFontSize}
                          interval={0}
                          angle={isMobile ? -35 : 0}
                          textAnchor={isMobile ? 'end' : 'middle'}
                          height={isMobile ? 50 : 30}
                        />
                        <YAxis stroke="#5b7235" fontSize={axisFontSize} width={isMobile ? 28 : 40} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#4B7914"
                          strokeWidth={2}
                          dot={{ fill: '#4B7914', r: isMobile ? 3 : 4 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section data-pdf-kind="chart" className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Distribución por sexo{distributionSuffix}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={pieChartHeight}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={withPiePercents(stats?.charts.sexDistribution)}
                          dataKey="count"
                          nameKey="sex"
                          cx="50%"
                          cy="42%"
                          outerRadius={pieOuterRadius}
                          label={pieLabelContent}
                          labelLine={false}
                          isAnimationActive={false}
                        >
                          {withPiePercents(stats?.charts.sexDistribution).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend
                          verticalAlign="bottom"
                          wrapperStyle={legendStyle}
                          formatter={pieLegendFormatter}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section data-pdf-kind="chart" className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Distribución por edad{distributionSuffix}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={chartHeight}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.charts.ageDistribution} margin={{ left: isMobile ? -16 : 0, right: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dce8cc" />
                        <XAxis
                          dataKey="range"
                          stroke="#5b7235"
                          fontSize={axisFontSize}
                          interval={0}
                        />
                        <YAxis stroke="#5b7235" fontSize={axisFontSize} width={isMobile ? 28 : 40} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#006837" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section data-pdf-kind="chart" className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Distribución por estaca{distributionSuffix}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer loading={loading} height={Math.max(chartHeight, (stats?.charts.stakeDistribution.length ?? 0) * (isMobile ? 30 : 26) + 40)}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats?.charts.stakeDistribution}
                        layout="vertical"
                        margin={{ left: isMobile ? 4 : 8, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#dce8cc" />
                        <XAxis type="number" stroke="#5b7235" fontSize={axisFontSize} />
                        <YAxis
                          dataKey="stake"
                          type="category"
                          stroke="#5b7235"
                          fontSize={isMobile ? 11 : 12}
                          width={isMobile ? 80 : 100}
                          tickFormatter={(value: string) =>
                            value.length > 16 ? `${value.slice(0, 16)}…` : value
                          }
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#4B7914" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card data-pdf-section data-pdf-kind="chart" className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Asistencias por evento{distributionSuffix}</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                  <ChartContainer
                    loading={loading}
                    height={Math.max(chartHeight, (stats?.charts.eventDistribution?.length ?? 0) * (isMobile ? 30 : 26) + 40)}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats?.charts.eventDistribution ?? []}
                        layout="vertical"
                        margin={{ left: isMobile ? 4 : 8, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#dce8cc" />
                        <XAxis type="number" stroke="#5b7235" fontSize={axisFontSize} allowDecimals={false} />
                        <YAxis
                          dataKey="event"
                          type="category"
                          stroke="#5b7235"
                          fontSize={isMobile ? 11 : 12}
                          width={isMobile ? 88 : 110}
                          tickFormatter={(value: string) =>
                            value.length > 18 ? `${value.slice(0, 18)}…` : value
                          }
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill="#84BD31" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {!loading && (stats?.charts.fieldDistributions ?? []).map((field) => {
                const pieData = withPiePercents(field.data);
                return (
                <Card key={field.fieldName} data-pdf-section data-pdf-kind="chart" className="min-w-0 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base leading-snug">{field.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <ChartContainer loading={false} height={pieChartHeight}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="42%"
                            outerRadius={pieOuterRadius}
                            label={pieLabelContent}
                            labelLine={false}
                            isAnimationActive={false}
                          >
                            {pieData.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend
                            verticalAlign="bottom"
                            wrapperStyle={legendStyle}
                            formatter={pieLegendFormatter}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </div>
        </div>
      </PageTransition>
    </AdminLayout>
  );
}
