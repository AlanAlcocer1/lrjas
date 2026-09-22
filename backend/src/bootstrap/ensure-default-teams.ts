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

export async function ensureDefaultTeams(prisma: PrismaService) {
  for (const team of DEFAULT_TEAMS) {
    await prisma.team.upsert({
      where: { name: team.name },
      create: { name: team.name, color: team.color, active: true },
      update: { color: team.color },
    });
  }
}
