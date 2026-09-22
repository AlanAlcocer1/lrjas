import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const HEX_COLOR = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'Color inválido (usa #RRGGBB)' })
  color?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_COLOR, { message: 'Color inválido (usa #RRGGBB)' })
  color?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class TeamMembersDto {
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds: string[];
}
