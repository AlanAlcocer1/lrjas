import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Search, Trash2, WalletCards, X } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { getApiErrorMessage, walletPassesAdminApi } from '@/services/api';
import { formatDate, formatTime } from '@/lib/utils';
import type { WalletPassAdminItem } from '@/types';

export default function WalletPassesPage() {
  const [items, setItems] = useState<WalletPassAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCode, setFilterCode] = useState('');
  const [toDelete, setToDelete] = useState<WalletPassAdminItem | null>(null);
  const [toRegen, setToRegen] = useState<WalletPassAdminItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await walletPassesAdminApi.list({
          limit: 200,
          code: filterCode.trim() || undefined,
        }),
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudieron cargar los pases'));
    } finally {
      setLoading(false);
    }
  }, [filterCode]);

  useEffect(() => {
    load();
  }, [load]);

  const removePass = async () => {
    if (!toDelete) return;
    setBusyId(toDelete.id);
    try {
      await walletPassesAdminApi.remove(toDelete.id);
      toast.success(`Pase de ${toDelete.participant.code} eliminado`);
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar'));
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  const regeneratePass = async () => {
    if (!toRegen) return;
    setBusyId(toRegen.id);
    try {
      await walletPassesAdminApi.regenerate(toRegen.id);
      toast.success(`Pase de ${toRegen.participant.code} regenerado`);
      setToRegen(null);
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo regenerar'));
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6">
          <FadeIn>
            <div>
              <h1 className="text-2xl font-bold mb-1">Pases Wallet</h1>
              <p className="text-sm text-muted-foreground">
                Elimina o regenera pases Apple/Google para aplicar branding nuevo (color, logo). El
                usuario vuelve a añadir el pase desde Mi credencial.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="filter-code">Filtrar por código</Label>
                    <Input
                      id="filter-code"
                      placeholder="Ej. 042"
                      value={filterCode}
                      onChange={(e) => setFilterCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && load()}
                      className="uppercase"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={load} className="gap-2">
                      <Search className="h-4 w-4" />
                      Buscar
                    </Button>
                    {filterCode.trim() && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setFilterCode('')}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !items.length ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    <WalletCards className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay pases generados
                    {filterCode.trim() ? ` para ${filterCode.trim()}` : ''}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[28rem] overflow-y-auto overscroll-contain pr-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-muted/40 p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.participant.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            Código{' '}
                            <span className="font-mono font-semibold text-leaf-dark">
                              {item.participant.code}
                            </span>
                            {' · '}
                            {formatDate(item.createdAt)} {formatTime(item.createdAt)}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                            {item.serialNumber}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            disabled={busyId === item.id}
                            onClick={() => setToRegen(item)}
                          >
                            {busyId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Regenerar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            disabled={busyId === item.id}
                            onClick={() => setToDelete(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <ConfirmDialog
          open={Boolean(toDelete)}
          onOpenChange={(open) => !open && setToDelete(null)}
          title="Eliminar pase"
          description={
            toDelete
              ? `Se invalidará el pase de ${toDelete.participant.fullName} (${toDelete.participant.code}) en Apple/Google. Podrá generar uno nuevo desde Mi credencial.`
              : ''
          }
          confirmLabel="Eliminar"
          variant="destructive"
          onConfirm={removePass}
        />

        <ConfirmDialog
          open={Boolean(toRegen)}
          onOpenChange={(open) => !open && setToRegen(null)}
          title="Regenerar pase"
          description={
            toRegen
              ? `Se revoca el pase actual de ${toRegen.participant.fullName} (${toRegen.participant.code}) y se crea uno nuevo con el branding actual. Debe volver a añadirlo a su cartera.`
              : ''
          }
          confirmLabel="Regenerar"
          variant="default"
          onConfirm={regeneratePass}
        />
      </PageTransition>
    </AdminLayout>
  );
}
