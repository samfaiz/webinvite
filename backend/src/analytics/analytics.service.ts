import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GaService } from './ga.service';

const BOT =
  /(bot|crawl|spider|slurp|bing|googlebot|facebookexternalhit|embedly|quora|pinterest|preview|monitor|curl|wget|python-requests|headless|lighthouse|ahrefs|semrush|dataprovider|scan)/i;

function deviceFrom(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod|phone|blackberry|opera mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private ga: GaService,
  ) {}

  /** Anonymous visitor id: sha256(ip + ua + secret + day). Rotates daily so it
   *  can't track across days and never stores raw IP — privacy-friendly. */
  private visitorHash(ip: string, ua: string): string {
    const salt = (this.config.get<string>('JWT_SECRET') || 'salt') + new Date().toISOString().slice(0, 10);
    return createHash('sha256').update(`${ip}|${ua}|${salt}`).digest('hex').slice(0, 16);
  }

  private selfHost(): string | null {
    try {
      return new URL((this.config.get<string>('FRONTEND_ORIGIN') || '').split(',')[0]).hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  private referrerHost(referrer?: string): string | null {
    if (!referrer) return null;
    try {
      const h = new URL(referrer).hostname.replace(/^www\./, '');
      if (!h || h === this.selfHost()) return null;
      return h.slice(0, 120);
    } catch {
      return null;
    }
  }

  /** Record a pageview. Never throws — a tracking beacon must not break a page. */
  async collect(input: { ip: string; ua: string; path: string; referrer?: string }) {
    try {
      const ua = input.ua || '';
      if (BOT.test(ua)) return;
      const path = input.path;
      if (!path || typeof path !== 'string' || !path.startsWith('/') || path.length > 512) return;
      await this.prisma.pageView.create({
        data: {
          path: path.split('?')[0].slice(0, 512),
          referrer: this.referrerHost(input.referrer),
          device: deviceFrom(ua),
          visitor: this.visitorHash(input.ip || '0.0.0.0', ua),
        },
      });
    } catch (e) {
      this.logger.debug(`collect failed: ${(e as Error).message}`);
    }
  }

  async summary(days = 30) {
    const d = Math.min(365, Math.max(1, Math.floor(days) || 30));
    const from = new Date(Date.now() - d * 86_400_000);
    const where = { createdAt: { gte: from } };

    const [views, visitorRows, rows, topPages, referrers, devices] = await Promise.all([
      this.prisma.pageView.count({ where }),
      this.prisma.pageView.findMany({ where, distinct: ['visitor'], select: { visitor: true } }),
      this.prisma.pageView.findMany({ where, select: { createdAt: true, visitor: true } }),
      this.prisma.pageView.groupBy({
        by: ['path'],
        where,
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
      this.prisma.pageView.groupBy({ by: ['referrer'], where, _count: { _all: true } }),
      this.prisma.pageView.groupBy({ by: ['device'], where, _count: { _all: true } }),
    ]);

    // daily time series (fill gaps with zeroes)
    const buckets = new Map<string, { views: number; visitors: Set<string> }>();
    for (let i = d - 1; i >= 0; i--) {
      const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      buckets.set(key, { views: 0, visitors: new Set() });
    }
    for (const r of rows) {
      const b = buckets.get(r.createdAt.toISOString().slice(0, 10));
      if (b) {
        b.views++;
        b.visitors.add(r.visitor);
      }
    }
    const timeseries = [...buckets.entries()].map(([date, b]) => ({ date, views: b.views, visitors: b.visitors.size }));

    const sortViews = <T extends { views: number }>(a: T[]) => a.sort((x, y) => y.views - x.views);

    return {
      range: { days: d },
      totals: { views, visitors: visitorRows.length },
      timeseries,
      topPages: topPages.map((p) => ({ path: p.path, views: p._count.path })),
      referrers: sortViews(referrers.map((r) => ({ source: r.referrer || 'Direct', views: r._count._all }))).slice(0, 8),
      devices: sortViews(devices.map((x) => ({ device: x.device || 'unknown', views: x._count._all }))),
      ga: await this.ga.summary().catch(() => ({ configured: false })),
    };
  }

  /** Views per path (all paths) + total — consumed by the AI SEO layer so the
   *  weekly audit can prioritise low-traffic pages and feed traffic to Claude. */
  async pageStats(days = 30): Promise<{ days: number; totalViews: number; byPath: Record<string, number> }> {
    const d = Math.min(365, Math.max(1, Math.floor(days) || 30));
    const from = new Date(Date.now() - d * 86_400_000);
    const rows = await this.prisma.pageView.groupBy({
      by: ['path'],
      where: { createdAt: { gte: from } },
      _count: { path: true },
    });
    const byPath: Record<string, number> = {};
    let totalViews = 0;
    for (const r of rows) {
      byPath[r.path] = r._count.path;
      totalViews += r._count.path;
    }
    return { days: d, totalViews, byPath };
  }
}
