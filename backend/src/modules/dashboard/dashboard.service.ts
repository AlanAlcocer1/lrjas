import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  eachMexicoDateKey,
  mexicoDateKey,
  registrationBoundsFromMexicoRange,
} from '../../common/mexico-time';

export interface DashboardDateRange {
  from: string;
  to: string;
}

@Injectable()
export class DashboardService {
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

  private async getDefaultStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.participant.count({
        where: {
          active: true,
          attendances: { some: { createdAt: { gte: thirtyDaysAgo } } },
        },
      }),
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
      this.getMonthlyAttendances(),
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
    const { start: regStart, end: regEnd } = registrationBoundsFromMexicoRange(range.from, range.to);
    const dateKeys = eachMexicoDateKey(range.from, range.to);

    const [
      totalParticipants,
      totalAttendances,
      newInPeriod,
      activeInPeriod,
      sexDistribution,
      stakeDistribution,
      periodAttendances,
      periodRegistrations,
      fieldDistributions,
      ageDistribution,
    ] = await Promise.all([
      this.prisma.participant.count({ where: { active: true } }),
      this.prisma.attendance.count({
        where: { dateMexico: { gte: range.from, lte: range.to } },
      }),
      this.prisma.participant.count({
        where: { createdAt: { gte: regStart, lt: regEnd } },
      }),
      this.prisma.participant.count({
        where: {
          active: true,
          attendances: { some: { dateMexico: { gte: range.from, lte: range.to } } },
        },
      }),
      this.prisma.participant.groupBy({
        by: ['sex'],
        _count: { id: true },
        where: { active: true, createdAt: { gte: regStart, lt: regEnd } },
      }),
      this.prisma.participant.groupBy({
        by: ['stakeId'],
        _count: { id: true },
        where: { active: true, createdAt: { gte: regStart, lt: regEnd } },
      }),
      this.getPeriodAttendances(dateKeys),
      this.getPeriodRegistrations(dateKeys, range),
      this.getFieldDistributions({ regStart, regEnd }),
      this.getAgeDistribution({
        active: true,
        createdAt: { gte: regStart, lt: regEnd },
      }),
    ]);

    const stakes = await this.prisma.stake.findMany();
    const stakeMap = Object.fromEntries(stakes.map((s) => [s.id, s.name]));

    return {
      period: range,
      kpis: {
        totalParticipants,
        totalAttendances,
        newThisMonth: newInPeriod,
        activeParticipants: activeInPeriod,
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

  private async getAgeDistribution(where: { active?: boolean; createdAt?: { gte: Date; lt: Date } }) {
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

  private async getFieldDistributions(range?: { regStart: Date; regEnd: Date }) {
    const fields = await this.prisma.fieldDefinition.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });

    if (fields.length === 0) return [];

    const participantFilter = range
      ? { active: true, createdAt: { gte: range.regStart, lt: range.regEnd } }
      : { active: true };

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

  private async getMonthlyAttendances() {
    const months: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await this.prisma.attendance.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      months.push({
        month: start.toLocaleDateString('es-MX', { month: 'short' }),
        count,
      });
    }

    return months;
  }

  private async getMonthlyRegistrations() {
    const months: { month: string; count: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await this.prisma.participant.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      months.push({
        month: start.toLocaleDateString('es-MX', { month: 'short' }),
        count,
      });
    }

    return months;
  }

  private async getPeriodAttendances(dateKeys: string[]) {
    const useDaily = dateKeys.length <= 31;
    if (useDaily) {
      const rows = await Promise.all(
        dateKeys.map(async (key) => {
          const count = await this.prisma.attendance.count({ where: { dateMexico: key } });
          const [, m, d] = key.split('-');
          return { month: `${d}/${m}`, count };
        }),
      );
      return rows;
    }

    const buckets = new Map<string, number>();
    const grouped = await this.prisma.attendance.groupBy({
      by: ['dateMexico'],
      _count: { id: true },
      where: { dateMexico: { in: dateKeys } },
    });

    for (const row of grouped) {
      const monthLabel = parseMexicoDateKeyToMonth(row.dateMexico);
      buckets.set(monthLabel, (buckets.get(monthLabel) ?? 0) + row._count.id);
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
          const { start, end } = registrationBoundsFromMexicoRange(key, key);
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
      const key = mexicoDateKey(p.createdAt);
      const monthLabel = parseMexicoDateKeyToMonth(key);
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
