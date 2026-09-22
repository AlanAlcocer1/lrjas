import { Injectable } from '@nestjs/common';
import { ApprovalStatus, RecurrenceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_STATUS } from './activity-status.catalog';

const TZID = 'America/Merida';

/** América/Mérida no usa horario de verano (CST = UTC-6). */
const VTIMEZONE_MERIDA = [
  'BEGIN:VTIMEZONE',
  `TZID:${TZID}`,
  `X-LIC-LOCATION:${TZID}`,
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0600',
  'TZOFFSETTO:-0600',
  'TZNAME:CST',
  'DTSTART:19700101T000000',
  'END:STANDARD',
  'END:VTIMEZONE',
].join('\r\n');

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Fecha (día en UTC de Prisma) + hora local Mérida → instante UTC ICS (…Z).
 * Mérida = UTC-6 todo el año. Google acepta mejor UTC que TZID. */
function toIcsUtcDateTime(date: Date, time: string) {
  const [hh = 0, mm = 0] = time.split(':').map((x) => Number(x) || 0);
  const y = date.getUTCFullYear();
  const mo = date.getUTCMonth();
  const d = date.getUTCDate();
  // 18:00 Mérida = 00:00 UTC del día siguiente → sumamos 6h
  const utc = new Date(Date.UTC(y, mo, d, hh, mm, 0));
  utc.setUTCHours(utc.getUTCHours() + 6);
  return (
    `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}` +
    `T${pad(utc.getUTCHours())}${pad(utc.getUTCMinutes())}${pad(utc.getUTCSeconds())}Z`
  );
}

function toIcsDate(date: Date) {
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  return `${y}${m}${d}`;
}

function addDaysUtc(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string) {
  const max = 75;
  if (line.length <= max) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, max));
  remaining = remaining.slice(max);
  while (remaining.length) {
    parts.push(' ' + remaining.slice(0, max - 1));
    remaining = remaining.slice(max - 1);
  }
  return parts.join('\r\n');
}

function utcStamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

const ICS_WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

@Injectable()
export class CalendarIcsService {
  constructor(private prisma: PrismaService) {}

  async publicFeed(baseUrl: string) {
    const activities = await this.prisma.activity.findMany({
      where: {
        approvalStatus: ApprovalStatus.APPROVED,
        status: {
          name: {
            notIn: [
              ACTIVITY_STATUS.CANCELLED,
              ACTIVITY_STATUS.REJECTED,
              ACTIVITY_STATUS.AWAITING_APPROVAL,
              ACTIVITY_STATUS.CHANGES_REQUESTED,
              ACTIVITY_STATUS.POSTPONED,
            ],
          },
        },
      },
      orderBy: { date: 'asc' },
      include: { team: { select: { name: true } } },
    });

    const events = activities.map((a) =>
      this.buildEvent({
        uid: `${a.id}@actividades.lrjasmerida.me`,
        name: a.name,
        description: a.publicDescription,
        location: a.location,
        date: a.date,
        endDate: a.endDate,
        startTime: a.startTime,
        endTime: a.endTime,
        recurrenceType: a.recurrenceType,
        recurrenceInterval: a.recurrenceInterval,
        recurrenceWeekdays: a.recurrenceWeekdays,
        recurrenceUntil: a.recurrenceUntil,
        updatedAt: a.updatedAt,
        url: `${baseUrl}/evento/${a.id}`,
      }),
    );

    return this.wrapCalendar('LRJAS Actividades', events);
  }

  async singleEventIcs(id: string, baseUrl: string) {
    const a = await this.prisma.activity.findFirst({
      where: {
        id,
        approvalStatus: ApprovalStatus.APPROVED,
        status: {
          name: {
            notIn: [
              ACTIVITY_STATUS.CANCELLED,
              ACTIVITY_STATUS.REJECTED,
              ACTIVITY_STATUS.AWAITING_APPROVAL,
              ACTIVITY_STATUS.CHANGES_REQUESTED,
              ACTIVITY_STATUS.POSTPONED,
            ],
          },
        },
      },
    });
    if (!a) return null;

    const event = this.buildEvent({
      uid: `${a.id}@actividades.lrjasmerida.me`,
      name: a.name,
      description: a.publicDescription,
      location: a.location,
      date: a.date,
      endDate: a.endDate,
      startTime: a.startTime,
      endTime: a.endTime,
      recurrenceType: a.recurrenceType,
      recurrenceInterval: a.recurrenceInterval,
      recurrenceWeekdays: a.recurrenceWeekdays,
      recurrenceUntil: a.recurrenceUntil,
      updatedAt: a.updatedAt,
      url: `${baseUrl}/evento/${a.id}`,
    });

    return this.wrapCalendar(a.name, [event]);
  }

  private buildEvent(input: {
    uid: string;
    name: string;
    description: string;
    location: string;
    date: Date;
    endDate?: Date | null;
    startTime: string;
    endTime: string | null;
    recurrenceType?: RecurrenceType;
    recurrenceInterval?: number | null;
    recurrenceWeekdays?: number[];
    recurrenceUntil?: Date | null;
    updatedAt?: Date | null;
    url: string;
  }) {
    const multiDay = !!(input.endDate && input.endDate > input.date);
    const stamp = utcStamp();
    const lastMod = utcStamp(input.updatedAt ?? new Date());

    const lines = [
      'BEGIN:VEVENT',
      `UID:${input.uid}`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${lastMod}`,
      'SEQUENCE:0',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
    ];

    if (multiDay) {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(input.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(addDaysUtc(input.endDate!, 1))}`);
    } else {
      const end = this.resolveEndDateTime(
        input.date,
        input.startTime,
        input.endTime,
      );
      const dtStart = toIcsUtcDateTime(input.date, input.startTime);
      const dtEnd = toIcsUtcDateTime(end.date, end.time);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
    }

    const rrule = this.buildRrule(input);
    if (rrule) lines.push(`RRULE:${rrule}`);

    lines.push(
      `SUMMARY:${escapeIcs(input.name)}`,
      `DESCRIPTION:${escapeIcs(input.description || '')}`,
      `LOCATION:${escapeIcs(input.location || '')}`,
      `URL:${input.url}`,
      'END:VEVENT',
    );
    return lines.map(foldLine).join('\r\n');
  }

  private buildRrule(input: {
    recurrenceType?: RecurrenceType;
    recurrenceInterval?: number | null;
    recurrenceWeekdays?: number[];
    recurrenceUntil?: Date | null;
  }): string | null {
    if (!input.recurrenceType || input.recurrenceType === RecurrenceType.NONE) {
      return null;
    }

    const parts: string[] = [];
    if (input.recurrenceType === RecurrenceType.INTERVAL) {
      parts.push('FREQ=DAILY');
      parts.push(`INTERVAL=${input.recurrenceInterval ?? 1}`);
    } else if (input.recurrenceType === RecurrenceType.WEEKLY) {
      parts.push('FREQ=WEEKLY');
      const days = (input.recurrenceWeekdays ?? [])
        .map((d) => ICS_WEEKDAYS[d])
        .filter(Boolean);
      if (days.length) parts.push(`BYDAY=${days.join(',')}`);
    } else {
      return null;
    }

    if (input.recurrenceUntil) {
      parts.push(`UNTIL=${toIcsDate(input.recurrenceUntil)}T235959Z`);
    }

    return parts.join(';');
  }

  private wrapCalendar(name: string, events: string[]) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LRJAS//Actividades//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcs(name)}`,
      `X-WR-TIMEZONE:${TZID}`,
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
      VTIMEZONE_MERIDA,
      ...events,
      'END:VCALENDAR',
    ];
    return lines.join('\r\n') + '\r\n';
  }

  /** Si no hay endTime, +1h; si cruza medianoche, pasa al día siguiente. */
  private resolveEndDateTime(
    date: Date,
    startTime: string,
    endTime: string | null,
  ): { date: Date; time: string } {
    if (endTime) return { date, time: endTime };
    const [h, m] = startTime.split(':').map(Number);
    const nextH = (h || 0) + 1;
    if (nextH < 24) {
      return {
        date,
        time: `${String(nextH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`,
      };
    }
    return {
      date: addDaysUtc(date, 1),
      time: `00:${String(m || 0).padStart(2, '0')}`,
    };
  }
}
