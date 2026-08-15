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
import { ParticipantType } from '@prisma/client';
import { ageFromBirthDateKey, calendarDateKey, parseMexicoDate } from '../../common/mexico-time';
import { NONE_STAKE_NAME, NONE_WARD_NAME } from '../../bootstrap/ensure-ninguno-stake';
import { OTRO_STAKE_NAME, OTRO_WARD_NAME } from '../../bootstrap/ensure-otro-stake';
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
    type: ParticipantType;
    visitorStake: string | null;
    city: string | null;
    state: string | null;
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
      birthDate: calendarDateKey(participant.birthDate),
      sex: participant.sex,
      type: participant.type,
      visitorStake: participant.visitorStake,
      city: participant.city,
      state: participant.state,
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

  private buildParticipantNameSearchWhere(search: string): Prisma.ParticipantWhereInput {
    const words = search.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return {};

    const wordMatch = (word: string): Prisma.ParticipantWhereInput => ({
      OR: [
        { code: { contains: word, mode: 'insensitive' } },
        { firstName: { contains: word, mode: 'insensitive' } },
        { middleName: { contains: word, mode: 'insensitive' } },
        { lastName: { contains: word, mode: 'insensitive' } },
        { motherLastName: { contains: word, mode: 'insensitive' } },
      ],
    });

    if (words.length === 1) return wordMatch(words[0]);
    return { AND: words.map((word) => wordMatch(word)) };
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

  private miembroValueForType(type: ParticipantType): boolean {
    return type === ParticipantType.MEMBER || type === ParticipantType.VISITOR;
  }

  private async resolveNingunoIds() {
    const stake = await this.prisma.stake.findUnique({
      where: { name: NONE_STAKE_NAME },
      include: { wards: true },
    });
    if (!stake) throw new BadRequestException('Estaca Ninguno no configurada');
    const ward = stake.wards.find((w) => w.name === NONE_WARD_NAME) ?? stake.wards[0];
    if (!ward) throw new BadRequestException('Barrio Ninguno no configurado');
    return { stakeId: stake.id, wardId: ward.id };
  }

  private async resolveMemberStakeWard(stakeId?: string, wardId?: string) {
    if (!stakeId || !wardId) {
      throw new BadRequestException('Selecciona estaca y barrio');
    }
    const stake = await this.prisma.stake.findUnique({
      where: { id: stakeId },
      include: { wards: { where: { id: wardId } } },
    });
    if (!stake || !stake.active) throw new BadRequestException('Estaca inválida');
    if (stake.name === NONE_STAKE_NAME || stake.name === OTRO_STAKE_NAME) {
      throw new BadRequestException('Selecciona una estaca válida');
    }
    if (stake.wards.length === 0) throw new BadRequestException('Barrio inválido');
    return { stakeId: stake.id, wardId };
  }

  private async resolveVisitorPlacement(dto: {
    visitorStake?: string;
    visitorWard?: string;
    city?: string;
    state?: string;
  }) {
    const stake = await this.prisma.stake.upsert({
      where: { name: OTRO_STAKE_NAME },
      update: { active: true },
      create: { name: OTRO_STAKE_NAME },
    });

    const visitorWard = upperOptional(dto.visitorWard) || OTRO_WARD_NAME;
    const ward = await this.prisma.ward.upsert({
      where: { name_stakeId: { name: visitorWard, stakeId: stake.id } },
      update: { active: true },
      create: { name: visitorWard, stakeId: stake.id },
    });

    return {
      stakeId: stake.id,
      wardId: ward.id,
      visitorStake: upperOptional(dto.visitorStake) ?? null,
      city: upperOptional(dto.city) ?? null,
      state: upperOptional(dto.state) ?? null,
    };
  }

  private async resolvePlacementByType(
    type: ParticipantType,
    dto: {
      stakeId?: string;
      wardId?: string;
      visitorStake?: string;
      visitorWard?: string;
      city?: string | null;
      state?: string | null;
    },
  ) {
    if (type === ParticipantType.NON_MEMBER) {
      const ids = await this.resolveNingunoIds();
      return { ...ids, visitorStake: null as string | null, city: null as string | null, state: null as string | null };
    }
    if (type === ParticipantType.VISITOR) {
      return this.resolveVisitorPlacement({
        visitorStake: dto.visitorStake ?? undefined,
        visitorWard: dto.visitorWard ?? undefined,
        city: dto.city ?? undefined,
        state: dto.state ?? undefined,
      });
    }
    const ids = await this.resolveMemberStakeWard(dto.stakeId, dto.wardId);
    return { ...ids, visitorStake: null as string | null, city: null as string | null, state: null as string | null };
  }

  async create(dto: CreateParticipantDto) {
    const names = this.normalizeNameFields(dto);
    const existing = await this.findExistingByName(names);
    this.assertNotDuplicate(existing);

    const code = await this.generateUniqueCode();
    const age = this.resolveAge(dto);
    const placement = await this.resolvePlacementByType(dto.type, dto);
    const activeFields = await this.prisma.fieldDefinition.findMany({
      where: { active: true },
    });

    const dynamicFields =
      dto.type === ParticipantType.MEMBER ? { ...(dto.dynamicFields ?? {}) } : {};
    dynamicFields[MEMBER_FIELD_NAME] = this.miembroValueForType(dto.type);

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
        type: dto.type,
        visitorStake: placement.visitorStake,
        city: placement.city,
        state: placement.state,
        stakeId: placement.stakeId,
        wardId: placement.wardId,
        fieldValues: {
          create: activeFields.map((field) => ({
            fieldId: field.id,
            value: dynamicFields[field.name] ?? false,
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
      Object.assign(where, this.buildParticipantNameSearchWhere(query.search));
    }

    if (query.stakeId) where.stakeId = query.stakeId;
    if (query.sex) where.sex = query.sex;
    if (query.type) where.type = query.type;
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

  private participantInclude = {
    stake: true,
    ward: true,
    fieldValues: { include: { field: true } },
    attendances: { orderBy: { createdAt: 'desc' as const } },
  };

  async findByCode(code: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { code: code.padStart(3, '0') },
      include: this.participantInclude,
    });

    if (!participant) throw new NotFoundException('Usuario no encontrado');
    return this.formatParticipant(participant);
  }

  async lookupForCredential(query: string) {
    const trimmed = query.trim();
    if (!trimmed) throw new BadRequestException('Ingresa un código o nombre');

    if (/^\d+$/.test(trimmed)) {
      return { match: 'single' as const, participant: await this.findByCode(trimmed) };
    }

    if (trimmed.length < 2) {
      throw new BadRequestException('Escribe al menos 2 caracteres para buscar por nombre');
    }

    const matches = await this.prisma.participant.findMany({
      where: this.buildParticipantNameSearchWhere(trimmed),
      take: 15,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: this.participantInclude,
    });

    if (matches.length === 0) throw new NotFoundException('Usuario no encontrado');
    if (matches.length === 1) {
      return { match: 'single' as const, participant: this.formatParticipant(matches[0]) };
    }

    return {
      match: 'multiple' as const,
      options: matches.map((p) => ({
        code: p.code,
        fullName: [p.firstName, p.middleName, p.lastName, p.motherLastName].filter(Boolean).join(' '),
        stake:
          p.type === ParticipantType.NON_MEMBER
            ? 'No miembro'
            : p.type === ParticipantType.VISITOR
              ? 'Visitante'
              : p.stake.name,
        ward:
          p.type === ParticipantType.MEMBER ? p.ward.name : '',
      })),
    };
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

    const { dynamicFields, birthDate, age: dtoAge, type, visitorWard, visitorStake, city, state, stakeId, wardId, ...rawData } =
      dto;

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

    const nextType = type ?? current.type;
    const data: Prisma.ParticipantUpdateInput = {};

    if (rawData.firstName !== undefined) data.firstName = upper(rawData.firstName);
    if (rawData.middleName !== undefined) data.middleName = upperOptional(rawData.middleName) ?? null;
    if (rawData.lastName !== undefined) data.lastName = upper(rawData.lastName);
    if (rawData.motherLastName !== undefined) data.motherLastName = upper(rawData.motherLastName);
    if (rawData.sex !== undefined) data.sex = rawData.sex;
    if (rawData.active !== undefined) data.active = rawData.active;

    if (birthDate !== undefined) {
      const age = this.resolveAge({ birthDate, age: dtoAge });
      data.birthDate = parseMexicoDate(birthDate);
      data.age = age;
    } else if (dtoAge !== undefined) {
      data.age = dtoAge;
    }

    const typeChanged = type !== undefined && type !== current.type;
    const visitorFieldsTouched =
      visitorStake !== undefined || visitorWard !== undefined || city !== undefined || state !== undefined;
    const stakeTouched = stakeId !== undefined || wardId !== undefined;

    if (typeChanged || visitorFieldsTouched || stakeTouched || type !== undefined) {
      const placement = await this.resolvePlacementByType(nextType, {
        stakeId: stakeId ?? current.stake.id,
        wardId: wardId ?? current.ward.id,
        visitorStake:
          visitorStake !== undefined
            ? visitorStake ?? undefined
            : nextType === ParticipantType.VISITOR
              ? current.visitorStake ?? undefined
              : undefined,
        visitorWard: visitorWard ?? undefined,
        city:
          city !== undefined
            ? city
            : nextType === ParticipantType.VISITOR
              ? current.city
              : null,
        state:
          state !== undefined
            ? state
            : nextType === ParticipantType.VISITOR
              ? current.state
              : null,
      });
      data.type = nextType;
      data.visitorStake = placement.visitorStake;
      data.city = placement.city;
      data.state = placement.state;
      data.stake = { connect: { id: placement.stakeId } };
      data.ward = { connect: { id: placement.wardId } };
    }

    await this.prisma.participant.update({
      where: { id },
      data,
    });

    const fieldsToSync = { ...(dynamicFields ?? {}) };
    if (typeChanged || type !== undefined) {
      fieldsToSync[MEMBER_FIELD_NAME] = this.miembroValueForType(nextType);
    }
    if (nextType !== ParticipantType.MEMBER && (typeChanged || dynamicFields !== undefined)) {
      const activeFields = await this.prisma.fieldDefinition.findMany({
        where: { active: true },
        select: { name: true },
      });
      for (const field of activeFields) {
        if (field.name === MEMBER_FIELD_NAME) continue;
        fieldsToSync[field.name] = false;
      }
    }

    const names = Object.keys(fieldsToSync);
    if (names.length > 0) {
      const fieldRows = await this.prisma.fieldDefinition.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true },
      });
      const fieldByName = new Map(fieldRows.map((f) => [f.name, f.id]));

      await Promise.all(
        Object.entries(fieldsToSync).map(([name, value]) => {
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
