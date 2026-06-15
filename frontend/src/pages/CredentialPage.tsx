import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Search, CalendarCheck, ScanLine, Hash, User } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { CredentialCard } from '@/components/credential/CredentialCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { participantsApi } from '@/services/api';
import { formatDate, formatTime } from '@/lib/utils';
import type { CredentialLookupOption, Participant } from '@/types';

export default function CredentialPage() {
  const location = useLocation();
  const initialQuery = (location.state as { code?: string })?.code || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [matchOptions, setMatchOptions] = useState<CredentialLookupOption[]>([]);
  const [loading, setLoading] = useState(false);

  const loadParticipant = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setMatchOptions([]);
    try {
      const result = await participantsApi.lookupCredential(trimmed);
      if (result.match === 'single') {
        setParticipant(result.participant);
      } else {
        setParticipant(null);
        setMatchOptions(result.options);
      }
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message === 'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Usuario no encontrado';
      toast.error(message);
      setParticipant(null);
      setMatchOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const selectMatch = async (code: string) => {
    setLoading(true);
    setMatchOptions([]);
    try {
      setParticipant(await participantsApi.getByCode(code));
    } catch {
      toast.error('No se pudo cargar la credencial');
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) loadParticipant(initialQuery);
  }, [initialQuery]);

  const handleSearch = () => {
    setParticipant(null);
    loadParticipant(searchQuery);
  };

  return (
    <PublicLayout>
      <PageTransition>
        <FadeIn>
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Mi credencial</h1>
              <p className="text-sm text-muted-foreground">
                Busca por código o por nombre para ver tu credencial, tomarle captura o descargarla
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Código o nombre completo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="text-base uppercase"
                autoComplete="off"
              />
              <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {matchOptions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Varios resultados — elige tu nombre</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {matchOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => selectMatch(option.code)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/60 hover:bg-muted text-left transition-colors disabled:opacity-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf/10">
                        <User className="h-4 w-4 text-leaf-dark" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{option.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Código {option.code} · {option.stake} · {option.ward}
                        </p>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {participant && (
              <div className="space-y-6">
                <CredentialCard participant={participant} />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-leaf-dark" />
                      Mis asistencias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!participant.attendances?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Aún no tienes asistencias registradas
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {participant.attendances.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/60"
                          >
                            <div>
                              <p className="text-sm font-medium">{formatDate(a.createdAt)}</p>
                              <p className="text-xs text-muted-foreground">{formatTime(a.createdAt)}</p>
                            </div>
                            <Badge variant="outline" className="gap-1 shrink-0">
                              {a.method === 'QR' ? (
                                <ScanLine className="h-3 w-3" />
                              ) : (
                                <Hash className="h-3 w-3" />
                              )}
                              {a.method === 'QR' ? 'QR' : 'Manual'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </FadeIn>
      </PageTransition>
    </PublicLayout>
  );
}
