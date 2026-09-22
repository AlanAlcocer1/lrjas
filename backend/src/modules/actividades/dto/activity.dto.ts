import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalStatus, ResponsibleType, TaskPriority, TaskStatus } from '@prisma/client';

export class BudgetItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  concept: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class BudgetDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  requestedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  spentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items?: BudgetItemDto[];
}

export class TaskInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export class ResponsibleInputDto {
  @IsUUID()
  participantId: string;

  @IsEnum(ResponsibleType)
  type: ResponsibleType;
}

export class CreateActivityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @IsString()
  @MinLength(1)
  publicDescription: string;

  @IsOptional()
  @IsString()
  internalDescription?: string;

  @IsDateString()
  date: string;

  @IsString()
  @MaxLength(10)
  startTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  endTime?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  location: string;

  @IsOptional()
  @IsString()
  locationUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsUUID()
  primaryResponsibleId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  secondaryResponsibleIds?: string[];

  @IsOptional()
  @IsBoolean()
  requiresBudget?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetDto)
  budget?: BudgetDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskInputDto)
  tasks?: TaskInputDto[];

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  publicDescription?: string;

  @IsOptional()
  @IsString()
  internalDescription?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  startTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  locationUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string | null;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsUUID()
  primaryResponsibleId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  secondaryResponsibleIds?: string[];

  @IsOptional()
  @IsBoolean()
  requiresBudget?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetDto)
  budget?: BudgetDto;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class ApprovalActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;
}

export class CreateActivityStatusDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isInitial?: boolean;

  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateActivityStatusDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isInitial?: boolean;

  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ActivityQueryDto {
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  statusId?: string;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  requiresBudget?: boolean;
}
