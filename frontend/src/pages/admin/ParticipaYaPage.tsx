import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Trophy,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { participaYaApi, getApiErrorMessage } from '@/services/api';
import type { ParticipaYaEntry, ParticipaYaWhatsappStatus } from '@/types';

export default function ParticipaYaPage() {
  const [entries, setEntries] = useState<ParticipaYaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [wa, setWa] = useState<ParticipaYaWhatsappStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadRanking = useCallback(() => {
    setLoading(true);
    participaYaApi
      .listEntries()
      .then((r) => setEntries(r.entries))
      .catch(() => toast.error('Error al cargar ranking'))
      .finally(() => setLoading(false));
  }, []);

  const loadWhatsapp = useCallback(async () => {
    try {
      const status = await participaYaApi.whatsappStatus();
      setWa(status);
      if (status.hasQr && !status.connected) {
        const qr = await participaYaApi.whatsappQr();
        setQrDataUrl(qr.dataUrl);
      } else {
        setQrDataUrl(null);
      }
    } catch (err) {
      setWa({
        configured: false,
        connected: false,
        hasQr: false,
        lastError: getApiErrorMessage(err, 'WhatsApp no disponible'),
        cronHint: '0 9 * * *',
      });
      setQrDataUrl(null);
    }
  }, []);

  useEffect(() => {
    loadRanking();
    loadWhatsapp();
    const t = setInterval(loadWhatsapp, 5000);
    return () => clearInterval(t);
  }, [loadRanking, loadWhatsapp]);

  const handleUpsert = async () => {
    const c = code.trim();
    const n = Number(score);
    if (!c) {
      toast.error('Ingresa un código');
      return;
    }
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Ingresa un total válido');
      return;
    }
    setSaving(true);
    try {
      await participaYaApi.upsertEntry(c, Math.floor(n));
      toast.success('Ranking actualizado');
      setCode('');
      setScore('');
      loadRanking();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await participaYaApi.removeEntry(id);
      toast.success('Eliminado');
      loadRanking();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar'));
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      await participaYaApi.sendRankingNow();
      toast.success('Ranking enviado al canal');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo enviar'));
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6 max-w-2xl">
          <FadeIn>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold mb-1">Participa Ya</h1>
                <p className="text-sm text-muted-foreground">
                  Ranking del concurso y vínculo de WhatsApp
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={loadRanking} aria-label="Recargar">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendNow}
                  disabled={sending || !wa?.connected}
                  className="gap-2"
                  title={
                    wa?.connected
                      ? 'Publica el top 10 en el canal ahora'
                      : 'Vincula WhatsApp con el QR para poder enviar'
                  }
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Enviar ranking ahora</span>
                  <span className="sm:hidden">Enviar</span>
                </Button>
              </div>
            </div>
            {!wa?.connected && (
              <p className="text-xs text-muted-foreground mt-2">
                El envío manual se activa cuando WhatsApp esté conectado (escanea el QR abajo).
              </p>
            )}
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-leaf-dark" />
                  <h2 className="font-semibold text-sm">Alta / actualizar total</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="py-code">Código</Label>
                    <Input
                      id="py-code"
                      placeholder="000"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="py-score">Nombres hechos</Label>
                    <Input
                      id="py-score"
                      placeholder="200"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleUpsert} disabled={saving} className="w-full gap-2">
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Guardar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-sm mb-1">WhatsApp canal</h2>
                    <p className="text-xs text-muted-foreground">
                      Diario a las 9:00 (México) — top 10 del ranking
                    </p>
                  </div>
                  {wa?.connected ? (
                    <Badge className="gap-1 bg-leaf/15 text-leaf-dark border-leaf/30">
                      <Wifi className="h-3 w-3" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <WifiOff className="h-3 w-3" />
                      {wa?.hasQr ? 'Escanea QR' : 'Desconectado'}
                    </Badge>
                  )}
                </div>

                {wa?.lastError && !wa.connected && (
                  <p className="text-xs text-destructive">{wa.lastError}</p>
                )}

                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-leaf/30 bg-leaf/5 p-4">
                    <img
                      src={qrDataUrl}
                      alt="QR para vincular WhatsApp"
                      className="h-56 w-56 rounded-lg bg-white p-2"
                    />
                    <p className="text-xs text-center text-muted-foreground max-w-xs">
                      WhatsApp → Dispositivos vinculados → Vincular dispositivo
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={loadWhatsapp} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Actualizar estado
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendNow}
                    disabled={sending || !wa?.connected}
                    className="gap-2"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Enviar ranking ahora
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.15}>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aún no hay entradas en el ranking
              </p>
            ) : (
              <div className="space-y-2">
                {entries.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card>
                      <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold tabular-nums">
                          {e.rank}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {e.name}{' '}
                            <span className="text-muted-foreground font-normal">
                              ({e.code})
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {e.score} nombres
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(e.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </FadeIn>
        </div>
      </PageTransition>
    </AdminLayout>
  );
}
