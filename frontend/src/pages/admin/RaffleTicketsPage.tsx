import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  Hash,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  CalendarDays,
  X,
  Dices,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RaffleTombolaDialog } from '@/components/raffle/RaffleTombolaDialog';
import { getApiErrorMessage, raffleApi } from '@/services/api';
import { formatDate, formatTime } from '@/lib/utils';
import { mexicoDateKey } from '@/lib/mexico-time';
import type { RaffleBulkResult, RaffleTicket } from '@/types';

function parseCodes(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.toUpperCase().split(/[\s,;]+/)) {
    const code = part.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

export default function RaffleTicketsPage() {
  const [codesText, setCodesText] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [lastTicket, setLastTicket] = useState<RaffleTicket | null>(null);
  const [lastBulk, setLastBulk] = useState<RaffleBulkResult | null>(null);
  const [recent, setRecent] = useState<RaffleTicket[]>([]);
  const [ticketToDelete, setTicketToDelete] = useState<RaffleTicket | null>(null);
  const [filterCode, setFilterCode] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [tombolaOpen, setTombolaOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const parsedCodes = useMemo(() => parseCodes(codesText), [codesText]);
  const qty = Math.min(50, Math.max(1, Number(quantity) || 1));
  const previewTotal = parsedCodes.length * qty;

  const loadRecent = useCallback(async () => {
    setLoadingList(true);
    try {
      setRecent(
        await raffleApi.recent({
          limit: 100,
          code: filterCode.trim() || undefined,
          date: filterDate || undefined,
        }),
      );
    } catch {
      toast.error('No se pudieron cargar los boletos');
    } finally {
      setLoadingList(false);
    }
  }, [filterCode, filterDate]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const generate = async () => {
    const codes = parseCodes(codesText);
    if (codes.length === 0) return;
    setSubmitting(true);
    try {
      const result = await raffleApi.createBulk(codes, qty);
      setLastBulk(result);
      setLastTicket(result.tickets[result.tickets.length - 1] ?? null);
      setCodesText('');
      toast.success(
        result.created === 1
          ? `Boleto #${result.tickets[0]?.folioLabel} generado`
          : `${result.created} boletos generados (${result.codes} código${result.codes === 1 ? '' : 's'} × ${result.quantityPerCode})`,
      );
      await loadRecent();
      inputRef.current?.focus();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo generar el boleto'));
      setLastTicket(null);
      setLastBulk(null);
    } finally {
      setSubmitting(false);
    }
  };

  const removeTicket = async () => {
    if (!ticketToDelete) return;
    try {
      const res = await raffleApi.remove(ticketToDelete.id);
      toast.success(`Boleto #${res.folioLabel} eliminado`);
      if (lastTicket?.id === ticketToDelete.id) setLastTicket(null);
      setTicketToDelete(null);
      await loadRecent();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar el boleto'));
      throw err;
    }
  };

  const clearFilters = () => {
    setFilterCode('');
    setFilterDate('');
  };

  const hasFilters = Boolean(filterCode.trim() || filterDate);

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6">
          <FadeIn>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Boletos de rifa</h1>
                <p className="text-sm text-muted-foreground">
                  Uno o varios códigos y cuántos boletos darle a cada uno
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2 shrink-0 border-leaf/40 text-leaf-darker hover:bg-leaf/10"
                onClick={() => setTombolaOpen(true)}
              >
                <Dices className="h-4 w-4" />
                Tómbola
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="raffle-codes" className="text-xs text-muted-foreground">
                      Códigos (uno o varios, separados por espacio, coma o Enter)
                    </Label>
                    <textarea
                      ref={inputRef}
                      id="raffle-codes"
                      placeholder={'001\n002\n015'}
                      value={codesText}
                      onChange={(e) => setCodesText(e.target.value.toUpperCase())}
                      className="flex min-h-[5.5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-base uppercase tracking-wider ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      autoComplete="off"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5 sm:w-36">
                    <Label htmlFor="raffle-qty" className="text-xs text-muted-foreground">
                      Boletos c/u
                    </Label>
                    <Input
                      id="raffle-qty"
                      type="number"
                      min={1}
                      max={50}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                      className="tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {parsedCodes.length === 0
                      ? 'Escribe al menos un código'
                      : `${parsedCodes.length} código${parsedCodes.length === 1 ? '' : 's'} × ${qty} = ${previewTotal} boleto${previewTotal === 1 ? '' : 's'}`}
                  </p>
                  <Button
                    onClick={() => void generate()}
                    disabled={submitting || parsedCodes.length === 0 || previewTotal > 500}
                    className="gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ticket className="h-4 w-4" />
                    )}
                    Generar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <AnimatePresence mode="wait">
            {lastBulk && (
              <motion.div
                key={`bulk-${lastBulk.tickets[0]?.id ?? 'ok'}-${lastBulk.created}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-leaf/40 bg-gradient-to-br from-leaf/10 via-white to-leaf-dark/5 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-leaf text-white shadow-sm">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-widest text-leaf-dark font-medium mb-1">
                          Boletos generados
                        </p>
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-leaf-darker">
                          {lastBulk.created}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {lastBulk.codes} código{lastBulk.codes === 1 ? '' : 's'} ×{' '}
                          {lastBulk.quantityPerCode} boleto
                          {lastBulk.quantityPerCode === 1 ? '' : 's'} c/u
                        </p>
                        {lastTicket && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            Último: #{lastTicket.folioLabel} · {lastTicket.participant.fullName}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-leaf/15 text-leaf-darker border-leaf/30">Nuevo</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <FadeIn delay={0.1}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Boletos
                </h2>
                {loadingList && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor="filter-code" className="text-xs text-muted-foreground">
                        Código de usuario
                      </Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="filter-code"
                          placeholder="Ej. 001"
                          value={filterCode}
                          onChange={(e) => setFilterCode(e.target.value.toUpperCase())}
                          className="pl-9 uppercase"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="filter-date" className="text-xs text-muted-foreground">
                        Día
                      </Label>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="filter-date"
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="pl-9"
                          max={mexicoDateKey()}
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto gap-1.5"
                        disabled={!hasFilters}
                        onClick={clearFilters}
                      >
                        <X className="h-3.5 w-3.5" />
                        Limpiar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {recent.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {hasFilters
                      ? 'No hay boletos con esos filtros'
                      : 'Aún no hay boletos generados'}
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
                  {recent.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <span className="font-mono text-sm font-semibold tabular-nums text-leaf-darker w-16">
                        #{t.folioLabel}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.participant.fullName}</p>
                        <p className="text-xs text-muted-foreground">{t.participant.code}</p>
                        <p className="text-xs text-muted-foreground/80 truncate mt-0.5">
                          Por {t.createdBy?.name || t.createdBy?.username || 'desconocido'}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground shrink-0">
                        <p>{formatDate(t.createdAt)}</p>
                        <p>{formatTime(t.createdAt)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setTicketToDelete(t)}
                        aria-label={`Eliminar boleto ${t.folioLabel}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>
        </div>

        <ConfirmDialog
          open={!!ticketToDelete}
          onOpenChange={(open) => {
            if (!open) setTicketToDelete(null);
          }}
          title="Eliminar boleto"
          description={
            ticketToDelete
              ? `¿Eliminar el boleto #${ticketToDelete.folioLabel} de ${ticketToDelete.participant.fullName}? Esta acción no se puede deshacer.`
              : undefined
          }
          confirmLabel="Eliminar"
          onConfirm={removeTicket}
        />

        <RaffleTombolaDialog open={tombolaOpen} onOpenChange={setTombolaOpen} />
      </PageTransition>
    </AdminLayout>
  );
}
