import { Injectable } from '@nestjs/common';
import { ApprovalStatus, RecurrenceType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVITY_STATUS } from './activity-status.catalog';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Fecha/hora México (America/Merida) a UTC ICS sin zona (floating local) o Z. */
function toIcsDateTime(date: Date, time: string) {
  const [hh = '00', mm = '00'] = time.split(':');
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  return `${y}${m}${d}T${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;
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
        url: `${baseUrl}/public/${a.id}`,
      }),
    );

    return this.wrapCalendar('LRJAS Actividades', events);
  }

  async singleEventIcs(id: string, baseUrl: string) {
    const a = await this.prisma.activity.findFirst({
      where: { id, approvalStatus: ApprovalStatus.APPROVED },
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
      url: `${baseUrl}/public/${a.id}`,
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
    url: string;
  }) {
    const multiDay = !!(input.endDate && input.endDate > input.date);
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

    const lines = [
      'BEGIN:VEVENT',
      `UID:${input.uid}`,
      `DTSTAMP:${stamp}`,
    ];

    if (multiDay) {
      // All-day multi-día: DTEND exclusivo
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(input.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(addDaysUtc(input.endDate!, 1))}`);
    } else {
      const dtStart = toIcsDateTime(input.date, input.startTime);
      const dtEnd = toIcsDateTime(
        input.date,
        input.endTime || this.addHour(input.startTime),
      );
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
    }

    const rrule = this.buildRrule(input);
    if (rrule) lines.push(`RRULE:${rrule}`);

    lines.push(
      `SUMMARY:${escapeIcs(input.name)}`,
      `DESCRIPTION:${escapeIcs(input.description)}`,
      `LOCATION:${escapeIcs(input.location)}`,
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
      parts.push(`UNTIL=${toIcsDate(input.recurrenceUntil)}`);
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
      'X-WR-TIMEZONE:America/Merida',
      ...events,
      'END:VCALENDAR',
    ];
    return lines.join('\r\n') + '\r\n';
  }

  private addHour(time: string) {
    const [h, m] = time.split(':').map(Number);
    const next = ((h || 0) + 1) % 24;
    return `${String(next).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  }
}
