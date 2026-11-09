import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { getMexicoDayBoundsFromKey } from '../../common/mexico-time';
import { CreateRaffleTicketDto } from './dto/raffle.dto';

function formatFolio(folio: number): string {
  return String(folio).padStart(5, '0');
}

function fullName(p: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [p.firstName, p.middleName, p.lastName, p.motherLastName].filter(Boolean).join(' ');
}

const participantSelect = {
  id: true,
  code: true,
  firstName: true,
  middleName: true,
  lastName: true,
  motherLastName: true,
} as const;

const createdBySelect = {
  id: true,
  username: true,
  name: true,
} as const;

@Injectable()
export class RaffleService {
  constructor(private prisma: PrismaService) {}

  private mapTicket(t: {
    id: string;
    folio: number;
    createdAt: Date;
    participant: {
      id: string;
      code: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
      motherLastName: string;
    };
    createdBy?: { id: string; username: string; name: string } | null;
  }) {
    return {
      id: t.id,
      folio: t.folio,
      folioLabel: formatFolio(t.folio),
      createdAt: t.createdAt,
      participant: {
        id: t.participant.id,
        code: t.participant.code,
        fullName: fullName(t.participant),
      },
      createdBy: t.createdBy
        ? {
            id: t.createdBy.id,
            username: t.createdBy.username,
            name: t.createdBy.name,
          }
        : null,
    };
  }

  private normalizeCode(code: string) {
    const trimmed = code.trim().toUpperCase();
    return /^\d+$/.test(trimmed) ? trimmed.padStart(3, '0') : trimmed;
  }

  async create(dto: CreateRaffleTicketDto, createdById: string) {
    const code = this.normalizeCode(dto.code);
    const participant = await this.prisma.participant.findUnique({ where: { code } });
    if (!participant || !participant.active) {
      throw new NotFoundException('No se encontró un usuario activo con ese código');
    }

    const ticket = await this.prisma.raffleTicket.create({
      data: {
        participantId: participant.id,
        createdById,
      },
      include: {
        participant: { select: participantSelect },
        createdBy: { select: createdBySelect },
      },
    });

    return this.mapTicket(ticket);
  }

  /**
   * Genera `quantity` boletos por cada código (mismo admin en createdBy).
   * Máx. 500 boletos por request.
   */
  async createBulk(input: { codes: string[]; quantity: number }, createdById: string) {
    const quantity = Math.min(Math.max(Math.floor(input.quantity) || 1, 1), 50);
    const codes = [
      ...new Set(
        (input.codes ?? [])
          .map((c) => this.normalizeCode(String(c || '')))
          .filter(Boolean),
      ),
    ];
    if (codes.length === 0) {
      throw new BadRequestException('Indica al menos un código');
    }
    if (codes.length * quantity > 500) {
      throw new BadRequestException('Máximo 500 boletos por operación');
    }

    const participants = await this.prisma.participant.findMany({
      where: { code: { in: codes }, active: true },
      select: { id: true, code: true },
    });
    const byCode = new Map(participants.map((p) => [p.code, p]));
    const missing = codes.filter((c) => !byCode.has(c));
    if (missing.length) {
      throw new NotFoundException(
        missing.length === 1
          ? `No se encontró un usuario activo con el código ${missing[0]}`
          : `Códigos no encontrados o inactivos: ${missing.join(', ')}`,
      );
    }

    const rows = await this.prisma.$transaction(async (tx) => {
      const created = [];
      for (const code of codes) {
        const participant = byCode.get(code)!;
        for (let i = 0; i < quantity; i++) {
          created.push(
            await tx.raffleTicket.create({
              data: {
                participantId: participant.id,
                createdById,
              },
              include: {
                participant: { select: participantSelect },
                createdBy: { select: createdBySelect },
              },
            }),
          );
        }
      }
      return created;
    });

    const tickets = rows.map((t) => this.mapTicket(t));
    return {
      created: tickets.length,
      quantityPerCode: quantity,
      codes: codes.length,
      tickets,
    };
  }

  async lookupByCode(code: string) {
    const normalized = this.normalizeCode(code);
    const participant = await this.prisma.participant.findUnique({
      where: { code: normalized },
      select: {
        id: true,
        code: true,
        firstName: true,
        middleName: true,
        lastName: true,
        motherLastName: true,
        active: true,
      },
    });

    if (!participant || !participant.active) {
      throw new NotFoundException('No se encontró un usuario con ese código');
    }

    const tickets = await this.prisma.raffleTicket.findMany({
      where: { participantId: participant.id },
      orderBy: { folio: 'asc' },
      select: { id: true, folio: true, createdAt: true },
    });

    return {
      participant: {
        code: participant.code,
        fullName: fullName(participant),
      },
      total: tickets.length,
      tickets: tickets.map((t) => ({
        id: t.id,
        folio: t.folio,
        folioLabel: formatFolio(t.folio),
        createdAt: t.createdAt,
      })),
    };
  }

  private buildWhere(opts: { code?: string; date?: string } = {}): Prisma.RaffleTicketWhereInput {
    const where: Prisma.RaffleTicketWhereInput = {};

    if (opts.code?.trim()) {
      where.participant = { code: this.normalizeCode(opts.code) };
    }

    if (opts.date?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(opts.date.trim())) {
      const { start, end } = getMexicoDayBoundsFromKey(opts.date.trim());
      where.createdAt = { gte: start, lt: end };
    }

    return where;
  }

  async list(
    opts: {
      limit?: number;
      code?: string;
      date?: string;
      orderBy?: 'createdAt' | 'folio';
    } = {},
  ) {
    const limit = Math.min(Math.max(opts.limit ?? 40, 1), 5000);
    const orderField = opts.orderBy ?? 'createdAt';
    const tickets = await this.prisma.raffleTicket.findMany({
      where: this.buildWhere(opts),
      take: limit,
      orderBy: orderField === 'folio' ? { folio: 'asc' } : { createdAt: 'desc' },
      include: {
        participant: { select: participantSelect },
        createdBy: { select: createdBySelect },
      },
    });
    return tickets.map((t) => this.mapTicket(t));
  }

  /**
   * Sorteo uniforme: cada boleto tiene la misma probabilidad (crypto.randomInt).
   * Opcionalmente filtra por día (México) y excluye IDs ya sorteados en la sesión.
   */
  async draw(opts: { date?: string; excludeIds?: string[] } = {}) {
    const where: Prisma.RaffleTicketWhereInput = {
      ...this.buildWhere({ date: opts.date }),
    };
    const excludeIds = (opts.excludeIds ?? []).filter(Boolean);
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    const count = await this.prisma.raffleTicket.count({ where });
    if (count === 0) {
      throw new BadRequestException('No hay boletos para sortear con esos filtros');
    }

    const index = randomInt(0, count);
    const winnerRow = await this.prisma.raffleTicket.findMany({
      where,
      skip: index,
      take: 1,
      orderBy: { folio: 'asc' },
      include: {
        participant: { select: participantSelect },
        createdBy: { select: createdBySelect },
      },
    });

    const winner = winnerRow[0];
    if (!winner) {
      throw new BadRequestException('No se pudo elegir un boleto');
    }

    return {
      totalInPool: count,
      winnerIndex: index,
      winner: this.mapTicket(winner),
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.raffleTicket.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Boleto no encontrado');
    }
    await this.prisma.raffleTicket.delete({ where: { id } });
    return { ok: true, folioLabel: formatFolio(existing.folio) };
  }
}
