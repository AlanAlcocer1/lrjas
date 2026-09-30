import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TEAMS: { name: string; color: string }[] = [
  { name: 'Presidencia', color: '#006837' },
  { name: 'Actividades', color: '#84bd31' },
  { name: 'Autosuficiencia', color: '#f59e0b' },
  { name: 'Comunicación', color: '#3b82f6' },
  { name: 'Bienestar', color: '#ec4899' },
  { name: 'Servicio', color: '#8b5cf6' },
  { name: 'Logística', color: '#14b8a6' },
];

/**
 * Solo siembra equipos la primera vez (tabla vacía).
 * Si ya hay equipos, no recrea ni pisa los que el usuario borró/editó.
 */
export async function ensureDefaultTeams(prisma: PrismaService) {
  const count = await prisma.team.count();
  if (count > 0) return;

  await prisma.team.createMany({
    data: DEFAULT_TEAMS.map((team) => ({
      name: team.name,
      color: team.color,
      active: true,
    })),
    skipDuplicates: true,
  });
}
