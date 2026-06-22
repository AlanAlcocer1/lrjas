import type { TeamRoster } from '@/types';

const POSITION_LABELS: Record<string, string> = {
  PORTEROS: 'Porteros',
  DEFENSAS: 'Defensas',
  MEDIOCAMPISTAS: 'Mediocampistas',
  DELANTEROS: 'Delanteros',
};

interface TeamRosterCardProps {
  team: TeamRoster;
  flagSrc: string;
  accentClass?: string;
}

export function TeamRosterCard({ team, flagSrc, accentClass = 'border-leaf/30' }: TeamRosterCardProps) {
  return (
    <section className={`rounded-2xl border bg-card/80 backdrop-blur-sm overflow-hidden ${accentClass}`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-leaf/15 to-transparent border-b border-border/60">
        <img src={flagSrc} alt={`Bandera ${team.name}`} className="h-10 w-14 object-cover rounded-md shadow-sm" />
        <div>
          <h2 className="font-bold text-base sm:text-lg leading-tight">
            {team.name} {team.emoji}
          </h2>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {Object.entries(team.players).map(([position, players]) => (
          <div key={position}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-leaf-darker mb-2">
              {POSITION_LABELS[position] ?? position}
            </h3>
            <ul className="space-y-1">
              {players.map((player) => (
                <li key={player} className="text-sm text-foreground/90 pl-1">
                  · {player}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function teamFlagSrc(flagFile: string) {
  const base = import.meta.env.BASE_URL;
  return `${base}images/${flagFile}`;
}
