import { useState } from 'react';
import { Loader2, Search, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { participantsApi } from '@/services/api';
import type { CredentialLookupOption, Participant } from '@/types';

interface ParticipantLookupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (participant: Participant) => void;
}

export function ParticipantLookupModal({ open, onOpenChange, onSelect }: ParticipantLookupModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchOptions, setMatchOptions] = useState<CredentialLookupOption[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setLoading(true);
    setMatchOptions([]);
    try {
      const result = await participantsApi.lookupCredential(trimmed);
      if (result.match === 'single') {
        onSelect(result.participant);
        onOpenChange(false);
        setSearchQuery('');
      } else {
        setMatchOptions(result.options);
      }
    } catch {
      toast.error('Usuario no encontrado');
      setMatchOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const selectMatch = async (code: string) => {
    setLoading(true);
    setMatchOptions([]);
    try {
      const participant = await participantsApi.getByCode(code);
      onSelect(participant);
      onOpenChange(false);
      setSearchQuery('');
    } catch {
      toast.error('No se pudo cargar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿No sabes tu usuario, chavito?</DialogTitle>
          <DialogDescription>
            Busca por código o por nombre completo, igual que en Mi credencial.
          </DialogDescription>
        </DialogHeader>

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
          <div className="space-y-2 max-h-56 overflow-y-auto">
            <p className="text-sm font-medium">Varios resultados — elige tu nombre</p>
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
                    {option.code} · {option.stake}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
