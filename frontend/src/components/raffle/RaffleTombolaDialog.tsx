import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RafflePick } from 'react-raffle-picker';
import 'react-raffle-picker/styles.css';
import { Dices, Loader2, PartyPopper, Ticket, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getApiErrorMessage, raffleApi } from '@/services/api';
import { cn } from '@/lib/utils';
import type { RaffleTicket } from '@/types';

type RaffleTombolaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DrawnEntry = {
  ticket: RaffleTicket;
  at: number;
};

export function RaffleTombolaDialog({ open, onOpenChange }: RaffleTombolaDialogProps) {
  const [pool, setPool] = useState<RaffleTicket[]>([]);
  const [drawn, setDrawn] = useState<DrawnEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [arming, setArming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const [finalValue, setFinalValue] = useState<string | undefined>();
  const [active, setActive] = useState(false);
  const [lastWinner, setLastWinner] = useState<RaffleTicket | null>(null);
  const pendingWinnerRef = useRef<RaffleTicket | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setDrawn([]);
    setLastWinner(null);
    setFinalValue(undefined);
    setActive(false);
    setBusy(false);
    setArming(false);
    pendingWinnerRef.current = null;
    setRoundKey((k) => k + 1);

    raffleApi
      .drawPool()
      .then((tickets) => {
        if (!cancelled) setPool(tickets);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err, 'No se pudo cargar la tómbola'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // `pool` ya excluye los sorteados de esta sesión
  const remaining = pool.length;
  const drawnIds = drawn.map((d) => d.ticket.id);

  const startRound = async () => {
    if (busy || arming || remaining <= 0) return;
    setArming(true);
    setLastWinner(null);
    try {
      const result = await raffleApi.draw({ excludeIds: drawnIds });
      pendingWinnerRef.current = result.winner;
      setFinalValue(result.winner.folioLabel);
      setActive(true);
      setBusy(true);
      setRoundKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo sortear'));
      pendingWinnerRef.current = null;
      setFinalValue(undefined);
      setActive(false);
    } finally {
      setArming(false);
    }
  };

  const handleSelect = (value: string | number) => {
    const folio = String(value);
    const winner =
      pendingWinnerRef.current ??
      pool.find((t) => t.folioLabel === folio) ??
      null;

    if (!winner) {
      setBusy(false);
      setActive(false);
      return;
    }

    // Solo fuera del bombo de ESTA sesión (el modal). No se borra de la BD.
    setLastWinner(winner);
    toast.success(`¡Ganó el boleto #${winner.folioLabel}!`);
    setDrawn((prev) => [{ ticket: winner, at: Date.now() }, ...prev]);
    setPool((prev) => prev.filter((t) => t.id !== winner.id));
    pendingWinnerRef.current = null;
    setBusy(false);
    setActive(false);
    setFinalValue(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && !arming && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Dices className="h-5 w-5 text-leaf-dark" />
            Tómbola de rifa
          </DialogTitle>
          <DialogDescription>
            Máquina de 5 dígitos (folio). Mientras el modal esté abierto es una sesión: los ganadores
            salen del bombo, pero los boletos siguen en la base. Al cerrar y abrir de nuevo se
            recargan todos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Cargando…'
              : `${remaining} en bombo${drawn.length ? ` · ${drawn.length} ya sorteado${drawn.length === 1 ? '' : 's'}` : ''}`}
          </p>

          <div className="rounded-2xl border border-leaf/30 bg-gradient-to-b from-leaf/10 via-white to-muted/40 px-4 py-6">
            {loading ? (
              <div className="flex h-28 items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : remaining <= 0 && !active ? (
              <div className="flex h-28 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Ticket className="h-6 w-6" />
                {drawn.length > 0 ? 'Ya no quedan boletos en el bombo' : 'No hay boletos para sortear'}
              </div>
            ) : (
              <RafflePick
                key={roundKey}
                autoStart={active}
                inertia
                finalValue={finalValue}
                initialValue={finalValue ?? '00000'}
                onSelect={handleSelect}
                className="flex flex-col items-center gap-5"
              >
                <div className="relative">
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-leaf px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                    Folio
                  </div>
                  <RafflePick.Slots
                    length={5}
                    chars="0123456789"
                    spinInterval={70}
                    staggerMs={200}
                    className="raffle-slots gap-1.5"
                    slotClassName="raffle-slot"
                  />
                </div>

                {/* Countdown invisible: congela solo el resultado, sin anillo ni botón "Revelar". */}
                {active && (
                  <RafflePick.Countdown seconds={4}>{() => null}</RafflePick.Countdown>
                )}

                {active ? (
                  <p className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-muted text-sm font-medium text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Girando…
                  </p>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full gap-2 h-11"
                    disabled={arming || remaining <= 0}
                    onClick={startRound}
                  >
                    {arming ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparando…
                      </>
                    ) : (
                      <>
                        <Dices className="h-4 w-4" />
                        ¡Sortear!
                      </>
                    )}
                  </Button>
                )}
              </RafflePick>
            )}
          </div>

          <AnimatePresence mode="wait">
            {lastWinner && (
              <motion.div
                key={lastWinner.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border border-leaf/40 bg-gradient-to-br from-leaf/15 via-white to-leaf-dark/10 p-4 text-center space-y-1"
              >
                <div className="inline-flex items-center gap-1.5 text-leaf-dark text-xs font-medium uppercase tracking-wide">
                  <PartyPopper className="h-3.5 w-3.5" />
                  Último ganador
                </div>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-leaf-darker">
                  #{lastWinner.folioLabel}
                </p>
                <p className="font-semibold">{lastWinner.participant.fullName}</p>
                <p className="text-xs text-muted-foreground">Código {lastWinner.participant.code}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Trophy className="h-4 w-4" />
              Números que ya salieron
            </div>
            {drawn.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border px-3 py-4 text-center">
                Aquí irán apareciendo los folios sorteados
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {drawn.map((entry, index) => (
                  <motion.li
                    key={entry.ticket.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5',
                      index === 0 && 'border-leaf/40 bg-leaf/5',
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-leaf/15 text-leaf-dark">
                      <Ticket className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold tabular-nums text-leaf-darker">
                        #{entry.ticket.folioLabel}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.ticket.participant.fullName}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      #{drawn.length - index}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <style>{`
          .raffle-slots {
            display: flex;
            justify-content: center;
            align-items: stretch;
          }
          .raffle-slot {
            width: 3rem;
            height: 4.25rem;
            border-radius: 0.75rem;
            border: 1px solid rgba(132, 189, 49, 0.35);
            background: linear-gradient(180deg, #f7fbf0 0%, #ffffff 45%, #eef5e4 100%);
            color: #006837;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 1.75rem;
            font-weight: 700;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px rgba(75, 121, 20, 0.08);
          }
          @media (min-width: 480px) {
            .raffle-slot {
              width: 3.5rem;
              height: 4.75rem;
              font-size: 2rem;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
