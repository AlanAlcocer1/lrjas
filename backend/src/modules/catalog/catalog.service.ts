import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStakeDto, CreateWardDto, UpdateStakeDto, UpdateWardDto } from './dto/catalog.dto';
import {
  NONE_STAKE_NAME,
  NONE_WARD_NAME,
  sortStakesWithNingunoFirst,
} from '../../bootstrap/ensure-ninguno-stake';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getStakes() {
    const stakes = await this.prisma.stake.findMany({
      where: { active: true },
      include: {
        wards: { where: { active: true }, orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    return sortStakesWithNingunoFirst(stakes);
  }

  async findAllAdmin() {
    const stakes = await this.prisma.stake.findMany({
      include: {
        wards: { orderBy: { name: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    return sortStakesWithNingunoFirst(stakes);
  }

  async getWardsByStake(stakeId: string) {
    return this.prisma.ward.findMany({
      where: { stakeId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async createStake(dto: CreateStakeDto) {
    const name = dto.name.trim();
    if (name === NONE_STAKE_NAME) throw new ConflictException('Este nombre está reservado');
    const existing = await this.prisma.stake.findUnique({ where: { name } });
    if (existing) throw new ConflictException('La estaca ya existe');

    return this.prisma.stake.create({
      data: { name },
      include: { wards: true },
    });
  }

  async updateStake(id: string, dto: UpdateStakeDto) {
    const stake = await this.findStake(id);
    if (stake.name === NONE_STAKE_NAME) {
      if (dto.active === false) throw new BadRequestException('No se puede desactivar la opción Ninguno');
      if (dto.name && dto.name.trim() !== NONE_STAKE_NAME) {
        throw new BadRequestException('No se puede renombrar la opción Ninguno');
      }
    }
    if (dto.name) {
      const name = dto.name.trim();
      const existing = await this.prisma.stake.findFirst({
        where: { name, NOT: { id } },
      });
      if (existing) throw new ConflictException('La estaca ya existe');
    }

    return this.prisma.stake.update({
      where: { id },
      data: dto.name ? { ...dto, name: dto.name.trim() } : dto,
      include: { wards: { orderBy: { name: 'asc' } } },
    });
  }

  async createWard(stakeId: string, dto: CreateWardDto) {
    const stake = await this.findStake(stakeId);
    if (!stake.active) throw new BadRequestException('La estaca está inactiva');

    const name = dto.name.trim();
    if (stake.name === NONE_STAKE_NAME || name === NONE_WARD_NAME) {
      throw new ConflictException('Este nombre está reservado');
    }
    const existing = await this.prisma.ward.findUnique({
      where: { name_stakeId: { name, stakeId } },
    });
    if (existing) throw new ConflictException('El barrio ya existe en esta estaca');

    return this.prisma.ward.create({
      data: { name, stakeId },
    });
  }

  async updateWard(id: string, dto: UpdateWardDto) {
    const ward = await this.findWard(id);
    if (ward.name === NONE_WARD_NAME) {
      if (dto.active === false) throw new BadRequestException('No se puede desactivar la opción Ninguno');
      if (dto.name && dto.name.trim() !== NONE_WARD_NAME) {
        throw new BadRequestException('No se puede renombrar la opción Ninguno');
      }
    }
    if (dto.name) {
      const name = dto.name.trim();
      const existing = await this.prisma.ward.findFirst({
        where: { name, stakeId: ward.stakeId, NOT: { id } },
      });
      if (existing) throw new ConflictException('El barrio ya existe en esta estaca');
    }

    return this.prisma.ward.update({
      where: { id },
      data: dto.name ? { ...dto, name: dto.name.trim() } : dto,
    });
  }

  private async findStake(id: string) {
    const stake = await this.prisma.stake.findUnique({ where: { id } });
    if (!stake) throw new NotFoundException('Estaca no encontrada');
    return stake;
  }

  private async findWard(id: string) {
    const ward = await this.prisma.ward.findUnique({ where: { id } });
    if (!ward) throw new NotFoundException('Barrio no encontrado');
    return ward;
  }
}
