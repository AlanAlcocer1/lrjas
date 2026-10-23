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

/** Campos Pro: si el plan no los admite, se reintenta sin ellos. */
const PRO_IMAGE_KEYS = ['color', 'logoURL', 'wideLogoURL', 'iconURL', 'locations'] as const;

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
    const normalized = /^\d+$/.test(code.trim())
      ? code.trim().padStart(3, '0')
      : code.trim().toUpperCase();

    const participant = await this.prisma.participant.findUnique({
      where: { code: normalized },
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

  async getOrCreateByCode(code: string) {
    const normalized = /^\d+$/.test(code.trim())
      ? code.trim().padStart(3, '0')
      : code.trim().toUpperCase();

    const participant = await this.prisma.participant.findUnique({
      where: { code: normalized },
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

    const name = fullName(participant);
    const logoURL = this.logoUrl();
    const wideLogoURL = this.wideLogoUrl();
    const iconURL = this.iconUrl();

    // Fondo: crema de la web (--color-muted #f4f8ef). color es Pro; logos/locations también.
    const payload: Record<string, unknown> = {
      barcodeValue: participant.code,
      barcodeFormat: 'QR',
      barcodeAltText: participant.code,
      logoText: 'LRJAS',
      organizationName: 'LRJAS',
      description: `Credencial LRJAS — ${name}`,
      colorPreset: 'green',
      color: '#f4f8ef',
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
      // Lock-screen near venue (Pro en Pass Anatomy; se quita en reintento free).
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

    if (!data) {
      for (const key of PRO_IMAGE_KEYS) {
        delete payload[key];
      }
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
