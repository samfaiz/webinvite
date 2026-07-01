import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Authenticated encryption for secrets stored at rest (AES-256-GCM — the
 * bank-standard for reversible data-at-rest). The 256-bit key is derived from
 * the SECRETS_KEY env var (never stored in the DB). API keys are ENCRYPTED, not
 * hashed, because we must decrypt them to call the provider; the UI only ever
 * shows a masked preview.
 *
 * Ciphertext format: "v1.<iv b64>.<authTag b64>.<ciphertext b64>".
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;
  private readonly dedicated: boolean;

  constructor(config: ConfigService) {
    const master = config.get<string>('SECRETS_KEY');
    if (master && master.length >= 16) {
      this.dedicated = true;
      this.key = scryptSync(master, 'webinvite-secrets-v1', 32);
    } else {
      // Fallback so the feature works out of the box; a dedicated SECRETS_KEY is
      // strongly recommended in production (rotating JWT_SECRET would orphan secrets).
      this.dedicated = false;
      this.key = scryptSync((config.get<string>('JWT_SECRET') || 'insecure-dev-secret') + '::secrets', 'webinvite-secrets-v1', 32);
      this.logger.warn('SECRETS_KEY not set — deriving the encryption key from JWT_SECRET. Set a dedicated SECRETS_KEY in production.');
    }
  }

  /** True when a dedicated SECRETS_KEY is configured (vs the JWT_SECRET fallback). */
  hasDedicatedKey(): boolean {
    return this.dedicated;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
  }

  /** Returns null if the blob can't be decrypted (wrong key / tampered / legacy). */
  decrypt(blob: string): string | null {
    try {
      const [v, ivB64, tagB64, ctB64] = blob.split('.');
      if (v !== 'v1' || !ivB64 || !tagB64 || !ctB64) return null;
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  }

  isEncrypted(value: string | null | undefined): boolean {
    return !!value && value.startsWith('v1.');
  }

  /** Masked preview for display, e.g. "sk-ant…AB12" — never reveals the secret. */
  mask(secret: string | null | undefined): string {
    if (!secret) return '';
    if (secret.length <= 8) return '••••';
    return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
  }
}
