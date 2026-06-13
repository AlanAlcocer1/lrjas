import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateParticipantDto,
  UpdateParticipantDto,
  ParticipantQueryDto,
} from './dto/participant.dto';
import { Prisma } from '@prisma/client';

function upper(value: string): string {
  return value.trim().toUpperCase();
}

function upperOptional(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
}

@Injectable()
export class ParticipantsService {
  constructor(private prisma: PrismaService) {}

  private formatParticipant(participant: {
    id: string;
    code: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    motherLastName: string;
    age: number;
    sex: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    stake: { id: string; name: string };
    ward: { id: string; name: string };
    fieldValues?: { field: { name: string; label: string }; value: boolean }[];
    attendances?: { id: string; method: string; createdAt: Date }[];
  }) {
    const fullName = [participant.firstName, participant.middleName, participant.lastName, participant.motherLastName]
      .filter(Boolean)
      .join(' ');

    return {
      id: participant.id,
      code: participant.code,
      firstName: participant.firstName,
      middleName: participant.middleName,
      lastName: participant.lastName,
      motherLastName: participant.motherLastName,
      fullName,
      age: participant.age,
      sex: participant.sex,
      active: participant.active,
      stake: participant.stake,
      ward: participant.ward,
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt,
      dynamicFields: participant.fieldValues?.reduce(
        (acc, fv) => ({ ...acc, [fv.field.name]: fv.value }),
        {} as Record<string, boolean>,
      ),
      attendances: participant.attendances,
    };
  }

  async generateUniqueCode(): Promise<string> {
    const last = await this.prisma.participant.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    });

    const nextNum = last ? parseInt(last.code, 10) + 1 : 0;
    if (nextNum > 999) throw new BadRequestException('No hay códigos disponibles');

    return String(nextNum).padStart(3, '0');
  }

  async create(dto: CreateParticipantDto) {
    const code = await this.generateUniqueCode();
    const activeFields = await this.prisma.fieldDefinition.findMany({
      where: { active: true },
    });

    const participant = await this.prisma.participant.create({
      data: {
        code,
        firstName: upper(dto.firstName),
        middleName: upperOptional(dto.middleName) ?? null,
        lastName: upper(dto.lastName),
        motherLastName: upper(dto.motherLastName),
        age: dto.age,
        sex: dto.sex,
        stakeId: dto.stakeId,
        wardId: dto.wardId,
        fieldValues: {
          create: activeFields.map((field) => ({
            fieldId: field.id,
            value: dto.dynamicFields?.[field.name] ?? false,
          })),
        },
      },
      include: {
        stake: true,
        ward: true,
        fieldValues: { include: { field: true } },
      },
    });

    return this.formatParticipant(participant);
  }

  async findAll(query: ParticipantQueryDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = (query.sortOrder || 'desc') as Prisma.SortOrder;

    const where: Prisma.ParticipantWhereInput = {};

    if (query.search) {
      where.OR = [
        { code: { contains: query.search } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { motherLastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.stakeId) where.stakeId = query.stakeId;
    if (query.sex) where.sex = query.sex;
    if (query.active !== undefined) where.active = query.active === 'true';

    const orderBy: Prisma.ParticipantOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      this.prisma.participant.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          stake: true,
          ward: true,
          fieldValues: { include: { field: true } },
        },
      }),
      this.prisma.participant.count({ where }),
    ]);

    return {
      items: items.map((p) => this.formatParticipant(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByCode(code: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { code: code.padStart(3, '0') },
      include: {
        stake: true,
        ward: true,
        fieldValues: { include: { field: true } },
        attendances: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!participant) throw new NotFoundException('Usuario no encontrado');
    return this.formatParticipant(participant);
  }

  async findOne(id: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
      include: {
        stake: true,
        ward: true,
        fieldValues: { include: { field: true } },
        attendances: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!participant) throw new NotFoundException('Usuario no encontrado');
    return this.formatParticipant(participant);
  }

  async update(id: string, dto: UpdateParticipantDto) {
    await this.findOne(id);

    const { dynamicFields, ...rawData } = dto;

    const data: Prisma.ParticipantUpdateInput = { ...rawData };
    if (rawData.firstName !== undefined) data.firstName = upper(rawData.firstName);
    if (rawData.middleName !== undefined) data.middleName = upperOptional(rawData.middleName) ?? null;
    if (rawData.lastName !== undefined) data.lastName = upper(rawData.lastName);
    if (rawData.motherLastName !== undefined) data.motherLastName = upper(rawData.motherLastName);

    const participant = await this.prisma.participant.update({
      where: { id },
      data,
      include: {
        stake: true,
        ward: true,
        fieldValues: { include: { field: true } },
      },
    });

    if (dynamicFields) {
      for (const [name, value] of Object.entries(dynamicFields)) {
        const field = await this.prisma.fieldDefinition.findUnique({ where: { name } });
        if (field) {
          await this.prisma.participantFieldValue.upsert({
            where: {
              participantId_fieldId: { participantId: id, fieldId: field.id },
            },
            update: { value },
            create: { participantId: id, fieldId: field.id, value },
          });
        }
      }
    }

    return this.findOne(id);
  }

  async deactivate(id: string) {
    return this.update(id, { active: false });
  }
}
