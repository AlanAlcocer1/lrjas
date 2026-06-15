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
import { ageFromBirthDateKey, parseMexicoDate } from '../../common/mexico-time';
import { NONE_STAKE_NAME } from '../../bootstrap/ensure-ninguno-stake';
import { MEMBER_FIELD_NAME, inferIsMember } from '../../bootstrap/ensure-miembro-field';

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
    birthDate: Date;
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
      birthDate: participant.birthDate.toISOString().slice(0, 10),
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

  private resolveAge(dto: { birthDate?: string; age?: number }): number {
    if (dto.birthDate) {
      const age = ageFromBirthDateKey(dto.birthDate);
      if (age < 18 || age > 45) {
        throw new BadRequestException('La edad calculada debe estar entre 18 y 45 años');
      }
      return age;
    }
    if (dto.age !== undefined) return dto.age;
    throw new BadRequestException('Se requiere fecha de nacimiento');
  }

  private normalizeNameFields(dto: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    motherLastName: string;
  }) {
    return {
      firstName: upper(dto.firstName),
      middleName: upperOptional(dto.middleName) ?? null,
      lastName: upper(dto.lastName),
      motherLastName: upper(dto.motherLastName),
    };
  }

  private async findExistingByName(
    names: {
      firstName: string;
      middleName: string | null;
      lastName: string;
      motherLastName: string;
    },
    excludeId?: string,
  ) {
    return this.prisma.participant.findFirst({
      where: {
        firstName: names.firstName,
        middleName: names.middleName,
        lastName: names.lastName,
        motherLastName: names.motherLastName,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        code: true,
        firstName: true,
        middleName: true,
        lastName: true,
        motherLastName: true,
      },
    });
  }

  private formatFullNameFromParts(parts: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    motherLastName: string;
  }) {
    return [parts.firstName, parts.middleName, parts.lastName, parts.motherLastName]
      .filter(Boolean)
      .join(' ');
  }

  private assertNotDuplicate(
    existing: {
      code: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
      motherLastName: string;
    } | null,
  ) {
    if (!existing) return;

    throw new ConflictException({
      message: 'Ya existe un usuario registrado con ese nombre',
      existingCode: existing.code,
      fullName: this.formatFullNameFromParts(existing),
    });
  }

  async create(dto: CreateParticipantDto) {
    const names = this.normalizeNameFields(dto);
    const existing = await this.findExistingByName(names);
    this.assertNotDuplicate(existing);

    const code = await this.generateUniqueCode();
    const age = this.resolveAge(dto);
    const activeFields = await this.prisma.fieldDefinition.findMany({
      where: { active: true },
    });

    const participant = await this.prisma.participant.create({
      data: {
        code,
        firstName: names.firstName,
        middleName: names.middleName,
        lastName: names.lastName,
        motherLastName: names.motherLastName,
        age,
        birthDate: parseMexicoDate(dto.birthDate),
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

  async getCompletenessByCode(code: string) {
    const normalizedCode = code.padStart(3, '0');

    const [participant, activeFields] = await Promise.all([
      this.prisma.participant.findUnique({
        where: { code: normalizedCode },
        select: {
          id: true,
          code: true,
          firstName: true,
          middleName: true,
          lastName: true,
          motherLastName: true,
          stakeId: true,
          wardId: true,
          active: true,
          stake: { select: { id: true, name: true } },
          ward: { select: { id: true, name: true } },
          fieldValues: {
            select: {
              value: true,
              field: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.fieldDefinition.findMany({
        where: { active: true },
        select: { id: true, name: true, label: true, type: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!participant) throw new NotFoundException('Usuario no encontrado');
    if (!participant.active) throw new BadRequestException('Usuario inactivo');

    const answeredFieldIds = new Set(participant.fieldValues.map((v) => v.field.id));
    const dynamicFields = Object.fromEntries(
      participant.fieldValues.map((v) => [v.field.name, v.value]),
    ) as Record<string, boolean>;
    const missing: { key: string; label: string; type: string }[] = [];

    const isMember = inferIsMember(dynamicFields, participant.stake.name);
    if (dynamicFields[MEMBER_FIELD_NAME] !== true && isMember) {
      dynamicFields[MEMBER_FIELD_NAME] = true;
    }
    if (isMember && participant.stake.name === NONE_STAKE_NAME) {
      missing.push({ key: 'stake', label: 'Estaca', type: 'STAKE' });
      missing.push({ key: 'ward', label: 'Barrio', type: 'WARD' });
    }

    for (const field of activeFields) {
      if (!answeredFieldIds.has(field.id)) {
        if (
          field.name === MEMBER_FIELD_NAME &&
          participant.stake.name !== NONE_STAKE_NAME
        ) {
          continue;
        }
        missing.push({
          key: field.name,
          label: field.label,
          type: field.type,
        });
      }
    }

    return {
      participantId: participant.id,
      code: participant.code,
      fullName: this.formatFullNameFromParts(participant),
      complete: missing.length === 0,
      missing,
      profile: {
        stakeId: participant.stakeId,
        wardId: participant.wardId,
        stake: participant.stake,
        ward: participant.ward,
        isMember,
        dynamicFields,
      },
    };
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
    const current = await this.findOne(id);

    const { dynamicFields, birthDate, age: dtoAge, ...rawData } = dto;

    const mergedNames = this.normalizeNameFields({
      firstName: rawData.firstName ?? current.firstName,
      middleName: rawData.middleName ?? current.middleName,
      lastName: rawData.lastName ?? current.lastName,
      motherLastName: rawData.motherLastName ?? current.motherLastName,
    });

    if (
      rawData.firstName !== undefined ||
      rawData.middleName !== undefined ||
      rawData.lastName !== undefined ||
      rawData.motherLastName !== undefined
    ) {
      const existing = await this.findExistingByName(mergedNames, id);
      this.assertNotDuplicate(existing);
    }

    const data: Prisma.ParticipantUpdateInput = { ...rawData };
    if (rawData.firstName !== undefined) data.firstName = upper(rawData.firstName);
    if (rawData.middleName !== undefined) data.middleName = upperOptional(rawData.middleName) ?? null;
    if (rawData.lastName !== undefined) data.lastName = upper(rawData.lastName);
    if (rawData.motherLastName !== undefined) data.motherLastName = upper(rawData.motherLastName);

    if (birthDate !== undefined) {
      const age = this.resolveAge({ birthDate, age: dtoAge });
      data.birthDate = parseMexicoDate(birthDate);
      data.age = age;
    } else if (dtoAge !== undefined) {
      data.age = dtoAge;
    }

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
      const names = Object.keys(dynamicFields);
      if (names.length > 0) {
        const fieldRows = await this.prisma.fieldDefinition.findMany({
          where: { name: { in: names } },
          select: { id: true, name: true },
        });
        const fieldByName = new Map(fieldRows.map((f) => [f.name, f.id]));

        await Promise.all(
          Object.entries(dynamicFields).map(([name, value]) => {
            const fieldId = fieldByName.get(name);
            if (!fieldId) return Promise.resolve();
            return this.prisma.participantFieldValue.upsert({
              where: {
                participantId_fieldId: { participantId: id, fieldId },
              },
              update: { value },
              create: { participantId: id, fieldId, value },
            });
          }),
        );
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.attendance.deleteMany({ where: { participantId: id } }),
      this.prisma.participant.delete({ where: { id } }),
    ]);
    return { deleted: true };
  }
}
