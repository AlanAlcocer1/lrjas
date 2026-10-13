import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Search, Loader2, Sparkles, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage, raffleApi } from '@/services/api';
import { formatDate, formatTime } from '@/lib/utils';
import type { RaffleLookupResult } from '@/types';

export default function RaffleLookupPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RaffleLookupResult | null>(null);

  const search = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await raffleApi.lookup(trimmed));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se encontraron boletos para ese código'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <PageTransition>
        <div className="space-y-8 pt-2">
          <FadeIn>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-leaf to-leaf-darker text-white shadow-lg shadow-leaf/25">
                <Ticket className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mis boletos de rifa</h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  Escribe tu código personal para ver cuántos boletos tienes y en qué día te los
                  dieron
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="flex gap-2 max-w-md mx-auto">
              <Input
                placeholder="Tu código"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                className="text-base uppercase tracking-wider text-center font-semibold"
                autoComplete="off"
              />
              <Button onClick={search} disabled={loading || !code.trim()} className="gap-2 shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Buscar
              </Button>
            </div>
          </FadeIn>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.participant.code}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="relative overflow-hidden rounded-3xl border border-leaf/30 bg-gradient-to-br from-[#f7fbf0] via-white to-[#eef6e0] p-6 sm:p-8 shadow-sm">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-leaf/10 blur-2xl" />
                  <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-leaf-dark/10 blur-2xl" />
                  <div className="relative space-y-4 text-center">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-white/80 px-3 py-1 text-xs text-leaf-dark">
                      <Sparkles className="h-3 w-3" />
                      Código {result.participant.code}
                    </div>
                    <p className="text-lg font-medium text-foreground/90">
                      {result.participant.fullName}
                    </p>
                    <div>
                      <p className="text-6xl sm:text-7xl font-bold tabular-nums tracking-tight text-leaf-darker leading-none">
                        {result.total}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {result.total === 1 ? 'boleto acumulado' : 'boletos acumulados'}
                      </p>
                    </div>
                  </div>
                </div>

                {result.tickets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    Aún no tienes boletos. ¡Asiste a la feria para conseguirlos!
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                      Historial de boletos
                    </h2>
                    <div className="grid gap-3">
                      {result.tickets.map((t, i) => (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.4) }}
                          className="relative overflow-hidden rounded-2xl border border-border bg-card"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-leaf to-leaf-darker" />
                          <div className="flex items-center gap-4 pl-5 pr-4 py-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-leaf/10 border border-leaf/20">
                              <Ticket className="h-5 w-5 text-leaf-dark" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-mono text-xl font-bold tabular-nums tracking-wide text-leaf-darker">
                                #{t.folioLabel}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span>
                                  {formatDate(t.createdAt)} · {formatTime(t.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* ticket stub perforations */}
                          <div className="absolute right-14 top-0 bottom-0 border-l border-dashed border-border/80" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageTransition>
    </PublicLayout>
  );
}
