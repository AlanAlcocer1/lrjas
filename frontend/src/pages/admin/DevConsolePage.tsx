import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Play, Loader2, Terminal, Database } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { devApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

const PRESETS = [
  {
    label: 'Asistencias por date_mexico',
    sql: `SELECT date_mexico, COUNT(*) AS total
FROM attendances
GROUP BY date_mexico
ORDER BY date_mexico DESC
LIMIT 20`,
  },
  {
    label: 'Asistencias 2026-06-17',
    sql: `SELECT a.date_mexico, a.method, a.created_at, p.code, p.first_name, p.last_name
FROM attendances a
JOIN participants p ON p.id = a.participant_id
WHERE a.date_mexico = '2026-06-17'
ORDER BY a.created_at`,
  },
  {
    label: 'Columnas attendances',
    sql: `SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendances'
ORDER BY ordinal_position`,
  },
  {
    label: 'Registros recientes',
    sql: `SELECT code, first_name, last_name, created_at
FROM participants
ORDER BY created_at DESC
LIMIT 20`,
  },
];

export default function DevConsolePage() {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState(PRESETS[0].sql);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    rows: Record<string, unknown>[];
    rowCount: number;
    durationMs: number;
  } | null>(null);

  const runQuery = async () => {
    setLoading(true);
    try {
      const data = await devApi.executeSql(query);
      setResult(data);
      toast.success(`${data.rowCount} filas en ${data.durationMs}ms`);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Error al ejecutar SQL';
      toast.error(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const columns = result?.rows.length ? Object.keys(result.rows[0]) : [];

  if (!authLoading && user?.username?.toLowerCase() !== '000') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6">
          <FadeIn>
            <div>
              <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Terminal className="h-6 w-6 text-leaf-dark" />
                Consola SQL
              </h1>
              <p className="text-sm text-muted-foreground">
                Solo lectura (SELECT). Usuario 000.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Consultas rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(preset.sql)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="p-4 space-y-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  spellCheck={false}
                  className="w-full min-h-[180px] font-mono text-sm p-3 rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-leaf/40"
                  placeholder="SELECT ..."
                />
                <Button onClick={runQuery} disabled={loading || !query.trim()} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Ejecutar
                </Button>
              </CardContent>
            </Card>
          </FadeIn>

          {result && (
            <FadeIn delay={0.15}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {result.rowCount} filas · {result.durationMs}ms
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {result.rowCount === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">Sin resultados</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            {columns.map((col) => (
                              <th key={col} className="text-left p-2 font-medium whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} className="border-b border-border/60">
                              {columns.map((col) => (
                                <td key={col} className="p-2 whitespace-nowrap max-w-[240px] truncate">
                                  {row[col] == null ? '—' : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </div>
      </PageTransition>
    </AdminLayout>
  );
}
