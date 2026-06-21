import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SocialPlatform } from '@prisma/client';

export class CreateSocialPostDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(500)
  postUrl!: string;

  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSocialPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  postUrl?: string;

  @IsOptional()
  @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
