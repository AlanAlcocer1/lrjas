import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Search, CalendarCheck, ScanLine, Hash } from 'lucide-react';
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
import type { Participant } from '@/types';

export default function CredentialPage() {
  const location = useLocation();
  const initialCode = (location.state as { code?: string })?.code || '';
  const [searchCode, setSearchCode] = useState(initialCode);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);

  const loadParticipant = async (c: string) => {
    if (!c || c.length < 1) return;
    setLoading(true);
    try {
      setParticipant(await participantsApi.getByCode(c.padStart(3, '0')));
    } catch {
      toast.error('Usuario no encontrado');
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) loadParticipant(initialCode);
  }, [initialCode]);

  const handleSearch = () => loadParticipant(searchCode);

  return (
    <PublicLayout>
      <PageTransition>
        <FadeIn>
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Mi credencial</h1>
              <p className="text-sm text-muted-foreground">
                Consulta tu credencial, tómale captura o descárgala
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ingresa tu código (ej: 123)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono text-lg tracking-widest"
                maxLength={3}
              />
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

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
