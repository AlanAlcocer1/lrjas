import { IsString, Matches, MaxLength } from 'class-validator';

export class CodeLoginDto {
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{1,3}$/, { message: 'El código debe ser numérico (000–999)' })
  code: string;
}
