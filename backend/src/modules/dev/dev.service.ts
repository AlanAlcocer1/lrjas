import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DevService {
  constructor(private prisma: PrismaService) {}

  async executeReadOnlyQuery(query: string) {
    const sql = this.sanitizeQuery(query);
    const started = Date.now();

    try {
      const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
      const serialized = rows.map((row) => this.serializeRow(row));

      return {
        rows: serialized,
        rowCount: serialized.length,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al ejecutar la consulta';
      throw new BadRequestException(message);
    }
  }

  private sanitizeQuery(query: string): string {
    const sql = query.trim().replace(/;+\s*$/g, '');
    if (!sql) throw new BadRequestException('Consulta vacía');

    const firstWord = sql.split(/\s+/)[0]?.toUpperCase();
    const allowed = ['SELECT', 'WITH', 'EXPLAIN', 'SHOW', 'TABLE'];
    if (!firstWord || !allowed.includes(firstWord)) {
      throw new BadRequestException('Solo se permiten SELECT, WITH, EXPLAIN, SHOW o TABLE');
    }

    const forbidden =
      /\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|COPY|CALL|DO)\b/i;
    if (forbidden.test(sql)) {
      throw new BadRequestException('Operación no permitida en consola de desarrollo');
    }

    if (sql.includes(';')) {
      throw new BadRequestException('Solo una consulta a la vez');
    }

    return sql;
  }

  private serializeRow(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'bigint') out[key] = value.toString();
      else if (value instanceof Date) out[key] = value.toISOString();
      else if (Buffer.isBuffer(value)) out[key] = value.toString('hex');
      else out[key] = value;
    }
    return out;
  }
}
