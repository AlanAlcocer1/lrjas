import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { GENERAL_EVENT_NAME } from '../../bootstrap/ensure-general-event';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.event.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findAllAdmin() {
    return this.prisma.event.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evento no encontrado');
    return event;
  }

  async create(dto: CreateEventDto) {
    const name = dto.name.trim();
    const existing = await this.prisma.event.findUnique({ where: { name } });
    if (existing) throw new ConflictException('Ya existe un evento con ese nombre');

    return this.prisma.event.create({
      data: {
        name,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    const current = await this.findOne(id);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (current.name === GENERAL_EVENT_NAME && name !== GENERAL_EVENT_NAME) {
        throw new BadRequestException('No se puede renombrar el evento General');
      }
      const clash = await this.prisma.event.findFirst({
        where: { name, NOT: { id } },
      });
      if (clash) throw new ConflictException('Ya existe un evento con ese nombre');
      dto.name = name;
    }

    if (dto.active === false && current.name === GENERAL_EVENT_NAME) {
      throw new BadRequestException('No se puede desactivar el evento General');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    if (current.name === GENERAL_EVENT_NAME) {
      throw new BadRequestException('No se puede eliminar el evento General');
    }
    return this.prisma.event.update({
      where: { id },
      data: { active: false },
    });
  }
}
