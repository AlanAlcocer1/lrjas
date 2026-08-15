import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/attendance.dto';
import {
  getMexicoWeekBounds,
  hora_mexico,
  fecha_mexico,
  mexicoDateKey,
  parseMexicoDate,
} from '../../common/mexico-time';
import { GENERAL_EVENT_NAME } from '../../bootstrap/ensure-general-event';

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
    participant: {
      id: string;
      code: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
      motherLastName: string;
    },
    attendance: { id: string; method: string; createdAt: Date },
  ) {
    return {
      alreadyRegistered: true,
      message: 'Usuario ya cuenta con asistencia en este evento hoy',
      participant: {
        id: participant.id,
        code: participant.code,
        fullName: this.formatFullName(participant),
      },
      attendance,
    };
  }

  private civilWeekday(dateKey: string): number {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }

  async register(dto: CreateAttendanceDto) {
    const code = dto.code.padStart(3, '0');
    const participant = await this.prisma.participant.findUnique({
      where: { code },
      include: { stake: true, ward: true },
    });

    if (!participant) throw new NotFoundException('Usuario no encontrado');
    if (!participant.active) throw new BadRequestException('Usuario inactivo');

    const event = dto.eventId
      ? await this.prisma.event.findUnique({ where: { id: dto.eventId } })
      : await this.prisma.event.findUnique({ where: { name: GENERAL_EVENT_NAME } });
    if (!event || !event.active) throw new BadRequestException('Evento inválido o inactivo');

    const todayKey = mexicoDateKey();

    const existingToday = await this.prisma.attendance.findUnique({
      where: {
        participantId_dateMexico_eventId: {
          participantId: participant.id,
          dateMexico: todayKey,
          eventId: event.id,
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
          eventId: event.id,
          method: dto.method,
          dateMexico: todayKey,
        },
        include: { event: true },
      });

      return {
        alreadyRegistered: false,
        participant: {
          id: participant.id,
          code: participant.code,
          fullName: this.formatFullName(participant),
        },
        attendance: {
          id: attendance.id,
          createdAt: attendance.createdAt,
          event: { id: attendance.event.id, name: attendance.event.name },
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.attendance.findUnique({
          where: {
            participantId_dateMexico_eventId: {
              participantId: participant.id,
              dateMexico: todayKey,
              eventId: event.id,
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
      include: { event: true },
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

  async getRangeList(
    period: 'day' | 'week' | 'month',
    dateStr?: string,
    eventId?: string,
    weekday?: number,
  ) {
    const refDate = dateStr ? parseMexicoDate(dateStr) : new Date();
    const dayKey = dateStr ?? mexicoDateKey();

    let where: Prisma.AttendanceWhereInput;
    let periodLabel: string;

    switch (period) {
      case 'week': {
        const bounds = getMexicoWeekBounds(refDate);
        const startKey = mexicoDateKey(bounds.start);
        const endKey = mexicoDateKey(bounds.end);
        where = { dateMexico: { gte: startKey, lt: endKey } };
        periodLabel = `Semana del ${fecha_mexico(bounds.start)} al ${fecha_mexico(new Date(bounds.end.getTime() - 1))}`;
        break;
      }
      case 'month': {
        const [y, m] = dayKey.split('-').map(Number);
        const startKey = `${y}-${String(m).padStart(2, '0')}-01`;
        const nextM = m === 12 ? 1 : m + 1;
        const nextY = m === 12 ? y + 1 : y;
        const endKey = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
        where = { dateMexico: { gte: startKey, lt: endKey } };
        periodLabel = parseMexicoDate(startKey).toLocaleDateString('es-MX', {
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

    if (eventId) {
      where = { ...where, eventId };
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      orderBy: [{ dateMexico: 'asc' }, { createdAt: 'asc' }],
      include: {
        event: true,
        participant: {
          include: {
            stake: true,
            ward: true,
            fieldValues: { include: { field: true } },
          },
        },
      },
    });

    let filtered = attendances;
    if (weekday !== undefined && weekday !== null && !Number.isNaN(weekday)) {
      filtered = attendances.filter((a) => this.civilWeekday(a.dateMexico) === weekday);
    }

    const uniqueKeys = new Set(filtered.map((a) => `${a.participantId}|${a.dateMexico}`));
    const uniqueTotal = uniqueKeys.size;

    // Vista general (sin evento): una fila por persona/día; varios eventos en lista
    const showUnique = !eventId;
    const itemsSource: { row: (typeof filtered)[number]; eventNames: string[] }[] = showUnique
      ? (() => {
          const seen = new Set<string>();
          const rows: { row: (typeof filtered)[number]; eventNames: string[] }[] = [];
          for (const a of filtered) {
            const key = `${a.participantId}|${a.dateMexico}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const sameDay = filtered.filter(
              (x) => x.participantId === a.participantId && x.dateMexico === a.dateMexico,
            );
            const eventNames = [...new Set(sameDay.map((x) => x.event?.name || GENERAL_EVENT_NAME))];
            rows.push({ row: a, eventNames });
          }
          return rows;
        })()
      : filtered.map((a) => ({
          row: a,
          eventNames: [a.event?.name || GENERAL_EVENT_NAME],
        }));

    return {
      period,
      date: periodLabel,
      dateKey:
        period === 'day'
          ? dayKey
          : period === 'month'
            ? `${dayKey.slice(0, 7)}-01`
            : (dateStr ?? mexicoDateKey(refDate)),
      total: showUnique ? uniqueTotal : filtered.length,
      uniqueTotal,
      recordsTotal: filtered.length,
      items: itemsSource.map(({ row: a, eventNames }) => ({
        id: a.id,
        method: a.method,
        createdAt: a.createdAt,
        dateMexico: a.dateMexico,
        timeMexico: hora_mexico(a.createdAt),
        event: {
          id: a.event?.id ?? '',
          name: eventNames.join(', ') || GENERAL_EVENT_NAME,
        },
        eventNames,
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
