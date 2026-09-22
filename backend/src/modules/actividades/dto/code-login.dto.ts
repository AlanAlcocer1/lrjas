import { IsString, Matches, MaxLength } from 'class-validator';

export class CodeLoginDto {
  @IsString()
  @MaxLength(10)
  /** Códigos de participante (1–3) o acceso Matrimonios (1234). */
  @Matches(/^\d{1,4}$/, { message: 'El código debe ser numérico' })
  code: string;
}
