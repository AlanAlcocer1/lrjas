import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { CredentialCard } from '@/components/credential/CredentialCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { participantsApi } from '@/services/api';
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

            {participant && <CredentialCard participant={participant} />}
          </div>
        </FadeIn>
      </PageTransition>
    </PublicLayout>
  );
}
