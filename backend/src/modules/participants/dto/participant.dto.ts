import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsUUID,
  IsObject,
  IsBoolean,
  IsDateString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ParticipantType, Sex } from '@prisma/client';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateParticipantDto {
  @IsEnum(ParticipantType)
  type!: ParticipantType;

  @IsString()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  lastName!: string;

  @IsString()
  motherLastName!: string;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(45)
  age?: number;

  @IsDateString()
  @Matches(DATE_KEY, { message: 'birthDate debe ser YYYY-MM-DD' })
  birthDate!: string;

  @IsEnum(Sex)
  sex!: Sex;

  @ValidateIf((o: CreateParticipantDto) => o.type === ParticipantType.MEMBER)
  @IsUUID()
  stakeId?: string;

  @ValidateIf((o: CreateParticipantDto) => o.type === ParticipantType.MEMBER)
  @IsUUID()
  wardId?: string;

  @IsOptional()
  @IsString()
  visitorStake?: string;

  @IsOptional()
  @IsString()
  visitorWard?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsObject()
  dynamicFields?: Record<string, boolean>;
}

export class UpdateParticipantDto {
  @IsOptional()
  @IsEnum(ParticipantType)
  type?: ParticipantType;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  motherLastName?: string;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(45)
  age?: number;

  @IsOptional()
  @IsDateString()
  @Matches(DATE_KEY, { message: 'birthDate debe ser YYYY-MM-DD' })
  birthDate?: string;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsUUID()
  stakeId?: string;

  @IsOptional()
  @IsUUID()
  wardId?: string;

  @IsOptional()
  @IsString()
  visitorStake?: string | null;

  @IsOptional()
  @IsString()
  visitorWard?: string;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsObject()
  dynamicFields?: Record<string, boolean>;
}

export class CredentialLookupDto {
  @IsString()
  q!: string;
}

export class ParticipantQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  stakeId?: string;

  @IsOptional()
  @IsEnum(Sex)
  sex?: Sex;

  @IsOptional()
  @IsEnum(ParticipantType)
  type?: ParticipantType;

  @IsOptional()
  @IsString()
  active?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;
}
