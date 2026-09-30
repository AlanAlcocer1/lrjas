import { Prisma } from '@prisma/client';

/** Actividades que pueden “tocar” el rango [from, to] (incluye multi-día y recurrentes). */
export function activitiesOverlappingRange(
  from?: string,
  to?: string,
): Prisma.ActivityWhereInput {
  if (!from && !to) return {};

  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;

  return {
    AND: [
      ...(toDate ? [{ date: { lte: toDate } }] : []),
      {
        OR: [
          // Sin recurrencia: cae en el rango por date o endDate
          {
            recurrenceType: 'NONE',
            OR: [
              {
                AND: [
                  ...(fromDate ? [{ date: { gte: fromDate } }] : []),
                  ...(toDate ? [{ date: { lte: toDate } }] : []),
                ],
              },
              {
                AND: [
                  { endDate: { not: null } },
                  ...(fromDate ? [{ endDate: { gte: fromDate } }] : []),
                  ...(toDate ? [{ date: { lte: toDate } }] : []),
                ],
              },
            ],
          },
          // Recurrente: empezó antes/durante el rango y no terminó antes de from
          {
            recurrenceType: { not: 'NONE' },
            OR: [
              { recurrenceUntil: null },
              ...(fromDate ? [{ recurrenceUntil: { gte: fromDate } }] : [{}]),
            ],
          },
        ],
      },
    ],
  };
}
