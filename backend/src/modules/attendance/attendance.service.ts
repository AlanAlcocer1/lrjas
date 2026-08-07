import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/attendance.dto';
import {
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

  private alreadyRegisteredResponse(
    participant: { id: string; code: string; firstName: string; middleName: string | null; lastName: string; motherLastName: string },
    attendance: { id: string; method: string; createdAt: Date },
  ) {
    return {
      alreadyRegistered: true,
      message: 'Usuario ya cuenta con asistencia el día de hoy',
      participant: {
        id: participant.id,
        code: participant.code,
        fullName: this.formatFullName(participant),
      },
      attendance,
    };
  }

  async register(dto: CreateAttendanceDto) {
    const code = dto.code.padStart(3, '0');
    const participant = await this.prisma.participant.findUnique({
      where: { code },
      include: { stake: true, ward: true },
    });

    if (!participant) throw new NotFoundException('Usuario no encontrado');
    if (!participant.active) throw new BadRequestException('Usuario inactivo');

    const todayKey = mexicoDateKey();

    const existingToday = await this.prisma.attendance.findUnique({
      where: {
        participantId_dateMexico: {
          participantId: participant.id,
          dateMexico: todayKey,
        },
      },
    });

    if (existingToday) {
      return this.alreadyRegisteredResponse(participant, existingToday);
    }

    try {
      const attendance = await this.prisma.attendance.create({
        data: {
          participantId: participant.id,
          method: dto.method,
          dateMexico: todayKey,
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await this.prisma.attendance.findUnique({
          where: {
            participantId_dateMexico: {
              participantId: participant.id,
              dateMexico: todayKey,
            },
          },
        });
        if (duplicate) return this.alreadyRegisteredResponse(participant, duplicate);
      }
      throw error;
    }
  }

  async getHistory(participantId: string) {
    return this.prisma.attendance.findMany({
      where: { participantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    const attendance = await this.prisma.attendance.findUnique({ where: { id } });
    if (!attendance) throw new NotFoundException('Asistencia no encontrada');
    await this.prisma.attendance.delete({ where: { id } });
    return { ok: true };
  }

  async getTodayList() {
    return this.getRangeList('day', mexicoDateKey());
  }

  async getRangeList(period: 'day' | 'week' | 'month', dateStr?: string) {
    const refDate = dateStr ? parseMexicoDate(dateStr) : new Date();
    const dayKey = dateStr ?? mexicoDateKey();

    let where: Prisma.AttendanceWhereInput;
    let periodLabel: string;

    switch (period) {
      case 'week': {
        const bounds = getMexicoWeekBounds(refDate);
        where = { createdAt: { gte: bounds.start, lt: bounds.end } };
        periodLabel = `Semana del ${fecha_mexico(bounds.start)} al ${fecha_mexico(new Date(bounds.end.getTime() - 1))}`;
        break;
      }
      case 'month': {
        const bounds = getMexicoMonthBounds(refDate);
        where = { createdAt: { gte: bounds.start, lt: bounds.end } };
        periodLabel = new Date(refDate).toLocaleDateString('es-MX', {
          timeZone: 'America/Mexico_City',
          month: 'long',
          year: 'numeric',
        });
        break;
      }
      default:
        where = { dateMexico: dayKey };
        periodLabel = fecha_mexico(parseMexicoDate(dayKey));
        break;
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
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

    return {
      period,
      date: periodLabel,
      dateKey: period === 'day' ? dayKey : (dateStr ?? mexicoDateKey(refDate)),
      total: attendances.length,
      items: attendances.map((a) => ({
        id: a.id,
        method: a.method,
        createdAt: a.createdAt,
        dateMexico: a.dateMexico,
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
