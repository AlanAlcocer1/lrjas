import { IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateRaffleTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'Código inválido' })
  code!: string;
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
