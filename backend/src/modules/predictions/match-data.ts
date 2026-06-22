export const MATCH_DEADLINE_ISO = '2026-06-24T19:00:00-06:00';

export const MATCH_INFO = {
  title: 'México vs República Checa',
  subtitle: 'Mundial 2026',
  deadlineLabel: 'Miércoles 24 de junio de 2026, 7:00 p.m. (hora de Mérida)',
  mexico: {
    name: 'México',
    flag: 'mexico_bandera.png',
    emoji: '🇲🇽',
    players: {
      PORTEROS: ['Guillermo Ochoa', 'Raúl Rangel', 'Carlos Acevedo'],
      DEFENSAS: [
        'Jorge Sánchez',
        'César Montes',
        'Edson Álvarez',
        'Johan Vásquez',
        'Israel Reyes',
        'Mateo Chávez',
        'Jesús Gallardo',
      ],
      MEDIOCAMPISTAS: [
        'Luis Chávez',
        'Carlos Rodríguez',
        'Erick Lira',
        'Orbelín Pineda',
        'Roberto Alvarado',
        'Érick Sánchez',
        'Gilberto Mora',
        'Obed Vargas',
      ],
      DELANTEROS: [
        'Raúl Jiménez',
        'Santiago Giménez',
        'Alexis Vega',
        'Julián Quiñones',
        'César Huerta',
        'Germán Berterame',
        'Guillermo Martínez',
        'Álvaro Fidalgo',
        'Julián Araujo',
      ],
    },
  },
  czech: {
    name: 'República Checa',
    flag: 'bandera_chequia.png',
    emoji: '🇨🇿',
    players: {
      PORTEROS: ['Lukáš Horníček', 'Matěj Kovář', 'Jindřich Staněk'],
      DEFENSAS: [
        'Vladimír Coufal',
        'David Douděra',
        'Tomáš Holeš',
        'Robin Hranáč',
        'Štěpán Chaloupek',
        'David Jurásek',
        'Ladislav Krejčí',
        'Jaroslav Zelený',
        'David Zima',
      ],
      MEDIOCAMPISTAS: [
        'Lukáš Červ',
        'Vladimír Darida',
        'Lukáš Provod',
        'Michal Sadílek',
        'Hugo Sochůrek',
        'Alexandr Sojka',
        'Tomáš Souček',
        'Pavel Šulc',
        'Denis Višinský',
      ],
      DELANTEROS: ['Adam Hložek', 'Tomáš Chorý', 'Mojmír Chytil', 'Jan Kuchta', 'Patrik Schick'],
    },
  },
} as const;

export function allMexicoPlayers(): string[] {
  return Object.values(MATCH_INFO.mexico.players).flat();
}

export function allCzechPlayers(): string[] {
  return Object.values(MATCH_INFO.czech.players).flat();
}

export function isDeadlinePassed(now = new Date()): boolean {
  return now.getTime() >= new Date(MATCH_DEADLINE_ISO).getTime();
}
