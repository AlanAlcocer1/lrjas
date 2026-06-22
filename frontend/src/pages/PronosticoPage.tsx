import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Trophy,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { ParticipantLookupModal } from '@/components/pronostico/ParticipantLookupModal';
import { TeamRosterCard, teamFlagSrc } from '@/components/pronostico/TeamRosterCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { predictionsApi, getApiErrorMessage } from '@/services/api';
import type { MatchInfo, Participant, Prediction } from '@/types';

type Step = 'form' | 'confirm' | 'success';

function flatPlayers(team: MatchInfo['mexico']) {
  return Object.values(team.players).flat();
}

function ScorePreview({
  mexicoScore,
  czechScore,
  mexicoFlag,
  czechFlag,
}: {
  mexicoScore: number;
  czechScore: number;
  mexicoFlag: string;
  czechFlag: string;
}) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <div className="text-center">
        <img src={mexicoFlag} alt="México" className="h-12 w-16 object-cover rounded-md mx-auto mb-2" />
        <p className="text-3xl font-black text-leaf-darker">{mexicoScore}</p>
      </div>
      <span className="text-2xl font-bold text-muted-foreground">—</span>
      <div className="text-center">
        <img src={czechFlag} alt="Chequia" className="h-12 w-16 object-cover rounded-md mx-auto mb-2" />
        <p className="text-3xl font-black">{czechScore}</p>
      </div>
    </div>
  );
}

function ExistingPredictionCard({
  prediction,
  match,
}: {
  prediction: Prediction;
  match: MatchInfo;
}) {
  return (
    <Card className="border-leaf/40 bg-leaf/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-leaf shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-lg">¡Ya mandaste tu pronóstico!</h2>
            <p className="text-sm text-muted-foreground">
              {prediction.participantName} ({prediction.participantCode}) — no se puede cambiar después de enviarlo.
            </p>
          </div>
        </div>
        <ScorePreview
          mexicoScore={prediction.mexicoScore}
          czechScore={prediction.czechScore}
          mexicoFlag={teamFlagSrc(match.mexico.flag)}
          czechFlag={teamFlagSrc(match.czech.flag)}
        />
        {(prediction.mexicoScorers.length > 0 || prediction.czechScorers.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {prediction.mexicoScorers.length > 0 && (
              <div>
                <p className="font-medium text-leaf-darker mb-1">Goleadores 🇲🇽</p>
                <ul className="text-muted-foreground space-y-0.5">
                  {prediction.mexicoScorers.map((s, i) => (
                    <li key={`m-${i}`}>· {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {prediction.czechScorers.length > 0 && (
              <div>
                <p className="font-medium mb-1">Goleadores 🇨🇿</p>
                <ul className="text-muted-foreground space-y-0.5">
                  {prediction.czechScorers.map((s, i) => (
                    <li key={`c-${i}`}>· {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PronosticoPage() {
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [lookupOpen, setLookupOpen] = useState(false);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participantCode, setParticipantCode] = useState('');
  const [existingPrediction, setExistingPrediction] = useState<Prediction | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [mexicoScore, setMexicoScore] = useState('0');
  const [czechScore, setCzechScore] = useState('0');
  const [mexicoScorers, setMexicoScorers] = useState<string[]>([]);
  const [czechScorers, setCzechScorers] = useState<string[]>([]);

  const mexicoFlag = teamFlagSrc('mexico_bandera.png');
  const czechFlag = teamFlagSrc('bandera_chequia.png');

  useEffect(() => {
    predictionsApi
      .getMatch()
      .then(setMatch)
      .catch(() => toast.error('No se pudo cargar la información del partido'))
      .finally(() => setLoading(false));
  }, []);

  const mexicoGoals = Math.max(0, parseInt(mexicoScore, 10) || 0);
  const czechGoals = Math.max(0, parseInt(czechScore, 10) || 0);

  const mexicoPlayerList = useMemo(() => (match ? flatPlayers(match.mexico) : []), [match]);
  const czechPlayerList = useMemo(() => (match ? flatPlayers(match.czech) : []), [match]);

  useEffect(() => {
    setMexicoScorers((prev) => {
      const next = [...prev];
      while (next.length < mexicoGoals) next.push('');
      return next.slice(0, mexicoGoals);
    });
  }, [mexicoGoals]);

  useEffect(() => {
    setCzechScorers((prev) => {
      const next = [...prev];
      while (next.length < czechGoals) next.push('');
      return next.slice(0, czechGoals);
    });
  }, [czechGoals]);

  const checkParticipant = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setCheckingCode(true);
    try {
      const status = await predictionsApi.getStatus(trimmed);
      setMatch(status);
      if (status.hasPrediction && status.prediction) {
        setExistingPrediction(status.prediction);
        setParticipantCode(trimmed);
      } else {
        setExistingPrediction(null);
        setParticipantCode(trimmed);
      }
    } catch {
      toast.error('No se pudo verificar el código');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleParticipantSelect = (p: Participant) => {
    setParticipant(p);
    setParticipantCode(p.code);
    checkParticipant(p.code);
  };

  const validateForm = (): boolean => {
    if (!participantCode.trim()) {
      toast.error('Ingresa tu código de usuario');
      return false;
    }
    if (mexicoGoals < 0 || czechGoals < 0 || mexicoGoals > 20 || czechGoals > 20) {
      toast.error('Marcador inválido');
      return false;
    }
    if (mexicoScorers.some((s) => !s) || czechScorers.some((s) => !s)) {
      toast.error('Selecciona todos los goleadores');
      return false;
    }
    return true;
  };

  const goToConfirm = () => {
    if (!validateForm()) return;
    setStep('confirm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitPrediction = async () => {
    setSubmitting(true);
    try {
      const result = await predictionsApi.create({
        participantCode: participantCode.trim().toUpperCase(),
        mexicoScore: mexicoGoals,
        czechScore: czechGoals,
        mexicoScorers,
        czechScorers,
      });
      setExistingPrediction(result);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo enviar el pronóstico'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !match) {
    return (
      <PublicLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-leaf" />
        </div>
      </PublicLayout>
    );
  }

  const isClosed = match.deadlinePassed || !match.isOpen;

  return (
    <PublicLayout>
      <PageTransition>
        <div className="space-y-6 -mx-1">
          <FadeIn>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#006837] via-[#4B7914] to-[#84BD31] text-white p-5 sm:p-8 shadow-lg">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
              <div className="relative space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  <Trophy className="h-3.5 w-3.5" />
                  {match.subtitle}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">
                  Adivina el resultado
                  <span className="block text-white/90 text-lg sm:text-xl font-semibold mt-1">
                    {match.title}
                  </span>
                </h1>
                <p className="text-sm text-white/85 max-w-xl">
                  Pon tu marcador y, si te animas, adivina quién mete los goles. Solo un pronóstico por
                  persona — después ya no se puede cambiar.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Fecha límite: {match.deadlineLabel}
                  </span>
                  {isClosed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900/40 px-3 py-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      Pronósticos cerrados
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-6 sm:gap-10 pt-2">
                  <img src={mexicoFlag} alt="México" className="h-16 sm:h-20 w-auto object-contain drop-shadow-md" />
                  <span className="text-xl sm:text-2xl font-bold opacity-80">VS</span>
                  <img src={czechFlag} alt="República Checa" className="h-16 sm:h-20 w-auto object-contain drop-shadow-md" />
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <div className="grid gap-4 lg:grid-cols-2">
              <TeamRosterCard team={match.mexico} flagSrc={mexicoFlag} />
              <TeamRosterCard team={match.czech} flagSrc={czechFlag} accentClass="border-border" />
            </div>
          </FadeIn>

          {existingPrediction && step !== 'success' && (
            <FadeIn delay={0.08}>
              <ExistingPredictionCard prediction={existingPrediction} match={match} />
            </FadeIn>
          )}

          {!existingPrediction && !isClosed && step === 'form' && (
            <FadeIn delay={0.1}>
              <Card className="border-leaf/30 shadow-md">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-leaf-darker">Tu pronóstico</h2>
                    <p className="text-sm text-muted-foreground">Identifícate y pon el marcador</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Código de usuario</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="code"
                        placeholder="Ej. A1B2C3"
                        value={participantCode}
                        onChange={(e) => {
                          setParticipantCode(e.target.value.toUpperCase());
                          setParticipant(null);
                          setExistingPrediction(null);
                        }}
                        onBlur={() => participantCode.trim() && checkParticipant(participantCode)}
                        className="uppercase text-base"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLookupOpen(true)}
                        className="shrink-0"
                      >
                        ¿No sabes tu usuario, chavito?
                      </Button>
                    </div>
                    {participant && (
                      <p className="text-sm text-leaf-dark flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {participant.fullName}
                      </p>
                    )}
                    {checkingCode && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Verificando código…
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end max-w-md mx-auto">
                    <div className="space-y-2 text-center">
                      <Label>México 🇲🇽</Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        inputMode="numeric"
                        value={mexicoScore}
                        onChange={(e) => setMexicoScore(e.target.value)}
                        className="text-center text-2xl font-bold h-14"
                      />
                    </div>
                    <span className="pb-4 text-xl font-bold text-muted-foreground">—</span>
                    <div className="space-y-2 text-center">
                      <Label>Chequia 🇨🇿</Label>
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        inputMode="numeric"
                        value={czechScore}
                        onChange={(e) => setCzechScore(e.target.value)}
                        className="text-center text-2xl font-bold h-14"
                      />
                    </div>
                  </div>

                  {mexicoGoals > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-leaf-darker">
                        Goleadores de México ({mexicoGoals})
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {mexicoScorers.map((scorer, i) => (
                          <Select
                            key={`mx-${i}`}
                            value={scorer || undefined}
                            onValueChange={(v) =>
                              setMexicoScorers((prev) => prev.map((s, idx) => (idx === i ? v : s)))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Gol ${i + 1} de México`} />
                            </SelectTrigger>
                            <SelectContent>
                              {mexicoPlayerList.map((p) => (
                                <SelectItem key={`${i}-${p}`} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ))}
                      </div>
                    </div>
                  )}

                  {czechGoals > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Goleadores de República Checa ({czechGoals})</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {czechScorers.map((scorer, i) => (
                          <Select
                            key={`cz-${i}`}
                            value={scorer || undefined}
                            onValueChange={(v) =>
                              setCzechScorers((prev) => prev.map((s, idx) => (idx === i ? v : s)))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Gol ${i + 1} de Chequia`} />
                            </SelectTrigger>
                            <SelectContent>
                              {czechPlayerList.map((p) => (
                                <SelectItem key={`${i}-${p}`} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-leaf-dark hover:bg-leaf-darker text-white h-12 text-base font-semibold"
                    onClick={goToConfirm}
                  >
                    Revisar pronóstico
                  </Button>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {!existingPrediction && !isClosed && step === 'confirm' && (
            <FadeIn>
              <Card className="border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-5 sm:p-6 space-y-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                    <div>
                      <h2 className="text-lg font-bold">¿Estás seguro de enviar este pronóstico?</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        No podrás cambiarlo después. Revisa bien antes de confirmar.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Usuario:</span>{' '}
                      <strong>{participant?.fullName ?? participantCode}</strong>
                      {participantCode && (
                        <span className="text-muted-foreground"> ({participantCode})</span>
                      )}
                    </p>
                    <ScorePreview
                      mexicoScore={mexicoGoals}
                      czechScore={czechGoals}
                      mexicoFlag={mexicoFlag}
                      czechFlag={czechFlag}
                    />
                    {(mexicoScorers.length > 0 || czechScorers.length > 0) && (
                      <div className="grid sm:grid-cols-2 gap-3 text-sm border-t pt-3">
                        {mexicoScorers.length > 0 && (
                          <div>
                            <p className="font-medium text-leaf-darker mb-1">Goleadores 🇲🇽</p>
                            <ul className="text-muted-foreground">
                              {mexicoScorers.map((s, i) => (
                                <li key={i}>· {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {czechScorers.length > 0 && (
                          <div>
                            <p className="font-medium mb-1">Goleadores 🇨🇿</p>
                            <ul className="text-muted-foreground">
                              {czechScorers.map((s, i) => (
                                <li key={i}>· {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep('form')} disabled={submitting}>
                      Volver a editar
                    </Button>
                    <Button
                      className="flex-1 bg-leaf-dark hover:bg-leaf-darker text-white"
                      onClick={submitPrediction}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, enviar pronóstico'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {step === 'success' && existingPrediction && (
            <FadeIn>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Card className="border-leaf bg-leaf/10">
                  <CardContent className="p-6 text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-leaf mx-auto" />
                    <h2 className="text-xl font-bold text-leaf-darker">¡Pronóstico registrado!</h2>
                    <p className="text-sm text-muted-foreground">
                      Ya quedó guardado. Ahora solo queda esperar el partido del miércoles. ¡Vamos México! 🇲🇽
                    </p>
                    <ExistingPredictionCard prediction={existingPrediction} match={match} />
                  </CardContent>
                </Card>
              </motion.div>
            </FadeIn>
          )}

          {isClosed && !existingPrediction && (
            <FadeIn>
              <Card>
                <CardContent className="p-6 text-center space-y-2">
                  <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
                  <h2 className="font-semibold">Pronósticos cerrados</h2>
                  <p className="text-sm text-muted-foreground">
                    La fecha límite fue el {match.deadlineLabel}. Ya no se aceptan más pronósticos.
                  </p>
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </div>
      </PageTransition>

      <ParticipantLookupModal
        open={lookupOpen}
        onOpenChange={setLookupOpen}
        onSelect={handleParticipantSelect}
      />
    </PublicLayout>
  );
}
