import { BadRequestException } from '@nestjs/common';
import { RecurrenceType } from '@prisma/client';

export type ScheduleInput = {
  date?: string;
  endDate?: string | null;
  recurrenceType?: RecurrenceType;
  recurrenceInterval?: number | null;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: string | null;
};

export type RecurrenceFields = {
  endDate: Date | null;
  recurrenceType: RecurrenceType;
  recurrenceInterval: number | null;
  recurrenceWeekdays: number[];
  recurrenceUntil: Date | null;
};

function parseDay(value: string | undefined | null): Date | null {
  if (!value) return null;
  return new Date(value);
}

/** Valida y normaliza endDate + recurrencia a partir de create/update DTO. */
export function normalizeSchedule(
  dto: ScheduleInput,
  existingDate?: Date,
): Partial<RecurrenceFields> {
  const start = dto.date ? new Date(dto.date) : existingDate;
  const endDate =
    dto.endDate === undefined
      ? undefined
      : dto.endDate === null
        ? null
        : parseDay(dto.endDate);

  if (start && endDate && endDate < start) {
    throw new BadRequestException('La fecha fin no puede ser anterior al inicio');
  }

  if (
    dto.recurrenceType === undefined &&
    dto.recurrenceInterval === undefined &&
    dto.recurrenceWeekdays === undefined &&
    dto.recurrenceUntil === undefined
  ) {
    return endDate !== undefined ? { endDate } : {};
  }

  const type = dto.recurrenceType ?? RecurrenceType.NONE;

  if (type === RecurrenceType.NONE) {
    return {
      ...(endDate !== undefined ? { endDate } : {}),
      recurrenceType: RecurrenceType.NONE,
      recurrenceInterval: null,
      recurrenceWeekdays: [],
      recurrenceUntil: null,
    };
  }

  const until =
    dto.recurrenceUntil === undefined
      ? undefined
      : dto.recurrenceUntil === null
        ? null
        : parseDay(dto.recurrenceUntil);

  if (start && until && until < start) {
    throw new BadRequestException('La repetición no puede terminar antes del inicio');
  }

  if (type === RecurrenceType.INTERVAL) {
    const interval = dto.recurrenceInterval ?? 1;
    if (interval < 1) {
      throw new BadRequestException('El intervalo debe ser al menos 1 día');
    }
    return {
      ...(endDate !== undefined ? { endDate } : {}),
      recurrenceType: RecurrenceType.INTERVAL,
      recurrenceInterval: interval,
      recurrenceWeekdays: [],
      recurrenceUntil: until === undefined ? null : until,
    };
  }

  if (type === RecurrenceType.WEEKLY) {
    const weekdays = [...new Set(dto.recurrenceWeekdays ?? [])].sort((a, b) => a - b);
    if (weekdays.length === 0) {
      throw new BadRequestException('Elige al menos un día de la semana');
    }
    return {
      ...(endDate !== undefined ? { endDate } : {}),
      recurrenceType: RecurrenceType.WEEKLY,
      recurrenceInterval: null,
      recurrenceWeekdays: weekdays,
      recurrenceUntil: until === undefined ? null : until,
    };
  }

  return {
    ...(endDate !== undefined ? { endDate } : {}),
    recurrenceType: type,
  };
}
