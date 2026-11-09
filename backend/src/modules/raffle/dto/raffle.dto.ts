import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRaffleTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'Código inválido' })
  code!: string;
}

/** Varios códigos × cantidad de boletos por cada uno. */
export class CreateRaffleTicketsBulkDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  @Matches(/^[A-Za-z0-9]+$/, { each: true, message: 'Código inválido' })
  codes!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;
}

export class DrawRaffleDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Fecha inválida (YYYY-MM-DD)' })
  date?: string;

  /** Boletos ya sorteados en esta sesión de tómbola. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeIds?: string[];
}
