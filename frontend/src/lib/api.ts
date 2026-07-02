/**
 * Thin client for the NestJS backend. Token is kept in localStorage (Phase 5);
 * every authed request attaches it as a Bearer header.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const TOKEN_KEY = "wedding-auth-token";

export const tokenStore = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T = any>(
  path: string,
  opts: RequestInit = {},
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (auth) {
    const t = tokenStore.get();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `Request failed (${res.status})`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null as T;
  return res.json();
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

export const api = {
  // auth
  register: (body: { email: string; password: string; name?: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => request<AuthUser>("/auth/me", {}, true),

  // invitations (owner)
  listInvitations: () => request<any[]>("/invitations", {}, true),
  getInvitation: (id: string) => request<any>(`/invitations/${id}`, {}, true),
  createInvitation: (body: any) =>
    request<any>("/invitations", { method: "POST", body: JSON.stringify(body) }, true),
  updateInvitation: (id: string, body: any) =>
    request<any>(`/invitations/${id}`, { method: "PUT", body: JSON.stringify(body) }, true),
  publishInvitation: (id: string) =>
    request<any>(`/invitations/${id}/publish`, { method: "POST" }, true),
  unpublishInvitation: (id: string) =>
    request<any>(`/invitations/${id}/unpublish`, { method: "POST" }, true),
  deleteInvitation: (id: string) =>
    request<any>(`/invitations/${id}`, { method: "DELETE" }, true),
  listRsvps: (id: string) => request<any>(`/invitations/${id}/rsvps`, {}, true),
  sendExport: (id: string) =>
    request<{ sent: boolean; recipient: string; savedTo?: string; count: number }>(
      `/invitations/${id}/send-export`,
      { method: "POST" },
      true,
    ),
  downloadRsvpsXlsx: async (id: string): Promise<Blob> => {
    const t = tokenStore.get();
    const res = await fetch(`${API_BASE}/invitations/${id}/rsvps.xlsx`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
    if (!res.ok) throw new Error(`Download failed (${res.status})`);
    return res.blob();
  },

  // public
  createRsvp: (
    slug: string,
    body: { guestName: string; attending: string; guests?: number; message?: string },
  ) =>
    request<{ ok: boolean }>(`/public/invitations/${slug}/rsvp`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // designs (public catalog)
  listDesigns: () => request<any[]>("/designs"),
  getDesign: (id: string) => request<any>(`/designs/${id}`),

  // designs (admin)
  adminListDesigns: () => request<any[]>("/admin/designs", {}, true),
  createDesign: (body: any) =>
    request<any>("/designs", { method: "POST", body: JSON.stringify(body) }, true),
  updateDesign: (id: string, body: any) =>
    request<any>(`/designs/${id}`, { method: "PUT", body: JSON.stringify(body) }, true),
  deleteDesign: (id: string) =>
    request<any>(`/designs/${id}`, { method: "DELETE" }, true),

  // file upload (multipart; admin) — images and audio
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const t = tokenStore.get();
    const res = await fetch(`${API_BASE}/uploads`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.message || `Upload failed (${res.status})`);
    }
    return res.json();
  },
  uploadAudio: (file: File): Promise<{ url: string }> => api.uploadImage(file),

  // couple media upload (photos / intro video) — any signed-in user
  uploadMedia: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const t = tokenStore.get();
    const res = await fetch(`${API_BASE}/uploads/media`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.message || `Upload failed (${res.status})`);
    }
    return res.json();
  },

  // CMS content (pages + blog posts)
  listPosts: () => request<CmsDoc[]>("/blog"),
  getPost: (slug: string) => request<CmsDoc>(`/blog/${slug}`),
  listPages: () => request<CmsDoc[]>("/pages"),
  getPage: (slug: string) => request<CmsDoc>(`/pages/${slug}`),
  // CMS admin
  adminListContent: (type: "page" | "post") => request<CmsDoc[]>(`/admin/content?type=${type}`, {}, true),
  adminGetContent: (id: string) => request<CmsDoc>(`/admin/content/${id}`, {}, true),
  seedDefaultPages: () =>
    request<{ created: string[]; pages: CmsDoc[] }>(`/admin/content/seed-pages`, { method: "POST" }, true),
  createContent: (body: CmsInput) =>
    request<CmsDoc>("/content", { method: "POST", body: JSON.stringify(body) }, true),
  updateContent: (id: string, body: CmsInput) =>
    request<CmsDoc>(`/content/${id}`, { method: "PUT", body: JSON.stringify(body) }, true),
  publishContent: (id: string) => request<CmsDoc>(`/content/${id}/publish`, { method: "POST" }, true),
  unpublishContent: (id: string) => request<CmsDoc>(`/content/${id}/unpublish`, { method: "POST" }, true),
  deleteContent: (id: string) => request<{ ok: boolean }>(`/content/${id}`, { method: "DELETE" }, true),

  // AI SEO (admin)
  seoStatus: () => request<{ configured: boolean; model: string }>("/admin/seo/status", {}, true),
  seoProposals: (status = "pending") => request<SeoProposal[]>(`/admin/seo/proposals?status=${status}`, {}, true),
  seoInsights: (days = 30) => request<SeoInsights>(`/admin/seo/insights?days=${days}`, {}, true),
  seoRunAudit: () => request<{ proposed: number; skipped: number; total: number }>("/admin/seo/audit", { method: "POST" }, true),
  seoSuggest: (contentId: string) => request<SeoSuggestion>(`/admin/seo/content/${contentId}/suggest`, { method: "POST" }, true),
  seoOptimiseAll: (contentId: string) =>
    request<PageOptimisation>(`/admin/seo/content/${contentId}/optimise-all`, { method: "POST" }, true),
  seoGenerateFaqs: (contentId: string, count?: number) =>
    request<Array<{ question: string; answer: string }>>(
      `/admin/seo/content/${contentId}/faqs`,
      { method: "POST", body: JSON.stringify({ count }) },
      true,
    ),
  seoApprove: (id: string) => request<SeoProposal>(`/admin/seo/proposals/${id}/approve`, { method: "POST" }, true),
  seoReject: (id: string) => request<SeoProposal>(`/admin/seo/proposals/${id}/reject`, { method: "POST" }, true),
  seoBlogDraft: (topic: string, keywords?: string[]) =>
    request<BlogDraft>("/admin/seo/blog-draft", { method: "POST", body: JSON.stringify({ topic, keywords }) }, true),

  // analytics (admin)
  adminAnalytics: (days = 30) => request<AnalyticsSummary>(`/admin/analytics/summary?days=${days}`, {}, true),

  // integrations (admin) — API keys & GA config, secrets encrypted at rest
  getIntegrations: () => request<IntegrationsStatus>("/admin/integrations", {}, true),
  saveIntegrations: (body: IntegrationsUpdate) =>
    request<IntegrationsStatus>("/admin/integrations", { method: "PUT", body: JSON.stringify(body) }, true),
  testAiKey: () => request<{ ok: boolean; error?: string }>("/admin/integrations/test-ai", { method: "POST" }, true),
  testGa: () => request<{ ok: boolean; error?: string }>("/admin/integrations/test-ga", { method: "POST" }, true),

  // music library
  listTracks: () => request<Track[]>("/tracks"),
  adminListTracks: () => request<Track[]>("/admin/tracks", {}, true),
  createTrack: (body: TrackInput) =>
    request<Track>("/tracks", { method: "POST", body: JSON.stringify(body) }, true),
  updateTrack: (id: string, body: TrackInput) =>
    request<Track>(`/tracks/${id}`, { method: "PUT", body: JSON.stringify(body) }, true),
  deleteTrack: (id: string) =>
    request<{ ok: boolean }>(`/tracks/${id}`, { method: "DELETE" }, true),

  // admin
  adminStats: () => request<any>("/admin/stats", {}, true),
  adminInvitations: () => request<any[]>("/admin/invitations", {}, true),
  adminUsers: () => request<any[]>("/admin/users", {}, true),

  // admin — outgoing email settings
  getMailSettings: () => request<MailSettings>("/admin/settings/mail", {}, true),
  saveMailSettings: (body: MailSettingsInput) =>
    request<MailSettings>("/admin/settings/mail", { method: "PUT", body: JSON.stringify(body) }, true),
  testMailSettings: (to: string) =>
    request<{ ok: boolean; live: boolean; from: string; error?: string }>(
      "/admin/settings/mail/test",
      { method: "POST", body: JSON.stringify({ to }) },
      true,
    ),

  // public — landing-page AI assistant
  chat: (messages: { role: "user" | "assistant"; content: string }[]) =>
    request<{ reply: string }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),

  // site settings (Company → Site Settings) — singleton row
  getSiteSettings: () => request<SiteSettings>("/admin/site-settings", {}, true),
  saveSiteSettings: (body: SiteSettingsInput) =>
    request<SiteSettings>("/admin/site-settings", { method: "PUT", body: JSON.stringify(body) }, true),
  resetSiteSettings: () => request<SiteSettings>("/admin/site-settings", { method: "DELETE" }, true),
  publicSiteSettings: () => request<PublicSiteSettings>("/site-settings/public"),

  // contact form (public + admin inbox)
  submitContactMessage: (body: ContactMessageInput) =>
    request<{ ok: true; receivedAt: string }>("/contact/messages", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  adminListContactMessages: (status?: "new" | "read" | "replied") =>
    request<ContactMessage[]>(
      `/admin/contact/messages${status ? `?status=${status}` : ""}`,
      {},
      true,
    ),
  adminContactUnread: () => request<{ count: number }>("/admin/contact/messages/unread-count", {}, true),
  adminMarkContactRead: (id: string) =>
    request<ContactMessage>(`/admin/contact/messages/${id}/read`, { method: "POST" }, true),
  adminMarkContactReplied: (id: string) =>
    request<ContactMessage>(`/admin/contact/messages/${id}/replied`, { method: "POST" }, true),
  adminDeleteContactMessage: (id: string) =>
    request<{ ok: true }>(`/admin/contact/messages/${id}`, { method: "DELETE" }, true),

  // SEO Algorithm (Site Settings → SEO Algorithm)
  getSeoAlgorithm: () => request<SeoAlgorithm>("/admin/seo-algorithm", {}, true),
  saveSeoAlgorithm: (body: SeoAlgorithmInput) =>
    request<SeoAlgorithm>("/admin/seo-algorithm", { method: "PUT", body: JSON.stringify(body) }, true),
  resetSeoAlgorithm: () =>
    request<SeoAlgorithm>("/admin/seo-algorithm/reset-to-default", { method: "POST" }, true),
  improveSeoAlgorithmDraft: () =>
    request<{ algorithm: string; learningMemory: string; rationale: string }>(
      "/admin/seo-algorithm/improve-draft",
      { method: "POST" },
      true,
    ),
  runSeoAlgorithmNow: () =>
    request<{ algorithm: string; learningMemory: string; rationale: string; dto: SeoAlgorithm }>(
      "/admin/seo-algorithm/run-now",
      { method: "POST" },
      true,
    ),
  getSeoAlgorithmVersion: (id: string) =>
    request<SeoAlgorithmVersion>(`/admin/seo-algorithm/versions/${id}`, {}, true),
  restoreSeoAlgorithmVersion: (id: string) =>
    request<SeoAlgorithm>(`/admin/seo-algorithm/versions/${id}/restore`, { method: "POST" }, true),
};

/* -------- site settings types -------- */

export interface SiteBranding {
  brandName: string;
  logo: string;
  logoDark: string;
  favicon: string;
}

export interface SiteHero {
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  valueProposition: string;
  mission: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
}

export interface SiteContact {
  contactEmail: string;
  careersEmail: string;
  phone: string;
  responseTime: string;
  address: string;
  officeHours: string;
  calendarUrl: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface SiteSocial {
  links: SocialLink[];
  footerMessage: string;
  copyrightText: string;
}

export interface SiteTheme {
  accent: string;
  accentSoft: string;
  textOnAccent: string;
  accentDark: string;
  accentSoftDark: string;
  textOnAccentDark: string;
  fontHeadings: string;
  fontBody: string;
  fontMono: string;
}

export interface SiteSeo {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  keywords: string[];
  metaPixelId: string;
  orgSchemaType: string;
  orgFoundedYear: string;
}

export interface SiteSettings {
  id: string;
  branding: SiteBranding;
  hero: SiteHero;
  contact: SiteContact;
  social: SiteSocial;
  theme: SiteTheme;
  seo: SiteSeo;
  updatedAt: string | null;
}

export type SiteSettingsInput = {
  branding?: Partial<SiteBranding>;
  hero?: Partial<SiteHero>;
  contact?: Partial<SiteContact>;
  social?: Partial<SiteSocial>;
  theme?: Partial<SiteTheme>;
  seo?: Partial<SiteSeo>;
};

export interface PublicSiteSettings {
  branding: SiteBranding;
  hero: SiteHero;
  contact: SiteContact;
  social: SiteSocial;
  theme: SiteTheme;
  seo: SiteSeo;
}

/* -------- SEO algorithm (Site Settings → SEO Algorithm) -------- */

export type SeoAlgorithmFrequency = "daily" | "weekly" | "monthly";
export type SeoAlgorithmSource = "manual" | "ai-improve" | "schedule" | "restore" | "reset";

export interface SeoAlgorithmVersion {
  id: string;
  createdAt: string;
  source: SeoAlgorithmSource;
  avgAuditScore: number | null;
  isCurrent: boolean;
  /** Only present when fetched individually. */
  algorithm?: string;
  learningMemory?: string;
}

export interface SeoAlgorithm {
  algorithm: string;
  learningMemory: string;
  autoImprove: boolean;
  frequency: SeoAlgorithmFrequency;
  versionsToKeep: number;
  lastRunAt: string | null;
  lastRunNote: string | null;
  currentVersionId: string | null;
  updatedAt: string | null;
  versions: SeoAlgorithmVersion[];
}

export type SeoAlgorithmInput = {
  algorithm?: string;
  learningMemory?: string;
  autoImprove?: boolean;
  frequency?: SeoAlgorithmFrequency;
  versionsToKeep?: number;
};

/* -------- contact messages -------- */

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  status: "new" | "read" | "replied";
  source: string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  readAt?: string | null;
  repliedAt?: string | null;
}

export type ContactMessageInput = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  source?: string;
};

export interface MailSettings {
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassSet: boolean;
  enabled: boolean;
  live: boolean;
  from: string;
}

export type MailSettingsInput = {
  fromName?: string;
  fromEmail?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  enabled?: boolean;
};

export interface Track {
  id: string;
  title: string;
  mood?: string | null;
  url: string;
  active: boolean;
  createdAt?: string;
}

export type TrackInput = {
  title: string;
  mood?: string;
  url: string;
  active?: boolean;
};

export type CmsFaq = { id?: string; question: string; answer: string };

/** A CMS document (marketing page or blog post). `blocks` is present on
 *  single-doc reads; list endpoints omit it. */
export interface CmsDoc {
  id: string;
  type: "page" | "post";
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  tags: string[];
  authorName?: string | null;
  status: "draft" | "published";
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  faqs: CmsFaq[];
  sortOrder: number;
  noindex: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  blocks?: unknown[];
}

export type CmsInput = {
  type: "page" | "post";
  slug: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  blocks?: unknown[];
  tags?: string[];
  authorName?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  faqs?: CmsFaq[];
  sortOrder?: number;
  noindex?: boolean;
};

export interface PageOptimisation {
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string[];
  faqs: Array<{ question: string; answer: string }>;
}

export interface SeoSuggestion {
  seoTitle: string;
  seoDescription: string;
  score: number;
  issues: string[];
  rationale: string;
}

export interface SeoProposal {
  id: string;
  contentId: string;
  status: "pending" | "applied" | "rejected";
  source: "audit" | "manual";
  score?: number | null;
  proposed: { seoTitle?: string | null; seoDescription?: string | null };
  current: { seoTitle?: string | null; seoDescription?: string | null };
  issues: string[];
  rationale?: string | null;
  content: { title: string; type: "page" | "post"; slug: string };
  traffic?: { views: number; days: number };
  createdAt?: string;
  reviewedAt?: string | null;
}

export interface SeoInsights {
  days: number;
  siteViews: number;
  avgViews: number;
  configured: boolean;
  pages: {
    contentId: string;
    title: string;
    type: "page" | "post";
    slug: string;
    path: string;
    views: number;
    pending: boolean;
  }[];
}

export interface BlogDraft {
  title: string;
  excerpt: string;
  tags: string[];
  blocks: unknown[];
}

export interface IntegrationsStatus {
  encryption: { dedicatedKey: boolean };
  ai: { model: string; hasKey: boolean; keyPreview: string; source: "admin" | "env" | null };
  seo: { auditCron: boolean };
  ga: {
    measurementId: string;
    propertyId: string;
    hasServiceAccount: boolean;
    serviceAccountPreview: string;
    source: "admin" | "env" | null;
  };
}

export interface IntegrationsUpdate {
  aiApiKey?: string;
  clearAiApiKey?: boolean;
  aiModel?: string;
  auditCron?: boolean;
  gaMeasurementId?: string;
  gaPropertyId?: string;
  gaServiceAccountJson?: string;
  clearGaServiceAccount?: boolean;
}

export interface AnalyticsSummary {
  range: { days: number };
  totals: { views: number; visitors: number };
  timeseries: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  referrers: { source: string; views: number }[];
  devices: { device: string; views: number }[];
  ga: {
    configured: boolean;
    range?: string;
    users?: number;
    sessions?: number;
    pageviews?: number;
    topPages?: { path: string; views: number }[];
    error?: string;
  };
}
