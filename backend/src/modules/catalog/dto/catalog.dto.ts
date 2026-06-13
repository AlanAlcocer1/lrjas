import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStakeDto {
  @IsString()
  @MinLength(2)
  name: string;
}

export class UpdateStakeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateWardDto {
  @IsString()
  @MinLength(2)
  name: string;
}

export class UpdateWardDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
