import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
// sharp 0.35 tipa el namespace sin call signature en `import =`; el runtime sí es callable.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as (
  input: Buffer,
  options?: { failOn?: string },
) => {
  rotate: () => {
    resize: (opts: object) => {
      webp: (opts: object) => { toBuffer: () => Promise<Buffer> };
    };
  };
};
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';

const MAX_BYTES = 100 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const BLOCKED_VIDEO = /^(video\/|application\/octet)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** Polaroid 4:5 fijo — todas las fotos salen al mismo tamaño en el reel. */
const POLAROID_WIDTH = 800;
const POLAROID_HEIGHT = 1000;
const WEBP_QUALITY = Number(process.env.WEBP_QUALITY || 85) || 85;

@Injectable()
export class AnniversaryMemoriesService {
  constructor(
    private prisma: PrismaService,
    private r2: R2Service,
  ) {}

  /**
   * Lista paginada. `from`/`to` (AAAA-MM-DD, inclusivos) filtran por fecha del
   * recuerdo: el micrositio pide cada capítulo mensual por separado.
   */
  async list(params: { limit?: number; offset?: number; from?: string; to?: string } = {}) {
    const take = Math.min(Math.max(params.limit ?? 100, 1), 1000);
    const skip = Math.max(params.offset ?? 0, 0);
    const memoryDate: { gte?: Date; lte?: Date } = {};
    if (params.from) memoryDate.gte = this.parseRangeDate(params.from);
    if (params.to) memoryDate.lte = this.parseRangeDate(params.to);
    const rows = await this.prisma.anniversaryMemory.findMany({
      where: { active: true, ...(params.from || params.to ? { memoryDate } : {}) },
      orderBy: [{ memoryDate: 'asc' }, { createdAt: 'asc' }],
      take,
      skip,
    });
    return rows.map((row, i) => this.map(row, skip + i));
  }

  /** Conteo de recuerdos por día: el micrositio arma los capítulos con esto. */
  async summary() {
    const groups = await this.prisma.anniversaryMemory.groupBy({
      by: ['memoryDate'],
      where: { active: true },
      _count: { _all: true },
      orderBy: { memoryDate: 'asc' },
    });
    const days = groups.map((g) => ({
      date: g.memoryDate.toISOString().slice(0, 10),
      count: g._count._all,
    }));
    return { total: days.reduce((n, d) => n + d.count, 0), days };
  }

  private parseRangeDate(raw: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException('Rango de fechas inválido (usa AAAA-MM-DD)');
    }
    return new Date(`${raw}T00:00:00.000Z`);
  }

  private map(
    row: {
      id: string;
      authorName: string;
      memoryDate: Date;
      caption: string;
      imageUrl: string;
      createdAt: Date;
    },
    index: number,
  ) {
    return {
      id: row.id,
      authorName: row.authorName,
      memoryDate: row.memoryDate.toISOString().slice(0, 10),
      caption: row.caption,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt.toISOString(),
      side: index % 2 === 0 ? ('odd' as const) : ('even' as const),
    };
  }

  async create(input: {
    authorName: string;
    memoryDate: string;
    caption: string;
    file?: Express.Multer.File;
  }) {
    if (!this.r2.isConfigured()) {
      throw new ServiceUnavailableException(
        'Subida no disponible: configura Cloudflare R2 en el servidor',
      );
    }

    const authorName = input.authorName?.trim();
    const caption = input.caption?.trim();
    if (!authorName || authorName.length < 2 || authorName.length > 80) {
      throw new BadRequestException('Nombre inválido (2–80 caracteres)');
    }
    if (!caption || caption.length < 3 || caption.length > 280) {
      throw new BadRequestException('Texto inválido (3–280 caracteres)');
    }

    const date = this.parseDate(input.memoryDate);
    const file = input.file;
    if (!file?.buffer?.length) {
      throw new BadRequestException('Falta la foto');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('La foto no puede superar 100 MB');
    }
    const mime = (file.mimetype || '').toLowerCase();
    const original = (file.originalname || '').toLowerCase();
    if (BLOCKED_VIDEO.test(mime) || /\.(mp4|mov|webm|avi|mkv)$/i.test(original)) {
      throw new BadRequestException('Solo se permiten fotos, no videos');
    }
    if (!ALLOWED.has(mime) && !(mime.startsWith('image/') && IMAGE_EXT.test(original))) {
      throw new BadRequestException('Formato no soportado. Usa JPG, PNG o WebP');
    }

    let webp: Buffer;
    try {
      // cover + exacto 800×1000 → mismas proporciones en todas las polaroids
      webp = await sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize({
          width: POLAROID_WIDTH,
          height: POLAROID_HEIGHT,
          fit: 'cover',
          position: 'centre',
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException('No se pudo procesar la imagen');
    }

    const uploaded = await this.r2.uploadWebp(webp, 'images/anniversary');

    const row = await this.prisma.anniversaryMemory.create({
      data: {
        authorName,
        memoryDate: date,
        caption,
        imageUrl: uploaded.url,
        imageKey: uploaded.key,
      },
    });

    return this.map(row, 0);
  }

  private parseDate(value: string) {
    const raw = value?.trim();
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException('Fecha inválida (usa AAAA-MM-DD)');
    }
    const d = new Date(`${raw}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }
    const min = new Date('2025-11-01T00:00:00.000Z');
    const max = new Date('2026-12-31T23:59:59.999Z');
    if (d < min || d > max) {
      throw new BadRequestException('La fecha debe estar entre nov 2025 y dic 2026');
    }
    const today = new Date();
    if (d > today) {
      throw new BadRequestException('La fecha no puede ser futura');
    }
    return d;
  }

  async remove(id: string) {
    const row = await this.prisma.anniversaryMemory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Recuerdo no encontrado');
    await this.r2.deleteObject(row.imageKey);
    await this.prisma.anniversaryMemory.delete({ where: { id } });
    return { ok: true as const, id };
  }
}
