import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';

/**
 * Google Analytics 4 reporting via the Data API (REST — no gRPC/native deps).
 * Enabled only when GA4_PROPERTY_ID and a service-account key
 * (GA_SERVICE_ACCOUNT_JSON) are set; otherwise reports { configured: false }.
 */
@Injectable()
export class GaService {
  private readonly logger = new Logger(GaService.name);
  private jwt: JWT | null = null;
  private propertyId: string | null = null;

  constructor(private config: ConfigService) {
    const propId = this.config.get<string>('GA4_PROPERTY_ID');
    const credsRaw = this.config.get<string>('GA_SERVICE_ACCOUNT_JSON');
    if (propId && credsRaw) {
      try {
        const creds = JSON.parse(credsRaw) as { client_email: string; private_key: string };
        this.jwt = new JWT({
          email: creds.client_email,
          key: creds.private_key,
          scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        });
        this.propertyId = propId.replace(/^properties\//, '');
        this.logger.log('Google Analytics reporting enabled');
      } catch {
        this.logger.error('GA_SERVICE_ACCOUNT_JSON is not valid JSON — GA reporting disabled');
      }
    }
  }

  isConfigured(): boolean {
    return !!this.jwt;
  }

  private async runReport(body: Record<string, unknown>): Promise<any> {
    const { token } = await this.jwt!.getAccessToken();
    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${this.propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`GA API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }

  async summary() {
    if (!this.jwt) return { configured: false as const };
    try {
      const range = [{ startDate: '28daysAgo', endDate: 'today' }];
      const totals = await this.runReport({
        dateRanges: range,
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
      });
      const top = await this.runReport({
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
}
