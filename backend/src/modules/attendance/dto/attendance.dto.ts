import { IsString, IsEnum, IsOptional, IsIn, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceMethod } from '@prisma/client';

export class CreateAttendanceDto {
  @IsString()
  code!: string;

  @IsEnum(AttendanceMethod)
  method!: AttendanceMethod;

  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class AttendanceRangeQueryDto {
  @IsIn(['day', 'week', 'month'])
  period!: 'day' | 'week' | 'month';

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  /** 0=domingo … 6=sábado (calendario civil de date_mexico) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;
}
