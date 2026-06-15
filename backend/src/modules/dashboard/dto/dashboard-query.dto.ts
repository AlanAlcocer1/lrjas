import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export class DashboardQueryDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_KEY, { message: 'from debe ser YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_KEY, { message: 'to debe ser YYYY-MM-DD' })
  to?: string;
}
