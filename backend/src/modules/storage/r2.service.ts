import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Cliente S3-compatible para Cloudflare R2.
 * Mismas variables que blog eca 360 (Coolify):
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET, R2_PUBLIC_BASE_URL, R2_PREFIX (opcional),
 *   R2_ACCOUNT_ID (opcional si ya va en R2_ENDPOINT)
 */
@Injectable()
export class R2Service {
  private client: S3Client | null = null;

  private getConfig() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    const bucket = process.env.R2_BUCKET?.trim();
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const endpoint =
      process.env.R2_ENDPOINT?.trim()?.replace(/\/$/, '') ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
    const publicBaseUrl = (
      process.env.R2_PUBLIC_BASE_URL?.trim() ||
      process.env.R2_PUBLIC_URL?.trim() ||
      ''
    ).replace(/\/$/, '');
    const prefix = (process.env.R2_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');

    if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicBaseUrl) {
      return null;
    }
    return { accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl, prefix };
  }

  private withPrefix(key: string) {
    const cfg = this.getConfig();
    const clean = (key || '').replace(/^\/+/, '');
    if (!cfg?.prefix) return clean;
    if (clean === cfg.prefix || clean.startsWith(`${cfg.prefix}/`)) return clean;
    return `${cfg.prefix}/${clean}`;
  }

  private getClient(): S3Client {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'R2 incompleto: define R2_ENDPOINT (o R2_ACCOUNT_ID), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET y R2_PUBLIC_BASE_URL',
      );
    }
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: cfg.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  isConfigured() {
    return Boolean(this.getConfig());
  }

  async uploadWebp(
    buffer: Buffer,
    folder = 'anniversary',
  ): Promise<{ key: string; url: string }> {
    const cfg = this.getConfig();
    if (!cfg) {
      throw new ServiceUnavailableException(
        'R2 incompleto: define R2_ENDPOINT (o R2_ACCOUNT_ID), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET y R2_PUBLIC_BASE_URL',
      );
    }
    const key = this.withPrefix(`${folder}/${randomUUID()}.webp`);
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: `${cfg.publicBaseUrl}/${key}` };
  }

  async deleteObject(key: string) {
    const cfg = this.getConfig();
    if (!cfg || !key) return;
    try {
      await this.getClient().send(
        new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
      );
    } catch (err) {
      console.warn('R2 delete failed:', err);
    }
  }
}
