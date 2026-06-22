import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePredictionDto, UpdatePredictionDto } from './dto/prediction.dto';
import type { PredictionRecord, PredictionsFile } from './prediction.types';
import {
  allCzechPlayers,
  allMexicoPlayers,
  isDeadlinePassed,
  MATCH_DEADLINE_ISO,
  MATCH_INFO,
} from './match-data';

function formatFullName(parts: {
  firstName: string;
  middleName: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [parts.firstName, parts.middleName, parts.lastName, parts.motherLastName]
    .filter(Boolean)
    .join(' ');
}

@Injectable()
export class PredictionsService {
  private readonly dataPath: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(private prisma: PrismaService) {
    this.dataPath =
      process.env.PRONOSTICOS_DATA_PATH?.trim() ||
      path.join(process.cwd(), 'data', 'predictions.json');
  }

  getMatchInfo() {
    const deadlineAt = MATCH_DEADLINE_ISO;
    const isOpen = !isDeadlinePassed();
    return {
      ...MATCH_INFO,
      deadlineAt,
      isOpen,
      deadlinePassed: !isOpen,
    };
  }

  async findByCode(code: string) {
    const normalized = code.trim().toUpperCase();
    const data = await this.readFile();
    const prediction = data.predictions.find((p) => p.participantCode === normalized) ?? null;
    const match = this.getMatchInfo();
    return {
      ...match,
      prediction,
      hasPrediction: !!prediction,
    };
  }

  async findAllAdmin() {
    const data = await this.readFile();
    return data.predictions
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(dto: CreatePredictionDto) {
    if (isDeadlinePassed()) {
      throw new ForbiddenException('Ya pasó la fecha límite para enviar pronósticos');
    }

    const participant = await this.prisma.participant.findFirst({
      where: { code: dto.participantCode.trim().toUpperCase(), active: true },
      select: {
        code: true,
        firstName: true,
        middleName: true,
        lastName: true,
        motherLastName: true,
      },
    });
    if (!participant) {
      throw new NotFoundException('Usuario no encontrado o inactivo');
    }

    this.validateScoresAndScorers(dto);

    return this.withLock(async () => {
      const data = await this.readFile();
      const code = participant.code;
      if (data.predictions.some((p) => p.participantCode === code)) {
        throw new ConflictException('Este usuario ya envió un pronóstico. No se puede modificar.');
      }

      const now = new Date().toISOString();
      const prediction: PredictionRecord = {
        id: randomUUID(),
        participantCode: code,
        participantName: formatFullName(participant),
        mexicoScore: dto.mexicoScore,
        czechScore: dto.czechScore,
        mexicoScorers: dto.mexicoScorers,
        czechScorers: dto.czechScorers,
        createdAt: now,
        updatedAt: now,
      };

      data.predictions.push(prediction);
      await this.writeFile(data);
      return prediction;
    });
  }

  async update(id: string, dto: UpdatePredictionDto) {
    this.validateScoresAndScorers(dto);

    return this.withLock(async () => {
      const data = await this.readFile();
      const index = data.predictions.findIndex((p) => p.id === id);
      if (index < 0) throw new NotFoundException('Pronóstico no encontrado');

      const current = data.predictions[index];
      data.predictions[index] = {
        ...current,
        mexicoScore: dto.mexicoScore,
        czechScore: dto.czechScore,
        mexicoScorers: dto.mexicoScorers,
        czechScorers: dto.czechScorers,
        updatedAt: new Date().toISOString(),
      };

      await this.writeFile(data);
      return data.predictions[index];
    });
  }

  async remove(id: string) {
    return this.withLock(async () => {
      const data = await this.readFile();
      const index = data.predictions.findIndex((p) => p.id === id);
      if (index < 0) throw new NotFoundException('Pronóstico no encontrado');
      const [removed] = data.predictions.splice(index, 1);
      await this.writeFile(data);
      return removed;
    });
  }

  private validateScoresAndScorers(dto: {
    mexicoScore: number;
    czechScore: number;
    mexicoScorers: string[];
    czechScorers: string[];
  }) {
    const mexicoPlayers = new Set(allMexicoPlayers());
    const czechPlayers = new Set(allCzechPlayers());

    if (dto.mexicoScorers.length !== dto.mexicoScore) {
      throw new BadRequestException(
        `Debes elegir ${dto.mexicoScore} goleador(es) de México`,
      );
    }

    if (dto.czechScorers.length !== dto.czechScore) {
      throw new BadRequestException(
        `Debes elegir ${dto.czechScore} goleador(es) de República Checa`,
      );
    }

    for (const scorer of dto.mexicoScorers) {
      if (!mexicoPlayers.has(scorer)) {
        throw new BadRequestException(`Goleador inválido para México: ${scorer}`);
      }
    }

    for (const scorer of dto.czechScorers) {
      if (!czechPlayers.has(scorer)) {
        throw new BadRequestException(`Goleador inválido para Chequia: ${scorer}`);
      }
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.writeLock.then(fn);
    this.writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async readFile(): Promise<PredictionsFile> {
    await this.ensureFile();
    const raw = await fs.readFile(this.dataPath, 'utf8');
    try {
      const parsed = JSON.parse(raw) as PredictionsFile;
      if (!Array.isArray(parsed.predictions)) {
        return { predictions: [] };
      }
      return parsed;
    } catch {
      return { predictions: [] };
    }
  }

  private async writeFile(data: PredictionsFile) {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    await fs.writeFile(this.dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  private async ensureFile() {
    await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
    try {
      await fs.access(this.dataPath);
    } catch {
      await fs.writeFile(this.dataPath, JSON.stringify({ predictions: [] }, null, 2), 'utf8');
    }
  }
}
