import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePredictionDto {
  @IsString()
  @MinLength(1)
  participantCode!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  mexicoScore!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  czechScore!: number;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  mexicoScorers!: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  czechScorers!: string[];
}

export class UpdatePredictionDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  mexicoScore!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  czechScore!: number;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  mexicoScorers!: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  czechScorers!: string[];
}
