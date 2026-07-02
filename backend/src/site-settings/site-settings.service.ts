import { Injectable } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/**
 * Singleton "site settings" for the whole marketing site — branding, hero
 * copy, contact info, socials, theme, etc. Stored as key/value rows under the
 * `site.*` namespace in the existing `Setting` table, so we can add new fields
 * without new migrations.
 *
 * Only the Branding tab is wired for now; Hero & messaging / Contact /
 * Location / Social & footer / Theme / SEO & analytics / SEO Algorithm get
 * pass-through storage but no dedicated typed accessors yet.
 */

const PREFIX = 'site.';
const B = 'branding.'; // sub-namespace for branding fields
const H = 'hero.';     // sub-namespace for hero & messaging fields
const C = 'contact.';  // sub-namespace for contact fields
const S = 'social.';   // sub-namespace for social & footer fields
const T = 'theme.';    // sub-namespace for theme (colors + fonts)
const O = 'seo.';      // sub-namespace for site-wide SEO defaults

export type SiteBranding = {
  brandName: string;
  logo: string;
  logoDark: string;
  favicon: string;
};

export type SiteHero = {
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  valueProposition: string;
  mission: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
};

export type SiteContact = {
  contactEmail: string;
  careersEmail: string;
  phone: string;
  responseTime: string;
  address: string;
  officeHours: string;
  calendarUrl: string;
};

export type SocialLink = { platform: string; url: string };

export type SiteSocial = {
  links: SocialLink[];
  footerMessage: string;
  copyrightText: string;
};

/**
 * Runtime theme — accent colour (buttons, links, active states) and font
 * picks. Injected into every page via <ThemeInjector> as CSS custom
 * properties, so anything reading `var(--c-primary)` or `var(--f-headings)`
 * re-skins the moment an admin saves. Empty strings = keep the built-in
 * default (site defaults to the warm coral/wine palette in globals.css).
 */
export type SiteTheme = {
  /** Light-mode accents (hex like "#d95f48" or empty). */
  accent: string;
  accentSoft: string;
  textOnAccent: string;
  /** Optional dark-mode overrides — applied under [data-theme="dark"]. */
  accentDark: string;
  accentSoftDark: string;
  textOnAccentDark: string;
  /** Curated font keys resolved to next/font CSS variables by the frontend. */
  fontHeadings: string;
  fontBody: string;
  fontMono: string;
};

/** Site-wide SEO + Organization structured-data defaults. Individual pages
 *  can override any of these; when they don't, these fall through as the
 *  default meta title/description/og image + schema.org JSON-LD identity. */
export type SiteSeo = {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  /** Fallback keywords used when a page hasn't set its own tags. */
  keywords: string[];
  /** Facebook / Meta ad pixel ID (numeric, injected via a small snippet). */
  metaPixelId: string;
  /** schema.org Organization variant — "Organization" | "LocalBusiness" | ... */
  orgSchemaType: string;
  /** Year the organisation was founded, as displayed in JSON-LD. */
  orgFoundedYear: string;
};

export type SiteSettings = {
  /** Stable id so the admin list can render a real row. */
  id: string;
  branding: SiteBranding;
  hero: SiteHero;
  contact: SiteContact;
  social: SiteSocial;
  theme: SiteTheme;
  seo: SiteSeo;
  updatedAt: string | null;
};

@Injectable()
export class SiteSettingsService {
  /** Fixed id — there is only ever one site-settings record. */
  static readonly ID = 'site-1';

  constructor(private settings: SettingsService) {}

  async getAll(): Promise<SiteSettings> {
    const all = await this.settings.getAll();
    const get = (k: string) => all[PREFIX + k] ?? '';
    return {
      id: SiteSettingsService.ID,
      branding: {
        brandName: get(B + 'brandName'),
        logo: get(B + 'logo'),
        logoDark: get(B + 'logoDark'),
        favicon: get(B + 'favicon'),
      },
      hero: {
        tagline: get(H + 'tagline'),
        heroHeadline: get(H + 'heroHeadline'),
        heroSubheadline: get(H + 'heroSubheadline'),
        valueProposition: get(H + 'valueProposition'),
        mission: get(H + 'mission'),
        primaryCtaLabel: get(H + 'primaryCtaLabel'),
        primaryCtaUrl: get(H + 'primaryCtaUrl'),
      },
      contact: {
        contactEmail: get(C + 'contactEmail'),
        careersEmail: get(C + 'careersEmail'),
        phone: get(C + 'phone'),
        responseTime: get(C + 'responseTime'),
        address: get(C + 'address'),
        officeHours: get(C + 'officeHours'),
        calendarUrl: get(C + 'calendarUrl'),
      },
      social: {
        links: this.parseLinks(all[PREFIX + S + 'links']),
        footerMessage: get(S + 'footerMessage'),
        copyrightText: get(S + 'copyrightText'),
      },
      theme: {
        accent: get(T + 'accent'),
        accentSoft: get(T + 'accentSoft'),
        textOnAccent: get(T + 'textOnAccent'),
        accentDark: get(T + 'accentDark'),
        accentSoftDark: get(T + 'accentSoftDark'),
        textOnAccentDark: get(T + 'textOnAccentDark'),
        fontHeadings: get(T + 'fontHeadings'),
        fontBody: get(T + 'fontBody'),
        fontMono: get(T + 'fontMono'),
      },
      seo: {
        metaTitle: get(O + 'metaTitle'),
        metaDescription: get(O + 'metaDescription'),
        ogImage: get(O + 'ogImage'),
        keywords: this.parseKeywords(all[PREFIX + O + 'keywords']),
        metaPixelId: get(O + 'metaPixelId'),
        orgSchemaType: get(O + 'orgSchemaType'),
        orgFoundedYear: get(O + 'orgFoundedYear'),
      },
      updatedAt: all[PREFIX + '_updatedAt'] || null,
    };
  }

  private parseKeywords(raw?: string): string[] {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  private parseLinks(raw?: string): SocialLink[] {
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((l): l is SocialLink => !!l && typeof l.platform === 'string' && typeof l.url === 'string')
        .map((l) => ({ platform: l.platform.trim(), url: l.url.trim() }))
        .filter((l) => l.platform.length > 0);
    } catch {
      return [];
    }
  }

  /** Safe subset for public consumers (site nav, hero, contact page, footer, theme, SEO, favicon). */
  async getPublic(): Promise<{
    branding: SiteBranding;
    hero: SiteHero;
    contact: SiteContact;
    social: SiteSocial;
    theme: SiteTheme;
    seo: SiteSeo;
  }> {
    const s = await this.getAll();
    return {
      branding: s.branding,
      hero: s.hero,
      contact: s.contact,
      social: s.social,
      theme: s.theme,
      seo: s.seo,
    };
  }

  /**
   * Partial upsert — only the fields present in the payload are written.
   * `social.links` accepts partially-filled rows (the admin form sends rows
   * mid-edit) and the writer below trims + drops incomplete entries before
   * they hit storage.
   */
  async update(input: {
    branding?: Partial<SiteBranding>;
    hero?: Partial<SiteHero>;
    contact?: Partial<SiteContact>;
    social?: {
      links?: Array<{ platform?: string; url?: string }>;
      footerMessage?: string;
      copyrightText?: string;
    };
    theme?: Partial<SiteTheme>;
    seo?: Partial<SiteSeo>;
  }): Promise<SiteSettings> {
    const patch: Record<string, string> = {};
    if (input.branding) {
      const b = input.branding;
      if (b.brandName !== undefined) patch[PREFIX + B + 'brandName'] = b.brandName ?? '';
      if (b.logo !== undefined) patch[PREFIX + B + 'logo'] = b.logo ?? '';
      if (b.logoDark !== undefined) patch[PREFIX + B + 'logoDark'] = b.logoDark ?? '';
      if (b.favicon !== undefined) patch[PREFIX + B + 'favicon'] = b.favicon ?? '';
    }
    if (input.hero) {
      const h = input.hero;
      if (h.tagline !== undefined) patch[PREFIX + H + 'tagline'] = h.tagline ?? '';
      if (h.heroHeadline !== undefined) patch[PREFIX + H + 'heroHeadline'] = h.heroHeadline ?? '';
      if (h.heroSubheadline !== undefined) patch[PREFIX + H + 'heroSubheadline'] = h.heroSubheadline ?? '';
      if (h.valueProposition !== undefined) patch[PREFIX + H + 'valueProposition'] = h.valueProposition ?? '';
      if (h.mission !== undefined) patch[PREFIX + H + 'mission'] = h.mission ?? '';
      if (h.primaryCtaLabel !== undefined) patch[PREFIX + H + 'primaryCtaLabel'] = h.primaryCtaLabel ?? '';
      if (h.primaryCtaUrl !== undefined) patch[PREFIX + H + 'primaryCtaUrl'] = h.primaryCtaUrl ?? '';
    }
    if (input.contact) {
      const c = input.contact;
      if (c.contactEmail !== undefined) patch[PREFIX + C + 'contactEmail'] = c.contactEmail ?? '';
      if (c.careersEmail !== undefined) patch[PREFIX + C + 'careersEmail'] = c.careersEmail ?? '';
      if (c.phone !== undefined) patch[PREFIX + C + 'phone'] = c.phone ?? '';
      if (c.responseTime !== undefined) patch[PREFIX + C + 'responseTime'] = c.responseTime ?? '';
      if (c.address !== undefined) patch[PREFIX + C + 'address'] = c.address ?? '';
      if (c.officeHours !== undefined) patch[PREFIX + C + 'officeHours'] = c.officeHours ?? '';
      if (c.calendarUrl !== undefined) patch[PREFIX + C + 'calendarUrl'] = c.calendarUrl ?? '';
    }
    if (input.social) {
      const s = input.social;
      if (s.links !== undefined) {
        // Whitelist + trim in one pass so we never persist junk.
        const cleaned = (Array.isArray(s.links) ? s.links : [])
          .filter(
            (l): l is { platform: string; url: string } =>
              !!l && typeof l.platform === 'string' && typeof l.url === 'string',
          )
          .map((l) => ({
            platform: l.platform.trim().toLowerCase().slice(0, 40),
            url: l.url.trim().slice(0, 500),
          }))
          .filter((l) => l.platform.length > 0);
        patch[PREFIX + S + 'links'] = JSON.stringify(cleaned);
      }
      if (s.footerMessage !== undefined) patch[PREFIX + S + 'footerMessage'] = s.footerMessage ?? '';
      if (s.copyrightText !== undefined) patch[PREFIX + S + 'copyrightText'] = s.copyrightText ?? '';
    }
    if (input.theme) {
      const t = input.theme;
      const normHex = (v?: string) => (v ?? '').trim();
      if (t.accent !== undefined) patch[PREFIX + T + 'accent'] = normHex(t.accent);
      if (t.accentSoft !== undefined) patch[PREFIX + T + 'accentSoft'] = normHex(t.accentSoft);
      if (t.textOnAccent !== undefined) patch[PREFIX + T + 'textOnAccent'] = normHex(t.textOnAccent);
      if (t.accentDark !== undefined) patch[PREFIX + T + 'accentDark'] = normHex(t.accentDark);
      if (t.accentSoftDark !== undefined) patch[PREFIX + T + 'accentSoftDark'] = normHex(t.accentSoftDark);
      if (t.textOnAccentDark !== undefined) patch[PREFIX + T + 'textOnAccentDark'] = normHex(t.textOnAccentDark);
      if (t.fontHeadings !== undefined) patch[PREFIX + T + 'fontHeadings'] = (t.fontHeadings ?? '').trim();
      if (t.fontBody !== undefined) patch[PREFIX + T + 'fontBody'] = (t.fontBody ?? '').trim();
      if (t.fontMono !== undefined) patch[PREFIX + T + 'fontMono'] = (t.fontMono ?? '').trim();
    }
    if (input.seo) {
      const o = input.seo;
      if (o.metaTitle !== undefined) patch[PREFIX + O + 'metaTitle'] = o.metaTitle ?? '';
      if (o.metaDescription !== undefined) patch[PREFIX + O + 'metaDescription'] = o.metaDescription ?? '';
      if (o.ogImage !== undefined) patch[PREFIX + O + 'ogImage'] = o.ogImage ?? '';
      if (o.keywords !== undefined) {
        const clean = (Array.isArray(o.keywords) ? o.keywords : [])
          .map((k) => String(k).trim())
          .filter(Boolean)
          .slice(0, 30);
        patch[PREFIX + O + 'keywords'] = JSON.stringify(clean);
      }
      if (o.metaPixelId !== undefined) patch[PREFIX + O + 'metaPixelId'] = (o.metaPixelId ?? '').trim();
      if (o.orgSchemaType !== undefined) patch[PREFIX + O + 'orgSchemaType'] = (o.orgSchemaType ?? '').trim();
      if (o.orgFoundedYear !== undefined) patch[PREFIX + O + 'orgFoundedYear'] = (o.orgFoundedYear ?? '').trim();
    }
    if (Object.keys(patch).length) {
      patch[PREFIX + '_updatedAt'] = new Date().toISOString();
      await this.settings.setMany(patch);
    }
    return this.getAll();
  }

  /** Wipe every `site.*` key. Called by the admin "Delete" button. */
  async reset(): Promise<SiteSettings> {
    const all = await this.settings.getAll();
    const clearing: Record<string, string> = {};
    for (const key of Object.keys(all)) {
      if (key.startsWith(PREFIX)) clearing[key] = '';
    }
    if (Object.keys(clearing).length) {
      await this.settings.setMany(clearing);
    }
    return this.getAll();
  }
}
