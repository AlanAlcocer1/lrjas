import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { mexicoDateKey } from '../../common/mexico-time';
import { ParticipaYaWasapClient } from './participa-ya-wasap.client';

function fullName(p: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [p.firstName, p.middleName, p.lastName, p.motherLastName]
    .filter(Boolean)
    .join(' ');
}

function shortName(p: {
  firstName: string;
  lastName: string;
}) {
  return [p.firstName, p.lastName].filter(Boolean).join(' ');
}

const participantSelect = {
  id: true,
  code: true,
  firstName: true,
  middleName: true,
  lastName: true,
  motherLastName: true,
  active: true,
} as const;

@Injectable()
export class ParticipaYaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParticipaYaService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastCronDateKey: string | null = null;

  constructor(
    private prisma: PrismaService,
    private wasap: ParticipaYaWasapClient,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    // Chequeo cada 30s; dispara una vez al día a la hora México configurada.
    this.timer = setInterval(() => {
      void this.maybeSendDaily();
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  normalizeCode(code: string) {
    const digits = String(code || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.padStart(3, '0').slice(-3);
  }

  private mapEntry(row: {
    id: string;
    score: number;
    updatedAt: Date;
    participant: {
      id: string;
      code: string;
      firstName: string;
      middleName: string | null;
      lastName: string;
      motherLastName: string;
    };
  }) {
    return {
      id: row.id,
      score: row.score,
      updatedAt: row.updatedAt.toISOString(),
      code: row.participant.code,
      name: shortName(row.participant),
      fullName: fullName(row.participant),
      participantId: row.participant.id,
    };
  }

  async ranking(limit = 100) {
    const take = Math.min(Math.max(Math.floor(limit) || 100, 1), 500);
    const rows = await this.prisma.participaYaEntry.findMany({
      orderBy: [{ score: 'desc' }, { updatedAt: 'asc' }],
      take,
      include: { participant: { select: participantSelect } },
    });
    const entries = rows.map((r, i) => ({
      rank: i + 1,
      ...this.mapEntry(r),
    }));
    const latest = rows[0]?.updatedAt ?? null;
    return {
      title: 'Participa Ya',
      updatedAt: latest ? latest.toISOString() : null,
      count: entries.length,
      entries,
    };
  }

  async listAdmin() {
    return this.ranking(500);
  }

  async upsert(codeRaw: string, score: number, updatedById: string) {
    const code = this.normalizeCode(codeRaw);
    if (!code) throw new NotFoundException('Código inválido');

    const participant = await this.prisma.participant.findFirst({
      where: { code, active: true },
      select: participantSelect,
    });
    if (!participant) {
      throw new NotFoundException(
        `No se encontró un usuario activo con el código ${code}`,
      );
    }

    const row = await this.prisma.participaYaEntry.upsert({
      where: { participantId: participant.id },
      create: {
        participantId: participant.id,
        score,
        updatedById,
      },
      update: {
        score,
        updatedById,
      },
      include: { participant: { select: participantSelect } },
    });

    return this.mapEntry(row);
  }

  async remove(id: string) {
    try {
      await this.prisma.participaYaEntry.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new NotFoundException('Entrada no encontrada');
    }
  }

  formatMessage(entries: Array<{
    rank: number;
    code: string;
    name: string;
    score: number;
  }>) {
    const today = new Date().toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const intro = [
      '🏆 Participa Ya',
      '',
      `Este es el ranking al día de hoy (${today}).`,
      'Top 10 de quienes más nombres han registrado. ¡Sigan así!',
      '',
    ].join('\n');

    if (!entries.length) {
      return `${intro}Todavía no hay registros. ¡Anímate a participar!`;
    }

    const lines = entries.map(
      (e) => `${e.rank}. ${e.name} (${e.code}) · ${e.score}`,
    );
    return [
      intro + lines.join('\n'),
      '',
      '¿Quieres subir? Sigue sumando nombres y mira el ranking en lrjasmerida.me',
    ].join('\n');
  }

  async buildRankingMessage(limit = 10) {
    const data = await this.ranking(limit);
    return this.formatMessage(data.entries);
  }

  async whatsappStatus() {
    const wasapUrl = this.wasap.configuredUrl();
    if (!this.wasap.configured()) {
      return {
        configured: false,
        connected: false,
        hasQr: false,
        wasapUrl,
        lastError: 'WASAP_URL / WASAP_INTERNAL_TOKEN no configurados',
        cronHint: this.cronHint(),
      };
    }
    try {
      const s = await this.wasap.status();
      return { configured: true, wasapUrl, ...s, cronHint: this.cronHint() };
    } catch (err) {
      const http = err as { message?: string | string[]; response?: { message?: string | string[] } };
      const raw = http.response?.message ?? http.message ?? (err as Error).message;
      const lastError = Array.isArray(raw) ? raw.join(', ') : String(raw);
      return {
        configured: true,
        connected: false,
        hasQr: false,
        wasapUrl,
        lastError,
        cronHint: this.cronHint(),
      };
    }
  }

  async whatsappQr() {
    return this.wasap.qr();
  }

  async whatsappReconnect() {
    try {
      const s = await this.wasap.reconnect();
      return {
        configured: true,
        wasapUrl: this.wasap.configuredUrl(),
        connected: Boolean(s.connected),
        hasQr: Boolean(s.hasQr),
        lastError: s.lastError ?? null,
        cronHint: this.cronHint(),
      };
    } catch (err) {
      const http = err as { message?: string | string[]; response?: { message?: string | string[] } };
      const raw = http.response?.message ?? http.message ?? (err as Error).message;
      const lastError = Array.isArray(raw) ? raw.join(', ') : String(raw);
      return {
        configured: true,
        wasapUrl: this.wasap.configuredUrl(),
        connected: false,
        hasQr: false,
        lastError,
        cronHint: this.cronHint(),
      };
    }
  }

  async sendNow() {
    const message = await this.buildRankingMessage(10);
    await this.wasap.send(message);
    return { ok: true, message };
  }

  /** Fijo: 09:00 hora México. */
  cronHint() {
    return '0 9 * * *';
  }

  /** Parsea "m H * * *" (minuto hora) en hora México. */
  private cronMatchesNow(cronExpr: string, now = new Date()): boolean {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length < 2) return false;
    const minute = Number(parts[0]);
    const hour = Number(parts[1]);
    if (!Number.isFinite(minute) || !Number.isFinite(hour)) return false;

    const partsMx = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const h = Number(partsMx.find((p) => p.type === 'hour')?.value);
    const m = Number(partsMx.find((p) => p.type === 'minute')?.value);
    return h === hour && m === minute;
  }

  private async maybeSendDaily() {
    if (!this.wasap.configured()) return;
    const cronExpr = this.cronHint();
    if (!this.cronMatchesNow(cronExpr)) return;

    const today = mexicoDateKey();
    if (this.lastCronDateKey === today) return;
    this.lastCronDateKey = today;

    try {
      this.logger.log(`Enviando ranking diario Participa Ya (${today})…`);
      await this.sendNow();
      this.logger.log('Ranking diario enviado.');
    } catch (err) {
      this.logger.error(
        `Fallo envío diario Participa Ya: ${(err as Error).message}`,
      );
      // Permitir reintento el mismo día si falló (p.ej. QR pendiente).
      this.lastCronDateKey = null;
    }
  }
}
