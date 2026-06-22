import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OptionalScorersFieldProps {
  teamLabel: string;
  maxGoals: number;
  players: string[];
  scorers: string[];
  onChange: (scorers: string[]) => void;
  accentClass?: string;
}

export function OptionalScorersField({
  teamLabel,
  maxGoals,
  players,
  scorers,
  onChange,
  accentClass,
}: OptionalScorersFieldProps) {
  if (maxGoals <= 0) return null;

  const filledCount = scorers.filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div>
        <p className={`text-sm font-medium ${accentClass ?? ''}`}>
          Goleadores de {teamLabel}{' '}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pon solo los que quieras — ninguno, uno, o hasta {maxGoals}. Cada quien con su nivel de
          precisión.
        </p>
      </div>

      {scorers.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {scorers.map((scorer, i) => (
            <div key={`${teamLabel}-${i}`} className="flex gap-2">
              <Select
                value={scorer || undefined}
                onValueChange={(v) =>
                  onChange(scorers.map((s, idx) => (idx === i ? v : s)))
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={`Goleador ${i + 1}`} />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={`${i}-${player}`} value={player}>
                      {player}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onChange(scorers.filter((_, idx) => idx !== i))}
                aria-label="Quitar goleador"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {scorers.length < maxGoals && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...scorers, ''])}
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar goleador{filledCount > 0 ? '' : ' (si quieres)'}
        </Button>
      )}
    </div>
  );
}

export function trimScorers(scorers: string[]) {
  return scorers.map((s) => s.trim()).filter(Boolean);
}
