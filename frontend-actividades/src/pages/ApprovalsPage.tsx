import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { activitiesApi } from '@/services/api';
import type { Activity } from '@/types';
import { ActivityCard } from '@/components/activities/ActivityCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState, Skeleton } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';

export function ApprovalsPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Activity | null>(null);
  const [mode, setMode] = useState<'approve' | 'reject' | 'changes' | null>(null);
  const [comments, setComments] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    activitiesApi
      .pendingApprovals()
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAction = (activity: Activity, m: typeof mode) => {
    setSelected(activity);
    setMode(m);
    setComments('');
    setReason('');
  };

  const submit = async () => {
    if (!selected || !mode) return;
    setBusy(true);
    try {
      if (mode === 'approve') await activitiesApi.approve(selected.id, comments || undefined);
      if (mode === 'changes') await activitiesApi.requestChanges(selected.id, comments || undefined);
      if (mode === 'reject') {
        if (!reason.trim()) {
          toast.error('El motivo es obligatorio');
          setBusy(false);
          return;
        }
        await activitiesApi.reject(selected.id, reason.trim(), comments || undefined);
      }
      toast.success('Listo');
      setSelected(null);
      setMode(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Aprobaciones</h1>
        <p className="text-sm text-muted-foreground">Actividades pendientes de revisión</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nada pendiente"
          description="No hay actividades esperando aprobación."
        />
      ) : (
        <div className="grid gap-4">
          {items.map((a) => (
            <div key={a.id} className="space-y-2">
              <ActivityCard activity={a} />
              <Card>
                <CardContent className="p-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/app/actividades/${a.id}`}>Ver detalle</Link>
                  </Button>
                  {hasPermission('activities.approve') && (
                    <Button size="sm" onClick={() => openAction(a, 'approve')}>
                      Aprobar
                    </Button>
                  )}
                  {hasPermission('approvals.request_changes') && (
                    <Button size="sm" variant="secondary" onClick={() => openAction(a, 'changes')}>
                      Pedir cambios
                    </Button>
                  )}
                  {hasPermission('approvals.reject') && (
                    <Button size="sm" variant="destructive" onClick={() => openAction(a, 'reject')}>
                      Rechazar
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!mode && !!selected} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'approve' && 'Aprobar actividad'}
              {mode === 'reject' && 'Rechazar actividad'}
              {mode === 'changes' && 'Solicitar cambios'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{selected?.name}</p>
            <div className="space-y-2">
              <Label>Comentarios</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
            {mode === 'reject' && (
              <div className="space-y-2">
                <Label>Motivo de rechazo *</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}
            <Button className="w-full" disabled={busy} onClick={submit}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
