import { Injectable, Logger } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import { IntegrationsService } from '../secrets/integrations.service';

/**
 * Google Analytics 4 reporting via the Data API (REST — no gRPC/native deps).
 * Property id + service account come from Admin → Integrations (or env). When
 * unset, reports { configured: false }. The client rebuilds when the admin
 * changes the credentials — no restart needed.
 */
@Injectable()
export class GaService {
  private readonly logger = new Logger(GaService.name);
  private cache: { fingerprint: string; jwt: JWT; propertyId: string } | null = null;

  constructor(private integrations: IntegrationsService) {}

  async isConfigured(): Promise<boolean> {
    return !!(await this.integrations.getGaConfig());
  }

  private async getClient(): Promise<{ jwt: JWT; propertyId: string } | null> {
    const cfg = await this.integrations.getGaConfig();
    if (!cfg) {
      this.cache = null;
      return null;
    }
    const fingerprint = `${cfg.propertyId}|${cfg.serviceAccountJson.length}`;
    if (!this.cache || this.cache.fingerprint !== fingerprint) {
      const creds = JSON.parse(cfg.serviceAccountJson) as { client_email: string; private_key: string };
      const jwt = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
      this.cache = { fingerprint, jwt, propertyId: cfg.propertyId.replace(/^properties\//, '') };
    }
    return this.cache;
  }

  private async runReport(client: { jwt: JWT; propertyId: string }, body: Record<string, unknown>): Promise<any> {
    const { token } = await client.jwt.getAccessToken();
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${client.propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GA API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  async summary() {
    let client: { jwt: JWT; propertyId: string } | null;
    try {
      client = await this.getClient();
    } catch {
      return { configured: true as const, error: 'The service-account JSON is invalid.' };
    }
    if (!client) return { configured: false as const };
    try {
      const range = [{ startDate: '28daysAgo', endDate: 'today' }];
      const totals = await this.runReport(client, {
        dateRanges: range,
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      });
      const top = await this.runReport(client, {
        dateRanges: range,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      });
      const m = totals.rows?.[0]?.metricValues ?? [];
      return {
        configured: true as const,
        range: '28d',
        users: Number(m[0]?.value ?? 0),
        sessions: Number(m[1]?.value ?? 0),
        pageviews: Number(m[2]?.value ?? 0),
        topPages: (top.rows ?? []).map((r: any) => ({
          path: r.dimensionValues[0].value,
          views: Number(r.metricValues[0].value),
        })),
      };
    } catch (e) {
      this.logger.error(`GA report failed: ${(e as Error).message}`);
      return { configured: true as const, error: (e as Error).message };
    }
  }

  /** For the "Test" button — returns ok/error. */
  async test(): Promise<{ ok: boolean; error?: string }> {
    const s = await this.summary();
    if (!s.configured) return { ok: false, error: 'Property id and/or service account not set' };
    if ('error' in s && s.error) return { ok: false, error: s.error };
    return { ok: true };
  }
}
