import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { predictionsApi, getApiErrorMessage } from '@/services/api';
import { formatDate, formatTime } from '@/lib/utils';
import type { MatchInfo, Prediction } from '@/types';

function flatPlayers(team: MatchInfo['mexico']) {
  return Object.values(team.players).flat();
}

export default function PronosticosPage() {
  const { user } = useAuth();
  const canManage = !!user?.pronosticoManager;

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [mexicoScore, setMexicoScore] = useState('0');
  const [czechScore, setCzechScore] = useState('0');
  const [mexicoScorers, setMexicoScorers] = useState<string[]>([]);
  const [czechScorers, setCzechScorers] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([predictionsApi.getAllAdmin(), predictionsApi.getMatch()])
      .then(([items, matchInfo]) => {
        setPredictions(items);
        setMatch(matchInfo);
      })
      .catch(() => toast.error('No se pudieron cargar los pronósticos'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

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

  const filtered = predictions.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.participantCode.toLowerCase().includes(q) ||
      p.participantName.toLowerCase().includes(q)
    );
  });

  const openEdit = (prediction: Prediction) => {
    setEditing(prediction);
    setMexicoScore(String(prediction.mexicoScore));
    setCzechScore(String(prediction.czechScore));
    setMexicoScorers([...prediction.mexicoScorers]);
    setCzechScorers([...prediction.czechScorers]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (mexicoScorers.some((s) => !s) || czechScorers.some((s) => !s)) {
      toast.error('Selecciona todos los goleadores');
      return;
    }

    setSubmitting(true);
    try {
      await predictionsApi.update(editing.id, {
        mexicoScore: mexicoGoals,
        czechScore: czechGoals,
        mexicoScorers,
        czechScorers,
      });
      toast.success('Pronóstico actualizado');
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (prediction: Prediction) => {
    if (!confirm(`¿Eliminar el pronóstico de ${prediction.participantName}?`)) return;
    try {
      await predictionsApi.remove(prediction.id);
      toast.success('Pronóstico eliminado');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo eliminar'));
    }
  };

  return (
    <AdminLayout>
      <PageTransition>
        <FadeIn>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-leaf-dark mb-2">
                  <Trophy className="h-5 w-5" />
                  <span className="text-sm font-medium">Mundial 2026</span>
                </div>
                <h1 className="text-2xl font-bold">Pronósticos</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {match?.title ?? 'México vs República Checa'} — {predictions.length} enviados
                  {match && (
                    <span className="block">
                      Fecha límite: {match.deadlineLabel}
                      {match.deadlinePassed ? ' (cerrado)' : ' (abierto)'}
                    </span>
                  )}
                </p>
              </div>
              {!canManage && (
                <Badge variant="outline" className="w-fit">
                  Solo lectura — edición para usuarios 000 y 001
                </Badge>
              )}
            </div>

            <Input
              placeholder="Buscar por código o nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {search ? 'Sin resultados para esa búsqueda' : 'Aún no hay pronósticos'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((p) => (
                  <Card key={p.id} className="overflow-hidden">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold truncate">{p.participantName}</p>
                            <Badge variant="outline">{p.participantCode}</Badge>
                          </div>
                          <p className="text-2xl font-black text-leaf-darker">
                            🇲🇽 {p.mexicoScore} — {p.czechScore} 🇨🇿
                          </p>
                          {(p.mexicoScorers.length > 0 || p.czechScorers.length > 0) && (
                            <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              {p.mexicoScorers.length > 0 && (
                                <p>
                                  <span className="font-medium text-foreground">México:</span>{' '}
                                  {p.mexicoScorers.join(', ')}
                                </p>
                              )}
                              {p.czechScorers.length > 0 && (
                                <p>
                                  <span className="font-medium text-foreground">Chequia:</span>{' '}
                                  {p.czechScorers.join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Enviado {formatDate(p.createdAt)} a las {formatTime(p.createdAt)}
                          </p>
                        </div>
                        {canManage && (
                          <div className="flex gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(p)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </FadeIn>
      </PageTransition>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar pronóstico</DialogTitle>
            <DialogDescription>
              {editing?.participantName} ({editing?.participantCode})
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-2">
              <Label>México</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={mexicoScore}
                onChange={(e) => setMexicoScore(e.target.value)}
                className="text-center text-xl font-bold"
              />
            </div>
            <span className="pb-2 font-bold text-muted-foreground">—</span>
            <div className="space-y-2">
              <Label>Chequia</Label>
              <Input
                type="number"
                min={0}
                max={20}
                value={czechScore}
                onChange={(e) => setCzechScore(e.target.value)}
                className="text-center text-xl font-bold"
              />
            </div>
          </div>

          {mexicoGoals > 0 && (
            <div className="space-y-2">
              <Label>Goleadores México ({mexicoGoals})</Label>
              {mexicoScorers.map((scorer, i) => (
                <Select
                  key={`emx-${i}`}
                  value={scorer || undefined}
                  onValueChange={(v) =>
                    setMexicoScorers((prev) => prev.map((s, idx) => (idx === i ? v : s)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Gol ${i + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {mexicoPlayerList.map((player) => (
                      <SelectItem key={`${i}-${player}`} value={player}>
                        {player}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}

          {czechGoals > 0 && (
            <div className="space-y-2">
              <Label>Goleadores Chequia ({czechGoals})</Label>
              {czechScorers.map((scorer, i) => (
                <Select
                  key={`ecz-${i}`}
                  value={scorer || undefined}
                  onValueChange={(v) =>
                    setCzechScorers((prev) => prev.map((s, idx) => (idx === i ? v : s)))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Gol ${i + 1}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {czechPlayerList.map((player) => (
                      <SelectItem key={`${i}-${player}`} value={player}>
                        {player}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
