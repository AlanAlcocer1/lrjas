import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExecuteSqlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  query!: string;
}
