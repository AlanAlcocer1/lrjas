import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/attendance.dto';
import {
  getMexicoDayBounds,
  getMexicoDayBoundsFromKey,
  getMexicoWeekBounds,
  getMexicoMonthBounds,
  hora_mexico,
  fecha_mexico,
  mexicoDateKey,
  parseMexicoDate,
} from '../../common/mexico-time';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private formatFullName(participant: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    motherLastName: string;
  }) {
    return [participant.firstName, participant.middleName, participant.lastName, participant.motherLastName]
      .filter(Boolean)
      .join(' ');
  }

  async register(dto: CreateAttendanceDto) {
    const code = dto.code.padStart(3, '0');
    const participant = await this.prisma.participant.findUnique({
      where: { code },
      include: { stake: true, ward: true },
    });

    if (!participant) throw new NotFoundException('Usuario no encontrado');
    if (!participant.active) throw new BadRequestException('Usuario inactivo');

    const { start, end } = getMexicoDayBounds();

    const existingToday = await this.prisma.attendance.findFirst({
      where: {
        participantId: participant.id,
        createdAt: { gte: start, lt: end },
      },
    });

    if (existingToday) {
      return {
        alreadyRegistered: true,
        message: 'Usuario ya cuenta con asistencia el día de hoy',
        participant: {
          id: participant.id,
          code: participant.code,
          fullName: this.formatFullName(participant),
        },
        attendance: existingToday,
      };
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        participantId: participant.id,
        method: dto.method,
      },
    });

    return {
      alreadyRegistered: false,
      participant: {
        id: participant.id,
        code: participant.code,
        fullName: this.formatFullName(participant),
      },
      attendance,
    };
  }

  async getHistory(participantId: string) {
    return this.prisma.attendance.findMany({
      where: { participantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTodayList() {
    return this.getRangeList('day', mexicoDateKey());
  }

  async getRangeList(period: 'day' | 'week' | 'month', dateStr?: string) {
    const refDate = dateStr ? parseMexicoDate(dateStr) : new Date();
    const dayKey = dateStr ?? mexicoDateKey();

    let bounds: { start: Date; end: Date };
    let periodLabel: string;
    let filterDayKey: string | null = null;

    switch (period) {
      case 'week':
        bounds = getMexicoWeekBounds(refDate);
        periodLabel = `Semana del ${fecha_mexico(bounds.start)} al ${fecha_mexico(new Date(bounds.end.getTime() - 1))}`;
        break;
      case 'month':
        bounds = getMexicoMonthBounds(refDate);
        periodLabel = new Date(refDate).toLocaleDateString('es-MX', {
          timeZone: 'America/Mexico_City',
          month: 'long',
          year: 'numeric',
        });
        break;
      default:
        filterDayKey = dayKey;
        periodLabel = fecha_mexico(parseMexicoDate(dayKey));
        bounds = getMexicoDayBoundsFromKey(dayKey);
        bounds = {
          start: new Date(bounds.start.getTime() - 6 * 3600000),
          end: new Date(bounds.end.getTime() + 6 * 3600000),
        };
        break;
    }

    let attendances = await this.prisma.attendance.findMany({
      where: { createdAt: { gte: bounds.start, lt: bounds.end } },
      orderBy: { createdAt: 'asc' },
      include: {
        participant: {
          include: {
            stake: true,
            ward: true,
            fieldValues: { include: { field: true } },
          },
        },
      },
    });

    if (filterDayKey) {
      attendances = attendances.filter((a) => mexicoDateKey(a.createdAt) === filterDayKey);
    }

    return {
      period,
      date: periodLabel,
      dateKey: period === 'day' ? dayKey : (dateStr ?? mexicoDateKey(refDate)),
      total: attendances.length,
      items: attendances.map((a) => ({
        id: a.id,
        method: a.method,
        createdAt: a.createdAt,
        dateMexico: mexicoDateKey(a.createdAt),
        timeMexico: hora_mexico(a.createdAt),
        participant: {
          code: a.participant.code,
          fullName: this.formatFullName(a.participant),
          stake: a.participant.stake.name,
          ward: a.participant.ward.name,
          dynamicFields: a.participant.fieldValues?.reduce(
            (acc, fv) => ({ ...acc, [fv.field.name]: fv.value }),
            {} as Record<string, boolean>,
          ),
        },
      })),
    };
  }
}
