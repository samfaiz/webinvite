import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';
import { CryptoService } from './crypto.service';

const K = {
  aiKey: 'ai.apiKey',
  aiModel: 'ai.model',
  auditCron: 'seo.auditCron',
  gaMeasurement: 'ga.measurementId',
  gaProperty: 'ga.propertyId',
  gaServiceAccount: 'ga.serviceAccountJson',
} as const;

export type UpdateIntegrationsDto = {
  aiApiKey?: string;
  clearAiApiKey?: boolean;
  aiModel?: string;
  auditCron?: boolean;
  gaMeasurementId?: string;
  gaPropertyId?: string;
  gaServiceAccountJson?: string;
  clearGaServiceAccount?: boolean;
};

/**
 * Single source of truth for integration config. Admin-set values live in the
 * Setting table (secrets encrypted via CryptoService); if unset, we fall back to
 * environment variables. The rest of the app asks this service — it never reads
 * ANTHROPIC/GA config directly.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private settings: SettingsService,
    private crypto: CryptoService,
    private config: ConfigService,
  ) {}

  /** Read + decrypt an at-rest secret (tolerates a legacy plaintext value). */
  private async secret(key: string): Promise<string | null> {
    const v = await this.settings.get(key);
    if (!v) return null;
    return this.crypto.isEncrypted(v) ? this.crypto.decrypt(v) : v;
  }

  /* ------------------------- resolvers (DB → env) ------------------------- */

  async getAiKey(): Promise<string | null> {
    return (await this.secret(K.aiKey)) || this.config.get<string>('ANTHROPIC_API_KEY') || null;
  }

  async getAiModel(): Promise<string> {
    return (
      (await this.settings.get(K.aiModel)) ||
      this.config.get<string>('ANTHROPIC_MODEL') ||
      'claude-sonnet-4-6'
    );
  }

  async getAuditCronEnabled(): Promise<boolean> {
    const v = (await this.settings.get(K.auditCron)) ?? this.config.get<string>('SEO_AUDIT_CRON') ?? 'on';
    return v.toLowerCase() !== 'off';
  }

  async getGaMeasurementId(): Promise<string | null> {
    return (await this.settings.get(K.gaMeasurement)) || this.config.get<string>('GA4_MEASUREMENT_ID') || null;
  }

  async getGaConfig(): Promise<{ propertyId: string; serviceAccountJson: string } | null> {
    const propertyId = (await this.settings.get(K.gaProperty)) || this.config.get<string>('GA4_PROPERTY_ID') || '';
    const serviceAccountJson = (await this.secret(K.gaServiceAccount)) || this.config.get<string>('GA_SERVICE_ACCOUNT_JSON') || '';
    if (!propertyId || !serviceAccountJson) return null;
    return { propertyId, serviceAccountJson };
  }

  /* ----------------------------- admin surface ---------------------------- */

  private saEmail(saJson: string | null): string {
    if (!saJson) return '';
    try {
      const j = JSON.parse(saJson) as { client_email?: string };
      return j.client_email || 'service account';
    } catch {
      return 'service account';
    }
  }

  async getStatus() {
    const [aiKey, model, gaMeasurement, gaPropRaw, gaSa, auditCron, aiKeyRaw, gaSaRaw] = await Promise.all([
      this.getAiKey(),
      this.getAiModel(),
      this.getGaMeasurementId(),
      this.settings.get(K.gaProperty),
      this.secret(K.gaServiceAccount),
      this.getAuditCronEnabled(),
      this.settings.get(K.aiKey),
      this.settings.get(K.gaServiceAccount),
    ]);
    return {
      encryption: { dedicatedKey: this.crypto.hasDedicatedKey() },
      ai: {
        model,
        hasKey: !!aiKey,
        keyPreview: this.crypto.mask(aiKey),
        source: this.crypto.isEncrypted(aiKeyRaw) ? 'admin' : aiKey ? 'env' : null,
      },
      seo: { auditCron },
      ga: {
        measurementId: gaMeasurement || '',
        propertyId: gaPropRaw || this.config.get<string>('GA4_PROPERTY_ID') || '',
        hasServiceAccount: !!gaSa,
        serviceAccountPreview: this.saEmail(gaSa),
        source: this.crypto.isEncrypted(gaSaRaw) ? 'admin' : gaSa ? 'env' : null,
      },
    };
  }

  async update(dto: UpdateIntegrationsDto) {
    const entries: Record<string, string | undefined> = {};
    if (dto.aiModel !== undefined) entries[K.aiModel] = dto.aiModel.trim();
    if (dto.auditCron !== undefined) entries[K.auditCron] = dto.auditCron ? 'on' : 'off';
    if (dto.gaMeasurementId !== undefined) entries[K.gaMeasurement] = dto.gaMeasurementId.trim();
    if (dto.gaPropertyId !== undefined) entries[K.gaProperty] = dto.gaPropertyId.trim();

    // secrets: only overwrite when a new non-empty value is supplied; clear via flag
    if (dto.clearAiApiKey) entries[K.aiKey] = '';
    else if (dto.aiApiKey && dto.aiApiKey.trim()) entries[K.aiKey] = this.crypto.encrypt(dto.aiApiKey.trim());

    if (dto.clearGaServiceAccount) entries[K.gaServiceAccount] = '';
    else if (dto.gaServiceAccountJson && dto.gaServiceAccountJson.trim())
      entries[K.gaServiceAccount] = this.crypto.encrypt(dto.gaServiceAccountJson.trim());

    await this.settings.setMany(entries);
    return this.getStatus();
  }
}
