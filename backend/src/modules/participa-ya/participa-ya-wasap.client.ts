import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type WasapStatus = {
  connected: boolean;
  hasQr: boolean;
  lastError: string | null;
};

@Injectable()
export class ParticipaYaWasapClient {
  private readonly logger = new Logger(ParticipaYaWasapClient.name);

  constructor(private config: ConfigService) {}

  private baseUrl(): string | null {
    const url = this.config.get<string>('WASAP_URL')?.trim();
    return url || null;
  }

  private token(): string {
    return this.config.get<string>('WASAP_INTERNAL_TOKEN')?.trim() || '';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const base = this.baseUrl();
    if (!base) {
      throw new ServiceUnavailableException(
        'WhatsApp no configurado (WASAP_URL). Arranca el servicio wasap.',
      );
    }
    const token = this.token();
    if (!token) {
      throw new ServiceUnavailableException(
        'Falta WASAP_INTERNAL_TOKEN en el backend.',
      );
    }

    const url = `${base.replace(/\/$/, '')}${path}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(8_000),
      });
    } catch (err) {
      const cause = (err as Error).message || String(err);
      this.logger.warn(`wasap unreachable ${url}: ${cause}`);
      throw new ServiceUnavailableException(
        `No se pudo contactar wasap en ${base} (${cause}). ¿Está el contenedor wasap arriba en la misma red Docker?`,
      );
    }

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!res.ok) {
      const msg =
        (data as { message?: string; error?: string })?.message ||
        (data as { error?: string })?.error ||
        `wasap HTTP ${res.status}`;
      throw new ServiceUnavailableException(msg);
    }
    return data as T;
  }

  status(): Promise<WasapStatus> {
    return this.request<WasapStatus>('GET', '/status');
  }

  qr(): Promise<{ qr: string | null; dataUrl: string | null }> {
    return this.request('GET', '/qr');
  }

  send(message: string): Promise<{ ok: boolean }> {
    return this.request('POST', '/send', { message });
  }

  configured(): boolean {
    return Boolean(this.baseUrl() && this.token());
  }

  configuredUrl(): string | null {
    return this.baseUrl();
  }
}
