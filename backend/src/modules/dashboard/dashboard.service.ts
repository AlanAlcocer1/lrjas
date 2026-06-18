import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  eachMexicoDateKey,
  getMexicoDayBoundsFromKey,
  getMexicoMonthBounds,
  mexicoDateKey,
  registrationBoundsFromMexicoRange,
} from '../../common/mexico-time';

export interface DashboardDateRange {
  from: string;
  to: string;
}

@Injectable()
export class DashboardService {
  private dateMexicoColumn: boolean | null = null;

  constructor(private prisma: PrismaService) {}

  async getStats(from?: string, to?: string) {
    if ((from && !to) || (!from && to)) {
      throw new BadRequestException('Debes enviar from y to juntos (YYYY-MM-DD)');
    }
    if (from && to && from > to) {
      throw new BadRequestException('La fecha inicial no puede ser posterior a la final');
    }

    if (from && to) {
      return this.getStatsForRange({ from, to });
    }

    return this.getDefaultStats();
  }

  private async usesDateMexico(): Promise<boolean> {
    if (this.dateMexicoColumn !== null) return this.dateMexicoColumn;

    try {
      const cols = await this.prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'attendances'
          AND column_name = 'date_mexico'
      `;
      this.dateMexicoColumn = cols.length > 0;
    } catch {
      this.dateMexicoColumn = false;
    }

    return this.dateMexicoColumn;
  }

  private attendanceCountWhere(from: string, to: string, hasDateMexico: boolean): Prisma.AttendanceWhereInput {
    if (hasDateMexico) {
      return { dateMexico: { gte: from, lte: to } };
    }
    const { start, end } = registrationBoundsFromMexicoRange(from, to);
    return { createdAt: { gte: start, lt: end } };
  }

  private attendedInPeriodWhere(
    from: string,
    to: string,
    hasDateMexico: boolean,
  ): Prisma.ParticipantWhereInput {
    if (hasDateMexico) {
      return {
        active: true,
        attendances: { some: { dateMexico: { gte: from, lte: to } } },
      };
    }
    const { start, end } = registrationBoundsFromMexicoRange(from, to);
    return {
      active: true,
      attendances: { some: { createdAt: { gte: start, lt: end } } },
    };
  }

  private mexicoDateKeyDaysAgo(days: number): string {
    const todayKey = mexicoDateKey();
    const [y, m, d] = todayKey.split('-').map(Number);
    return mexicoDateKey(new Date(Date.UTC(y, m - 1, d - days, 12, 0, 0)));
  }

  private monthDateRange(ref: Date): { from: string; to: string } {
    const { start, end } = getMexicoMonthBounds(ref);
    const from = mexicoDateKey(start);
    const to = mexicoDateKey(new Date(end.getTime() - 86_400_000));
    return { from, to };
  }

  private async getDefaultStats() {
    const hasDateMexico = await this.usesDateMexico();
    const { start: monthStart, end: monthEnd } = getMexicoMonthBounds();
    const thirtyDaysFrom = this.mexicoDateKeyDaysAgo(30);
    const today = mexicoDateKey();
    const attendedWhere = this.attendedInPeriodWhere(thirtyDaysFrom, today, hasDateMexico);

    const [
      totalParticipants,
      totalAttendances,
      newThisMonth,
      activeParticipants,
      sexDistribution,
      stakeDistribution,
      monthlyAttendances,
      monthlyRegistrations,
      fieldDistributions,
      ageDistribution,
    ] = await Promise.all([
      this.prisma.participant.count({ where: { active: true } }),
      this.prisma.attendance.count(),
      this.prisma.participant.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.participant.count({ where: attendedWhere }),
      this.prisma.participant.groupBy({
        by: ['sex'],
        _count: { id: true },
        where: { active: true },
      }),
      this.prisma.participant.groupBy({
        by: ['stakeId'],
        _count: { id: true },
        where: { active: true },
      }),
      this.getMonthlyAttendances(hasDateMexico),
      this.getMonthlyRegistrations(),
      this.getFieldDistributions(),
      this.getAgeDistribution({ active: true }),
    ]);

    const stakes = await this.prisma.stake.findMany();
    const stakeMap = Object.fromEntries(stakes.map((s) => [s.id, s.name]));

    return {
      period: null,
      kpis: {
        totalParticipants,
        totalAttendances,
        newThisMonth,
        activeParticipants,
      },
      charts: {
        monthlyAttendances,
        monthlyRegistrations,
        sexDistribution: sexDistribution.map((s) => ({
          sex: s.sex === 'MALE' ? 'Masculino' : 'Femenino',
          count: s._count.id,
        })),
        stakeDistribution: stakeDistribution.map((s) => ({
          stake: stakeMap[s.stakeId] || 'Desconocida',
          count: s._count.id,
        })),
        fieldDistributions,
        ageDistribution,
      },
    };
  }

  private async getStatsForRange(range: DashboardDateRange) {
    const hasDateMexico = await this.usesDateMexico();
    const { start: periodStart, end: periodEnd } = registrationBoundsFromMexicoRange(range.from, range.to);
    const dateKeys = eachMexicoDateKey(range.from, range.to);
    const attendedWhere = this.attendedInPeriodWhere(range.from, range.to, hasDateMexico);
    const attendanceWhere = this.attendanceCountWhere(range.from, range.to, hasDateMexico);

    const [
      totalParticipants,
      totalAttendances,
      newInPeriod,
      attendedInPeriod,
      sexDistribution,
      stakeDistribution,
      periodAttendances,
      periodRegistrations,
      fieldDistributions,
      ageDistribution,
    ] = await Promise.all([
      this.prisma.participant.count({ where: { active: true } }),
      this.prisma.attendance.count({ where: attendanceWhere }),
      this.prisma.participant.count({
        where: { createdAt: { gte: periodStart, lt: periodEnd } },
      }),
      this.prisma.participant.count({ where: attendedWhere }),
      this.prisma.participant.groupBy({
        by: ['sex'],
        _count: { id: true },
        where: attendedWhere,
      }),
      this.prisma.participant.groupBy({
        by: ['stakeId'],
        _count: { id: true },
        where: attendedWhere,
      }),
      this.getPeriodAttendances(dateKeys, range, hasDateMexico, periodStart, periodEnd),
      this.getPeriodRegistrations(dateKeys, range),
      this.getFieldDistributions(attendedWhere),
      this.getAgeDistribution(attendedWhere),
    ]);

    const stakes = await this.prisma.stake.findMany();
    const stakeMap = Object.fromEntries(stakes.map((s) => [s.id, s.name]));

    return {
      period: range,
      kpis: {
        totalParticipants,
        totalAttendances,
        newThisMonth: newInPeriod,
        activeParticipants: attendedInPeriod,
      },
      charts: {
        monthlyAttendances: periodAttendances,
        monthlyRegistrations: periodRegistrations,
        sexDistribution: sexDistribution.map((s) => ({
          sex: s.sex === 'MALE' ? 'Masculino' : 'Femenino',
          count: s._count.id,
        })),
        stakeDistribution: stakeDistribution.map((s) => ({
          stake: stakeMap[s.stakeId] || 'Desconocida',
          count: s._count.id,
        })),
        fieldDistributions,
        ageDistribution,
      },
    };
  }

  private async getAgeDistribution(where: Prisma.ParticipantWhereInput) {
    const participants = await this.prisma.participant.findMany({
      where,
      select: { age: true },
    });

    const buckets = [
      { range: '18-20', min: 18, max: 20 },
      { range: '20-25', min: 21, max: 25 },
      { range: '25-30', min: 26, max: 30 },
      { range: '30-35', min: 31, max: 35 },
    ];

    return buckets.map(({ range, min, max }) => ({
      range,
      count: participants.filter((p) => p.age >= min && p.age <= max).length,
    }));
  }

  private async getFieldDistributions(participantFilter: Prisma.ParticipantWhereInput = { active: true }) {
    const fields = await this.prisma.fieldDefinition.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });

    if (fields.length === 0) return [];

    const counts = await this.prisma.participantFieldValue.groupBy({
      by: ['fieldId', 'value'],
      _count: { id: true },
      where: {
        fieldId: { in: fields.map((f) => f.id) },
        participant: participantFilter,
      },
    });

    const countMap = new Map<string, { yes: number; no: number }>();
    for (const field of fields) {
      countMap.set(field.id, { yes: 0, no: 0 });
    }
    for (const entry of counts) {
      const bucket = countMap.get(entry.fieldId);
      if (!bucket) continue;
      if (entry.value) bucket.yes = entry._count.id;
      else bucket.no = entry._count.id;
    }

    return fields.map((field) => {
      const bucket = countMap.get(field.id) ?? { yes: 0, no: 0 };
      return {
        fieldName: field.name,
        label: field.label,
        data: [
          { label: 'Sí', count: bucket.yes },
          { label: 'No', count: bucket.no },
        ],
      };
    });
  }

  private async countAttendancesForDay(key: string, hasDateMexico: boolean): Promise<number> {
    if (hasDateMexico) {
      return this.prisma.attendance.count({ where: { dateMexico: key } });
    }
    const { start, end } = getMexicoDayBoundsFromKey(key);
    return this.prisma.attendance.count({ where: { createdAt: { gte: start, lt: end } } });
  }

  private async getMonthlyAttendances(hasDateMexico: boolean) {
    const months: { month: string; count: number }[] = [];
    const todayKey = mexicoDateKey();
    const [ty, tm] = todayKey.split('-').map(Number);

    for (let i = 5; i >= 0; i--) {
      const ref = new Date(Date.UTC(ty, tm - 1 - i, 15, 12, 0, 0));
      const { from, to } = this.monthDateRange(ref);
      const count = await this.prisma.attendance.count({
        where: this.attendanceCountWhere(from, to, hasDateMexico),
      });
      months.push({
        month: parseMexicoDateKeyToMonth(from),
        count,
      });
    }

    return months;
  }

  private async getMonthlyRegistrations() {
    const months: { month: string; count: number }[] = [];
    const todayKey = mexicoDateKey();
    const [ty, tm] = todayKey.split('-').map(Number);

    for (let i = 5; i >= 0; i--) {
      const ref = new Date(Date.UTC(ty, tm - 1 - i, 15, 12, 0, 0));
      const { start, end } = getMexicoMonthBounds(ref);
      const count = await this.prisma.participant.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      months.push({
        month: parseMexicoDateKeyToMonth(mexicoDateKey(start)),
        count,
      });
    }

    return months;
  }

  private async getPeriodAttendances(
    dateKeys: string[],
    range: DashboardDateRange,
    hasDateMexico: boolean,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const useDaily = dateKeys.length <= 31;

    if (useDaily) {
      const rows = await Promise.all(
        dateKeys.map(async (key) => {
          const count = await this.countAttendancesForDay(key, hasDateMexico);
          const [, m, d] = key.split('-');
          return { month: `${d}/${m}`, count };
        }),
      );
      return rows;
    }

    if (hasDateMexico) {
      const grouped = await this.prisma.attendance.groupBy({
        by: ['dateMexico'],
        _count: { id: true },
        where: { dateMexico: { gte: range.from, lte: range.to } },
      });

      const buckets = new Map<string, number>();
      for (const key of dateKeys) {
        buckets.set(parseMexicoDateKeyToMonth(key), 0);
      }
      for (const row of grouped) {
        const monthLabel = parseMexicoDateKeyToMonth(row.dateMexico);
        buckets.set(monthLabel, (buckets.get(monthLabel) ?? 0) + row._count.id);
      }

      const order = [...new Set(dateKeys.map(parseMexicoDateKeyToMonth))];
      return order.map((month) => ({ month, count: buckets.get(month) ?? 0 }));
    }

    const attendances = await this.prisma.attendance.findMany({
      where: { createdAt: { gte: periodStart, lt: periodEnd } },
      select: { createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (const key of dateKeys) {
      buckets.set(parseMexicoDateKeyToMonth(key), 0);
    }
    for (const a of attendances) {
      const monthLabel = parseMexicoDateKeyToMonth(mexicoDateKey(a.createdAt));
      buckets.set(monthLabel, (buckets.get(monthLabel) ?? 0) + 1);
    }

    const order = [...new Set(dateKeys.map(parseMexicoDateKeyToMonth))];
    return order.map((month) => ({ month, count: buckets.get(month) ?? 0 }));
  }

  private async getPeriodRegistrations(dateKeys: string[], range: DashboardDateRange) {
    const useDaily = dateKeys.length <= 31;
    const { start: regStart, end: regEnd } = registrationBoundsFromMexicoRange(range.from, range.to);

    if (useDaily) {
      const rows = await Promise.all(
        dateKeys.map(async (key) => {
          const { start, end } = getMexicoDayBoundsFromKey(key);
          const count = await this.prisma.participant.count({
            where: { createdAt: { gte: start, lt: end } },
          });
          const [, m, d] = key.split('-');
          return { month: `${d}/${m}`, count };
        }),
      );
      return rows;
    }

    const participants = await this.prisma.participant.findMany({
      where: { createdAt: { gte: regStart, lt: regEnd } },
      select: { createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (const key of dateKeys) {
      buckets.set(parseMexicoDateKeyToMonth(key), 0);
    }
    for (const p of participants) {
      const monthLabel = parseMexicoDateKeyToMonth(mexicoDateKey(p.createdAt));
      buckets.set(monthLabel, (buckets.get(monthLabel) ?? 0) + 1);
    }

    return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
  }
}

function parseMexicoDateKeyToMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1, 12, 0, 0));
  return date.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
}
