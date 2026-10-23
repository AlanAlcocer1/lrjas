import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

const WALLET_API = 'https://api.walletwallet.dev/api/passes';

/** Imágenes / locations Pro. El `color` crema se conserva en el 1er reintento. */
const PRO_OPTIONAL_KEYS = ['logoURL', 'wideLogoURL', 'iconURL', 'locations'] as const;

/** Fondo blanco arena del front (gradient-mesh / raffle cream), no el leaf #84BD31. */
const PASS_BG_COLOR = '#f7fbf0';

type WalletWalletCreateResponse = {
  serialNumber: string;
  googleSaveUrl?: string;
  applePass?: string;
  shareUrl?: string;
};

function fullName(p: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  motherLastName: string;
}) {
  return [p.firstName, p.middleName, p.lastName, p.motherLastName].filter(Boolean).join(' ');
}

function isWalletImageRef(value: string): boolean {
  return (
    value.startsWith('data:image/png;base64,') ||
    value.startsWith('https://')
  );
}

function normalizeCode(code: string) {
  const trimmed = code.trim();
  return /^\d+$/.test(trimmed) ? trimmed.padStart(3, '0') : trimmed.toUpperCase();
}

@Injectable()
export class WalletPassesService {
  constructor(private prisma: PrismaService) {}

  private apiKey() {
    const key = process.env.WALLETWALLET_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'Pases no configurados (falta WALLETWALLET_API_KEY en el servidor)',
      );
    }
    return key;
  }

  /** Lee PNG local → data URI (aceptado por WalletWallet; no requiere HTTPS público). */
  private localPngDataUri(filename: string): string | undefined {
    const candidates = [
      join(process.cwd(), 'assets', 'wallet', filename),
      join(__dirname, '..', '..', '..', 'assets', 'wallet', filename),
    ];
    for (const path of candidates) {
      if (!existsSync(path)) continue;
      const buf = readFileSync(path);
      if (buf.length > 1024 * 1024) {
        console.warn(`Wallet pass image too large (>1MB): ${path}`);
        continue;
      }
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    return undefined;
  }

  /**
   * logoURL (Pro): square ~160×160, HTTPS o data URI PNG.
   * Preferencia: WALLET_PASS_LOGO_URL (https) → isotipo embebido.
   */
  private logoUrl(): string | undefined {
    const explicit = process.env.WALLET_PASS_LOGO_URL?.trim();
    if (explicit) {
      if (!isWalletImageRef(explicit)) {
        console.warn(
          'WALLET_PASS_LOGO_URL ignorada: WalletWallet solo acepta HTTPS o data:image/png;base64',
        );
      } else {
        return explicit;
      }
    }
    return this.localPngDataUri('isotipo-verde.png');
  }

  /** wideLogoURL (Pro): wordmark ~1280×400; Google lo usa arriba y oculta logoText. */
  private wideLogoUrl(): string | undefined {
    const explicit = process.env.WALLET_PASS_WIDE_LOGO_URL?.trim();
    if (explicit && isWalletImageRef(explicit)) return explicit;
    return this.localPngDataUri('imagotipo-verde.png');
  }

  /** iconURL (Pro): ~120×120 para notificaciones lock-screen (distinto del logo del face). */
  private iconUrl(): string | undefined {
    const explicit = process.env.WALLET_PASS_ICON_URL?.trim();
    if (explicit && isWalletImageRef(explicit)) return explicit;
    return this.localPngDataUri('isotipo-verde.png');
  }

  private mapPass(row: {
    serialNumber: string;
    shareUrl: string;
    googleSaveUrl: string | null;
    applePassBase64: string | null;
    createdAt: Date;
  }) {
    return {
      serialNumber: row.serialNumber,
      shareUrl: row.shareUrl,
      googleSaveUrl: row.googleSaveUrl,
      hasApplePass: Boolean(row.applePassBase64),
      createdAt: row.createdAt,
    };
  }

  async findByCode(code: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { code: normalizeCode(code) },
      include: { walletPass: true },
    });
    if (!participant || !participant.active) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!participant.walletPass) {
      return { exists: false as const, participantCode: participant.code };
    }
    return {
      exists: true as const,
      participantCode: participant.code,
      pass: this.mapPass(participant.walletPass),
    };
  }

  async listAdmin(opts?: { limit?: number; code?: string }) {
    const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 500);
    const code = opts?.code?.trim() ? normalizeCode(opts.code) : undefined;

    const rows = await this.prisma.walletPass.findMany({
      where: code ? { participant: { code } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        participant: {
          select: {
            code: true,
            firstName: true,
            middleName: true,
            lastName: true,
            motherLastName: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      serialNumber: row.serialNumber,
      shareUrl: row.shareUrl,
      googleSaveUrl: row.googleSaveUrl,
      hasApplePass: Boolean(row.applePassBase64),
      createdAt: row.createdAt,
      participant: {
        code: row.participant.code,
        fullName: fullName(row.participant),
      },
    }));
  }

  async getOrCreateByCode(code: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { code: normalizeCode(code) },
      include: { walletPass: true },
    });
    if (!participant || !participant.active) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (participant.walletPass) {
      return {
        created: false as const,
        participantCode: participant.code,
        pass: this.mapPass(participant.walletPass),
      };
    }

    return this.createForParticipant(participant);
  }

  private async createForParticipant(participant: {
    id: string;
    code: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    motherLastName: string;
  }) {
    const name = fullName(participant);
    const logoURL = this.logoUrl();
    const wideLogoURL = this.wideLogoUrl();
    const iconURL = this.iconUrl();

    // colorPreset green = acentos free; `color` Pro pinta el fondo blanco arena LRJAS.
    const payload: Record<string, unknown> = {
      barcodeValue: participant.code,
      barcodeFormat: 'QR',
      barcodeAltText: participant.code,
      logoText: 'LRJAS',
      organizationName: 'LRJAS',
      description: `Credencial LRJAS — ${name}`,
      colorPreset: 'green',
      color: PASS_BG_COLOR,
      credentials: 'platform',
      sharingProhibited: true,
      notification: ' ',
      headerFields: [
        {
          label: 'CODIGO',
          value: participant.code,
        },
      ],
      primaryFields: [
        {
          label: 'CODIGO DE ASISTENCIA',
          value: participant.code,
        },
      ],
      secondaryFields: [
        {
          label: 'NOMBRE',
          value: name,
        },
      ],
      locations: [
        {
          latitude: 20.979415268208065,
          longitude: -89.63596174645434,
          relevantText: 'LRJAS',
        },
      ],
    };

    if (logoURL) payload.logoURL = logoURL;
    if (wideLogoURL) payload.wideLogoURL = wideLogoURL;
    if (iconURL) payload.iconURL = iconURL;

    let data = await this.createRemotePass(payload, true);

    // 1er reintento: quitar logos/locations, conservar fondo crema.
    if (!data) {
      for (const key of PRO_OPTIONAL_KEYS) {
        delete payload[key];
      }
      data = await this.createRemotePass(payload, true);
    }

    // 2º: sin color custom (queda colorPreset green — solo si Pro falla del todo).
    if (!data) {
      delete payload.color;
      data = await this.createRemotePass(payload, false);
    }

    if (!data?.serialNumber || !data.shareUrl) {
      throw new BadRequestException('No se pudo crear el pase en WalletWallet');
    }

    const saved = await this.prisma.walletPass.create({
      data: {
        participantId: participant.id,
        serialNumber: data.serialNumber,
        shareUrl: data.shareUrl,
        googleSaveUrl: data.googleSaveUrl ?? null,
        applePassBase64: data.applePass ?? null,
      },
    });

    return {
      created: true as const,
      participantCode: participant.code,
      pass: this.mapPass(saved),
    };
  }

  private async revokeRemote(serialNumber: string) {
    try {
      const res = await fetch(`${WALLET_API}/${encodeURIComponent(serialNumber)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.apiKey()}` },
      });
      if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => '');
        console.warn('WalletWallet revoke failed:', res.status, text.slice(0, 200));
      }
    } catch (err) {
      console.warn('WalletWallet revoke error:', err);
    }
  }

  /** Elimina el pase local y lo invalida en WalletWallet. */
  async removeById(id: string) {
    const row = await this.prisma.walletPass.findUnique({
      where: { id },
      include: {
        participant: {
          select: {
            code: true,
            firstName: true,
            middleName: true,
            lastName: true,
            motherLastName: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Pase no encontrado');

    await this.revokeRemote(row.serialNumber);
    await this.prisma.walletPass.delete({ where: { id: row.id } });

    return {
      ok: true as const,
      id: row.id,
      serialNumber: row.serialNumber,
      participantCode: row.participant.code,
      fullName: fullName(row.participant),
    };
  }

  /** Revoca el pase actual y emite uno nuevo con el branding vigente. */
  async regenerateById(id: string) {
    const row = await this.prisma.walletPass.findUnique({
      where: { id },
      include: { participant: true },
    });
    if (!row) throw new NotFoundException('Pase no encontrado');
    if (!row.participant.active) {
      throw new BadRequestException('El usuario está inactivo');
    }

    await this.revokeRemote(row.serialNumber);
    await this.prisma.walletPass.delete({ where: { id: row.id } });

    const created = await this.createForParticipant(row.participant);
    return {
      ok: true as const,
      participantCode: created.participantCode,
      pass: created.pass,
    };
  }

  private async createRemotePass(
    payload: Record<string, unknown>,
    softFail: boolean,
  ): Promise<WalletWalletCreateResponse | null> {
    const res = await fetch(WALLET_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      if (softFail && (res.status === 400 || res.status === 402 || res.status === 403)) {
        console.warn('WalletWallet create failed, will retry stripped:', res.status, text.slice(0, 300));
        return null;
      }
      throw new BadRequestException(
        `Error WalletWallet (${res.status}): ${text.slice(0, 200) || res.statusText}`,
      );
    }

    return (await res.json()) as WalletWalletCreateResponse;
  }

  async getApplePkpass(code: string): Promise<{ filename: string; buffer: Buffer }> {
    const result = await this.getOrCreateByCode(code);
    const row = await this.prisma.walletPass.findUnique({
      where: { serialNumber: result.pass.serialNumber },
    });
    if (!row?.applePassBase64) {
      throw new NotFoundException('Pase de Apple no disponible. Usa el enlace de instalación.');
    }
    return {
      filename: `lrjas-${result.participantCode}.pkpass`,
      buffer: Buffer.from(row.applePassBase64, 'base64'),
    };
  }
}
