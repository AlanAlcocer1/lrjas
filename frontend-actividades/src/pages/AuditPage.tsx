import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, LogIn, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { auditApi } from '@/services/api';
import type { AccessLogEntry, AuditHistoryEntry } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  formatDate,
  getErrorMessage,
  historyActionDetail,
  historyActionLabel,
} from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return formatDate(iso);
  }
}

export function AuditPage() {
  const { hasPermission } = useAuth();
  const [logins, setLogins] = useState<AccessLogEntry[]>([]);
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasPermission('audit.view')) return;
    setLoading(true);
    Promise.all([auditApi.logins(), auditApi.history()])
      .then(([l, h]) => {
        setLogins(l);
        setHistory(h);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [hasPermission]);

  if (!hasPermission('audit.view')) {
    return <Navigate to="/app" replace />;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm text-muted-foreground">
          Auditoría de accesos y cambios (solo administradores)
        </p>
      </div>

      <Tabs defaultValue="logins">
        <TabsList className="max-w-md">
          <TabsTrigger value="logins" className="flex-1 gap-1.5">
            <LogIn className="h-3.5 w-3.5" />
            Inicios de sesión
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 gap-1.5">
            <ScrollText className="h-3.5 w-3.5" />
            Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logins" className="mt-4 space-y-2">
          {logins.length === 0 ? (
            <EmptyState
              icon={LogIn}
              title="Sin registros"
              description="Cuando alguien entre al panel aparecerá aquí."
            />
          ) : (
            logins.map((row) => (
              <Card key={row.id}>
                <CardContent className="p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm truncate">
                      {row.participant?.name ?? `Código ${row.code ?? '—'}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Código {row.participant?.code ?? row.code ?? '—'}
                      {row.ip ? ` · IP ${row.ip}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatWhen(row.createdAt)}</p>
                  </div>
                  <Badge variant={row.action === 'login' ? 'secondary' : 'destructive'}>
                    {row.action === 'login' ? 'Entró' : 'Denegado'}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4 space-y-2">
          {history.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sin actividad"
              description="Los cambios en actividades se listarán aquí."
            />
          ) : (
            history.map((row) => (
              <Card key={row.id}>
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm">{historyActionLabel(row.action)}</p>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {formatWhen(row.createdAt)}
                    </p>
                  </div>
                  {row.activity && (
                    <Link
                      to={`/app/actividades/${row.activity.id}`}
                      className="text-sm text-leaf-dark hover:underline"
                    >
                      {row.activity.name}
                    </Link>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {row.participant?.name ?? 'Sistema'}
                    {row.participant?.code ? ` · ${row.participant.code}` : ''}
                  </p>
                  {historyActionDetail(row.action, row.oldValue, row.newValue) && (
                    <p className="text-xs text-muted-foreground">
                      {historyActionDetail(row.action, row.oldValue, row.newValue)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
