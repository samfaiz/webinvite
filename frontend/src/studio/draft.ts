import type { InvitationContent, Theme } from "@/engine/types";
import { sampleSurajLibina } from "@/data/sampleSurajLibina";
import { getTheme } from "@/themes";

/**
 * A Studio "draft" = everything needed to render + publish an invitation:
 * the chosen layout, the (editable) theme, the community motif, the content,
 * and account-level fields (owner email). Persisted to localStorage in Phase 3;
 * it will POST to the backend later.
 */
export interface Draft {
  templateId: string;
  motifId: string;
  theme: Theme; // a full, editable copy (id becomes "custom" once edited)
  content: InvitationContent;
  ownerEmail: string;
}

const KEY = "wedding-invite-draft-v1";

/** Set a nested value by dot-path, e.g. setByPath(content, "couple.partner1.name", "Faisal"). */
export function setByPath(obj: Record<string, any>, path: string, value: unknown) {
  const keys = path.split(".");
  let o: Record<string, any> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (o[k] == null || typeof o[k] !== "object") o[k] = {};
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
}

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

export function defaultDraft(): Draft {
  return {
    templateId: "flagship-lakecomo",
    motifId: sampleSurajLibina.meta.community,
    theme: clone(getTheme("dusty-blue")),
    content: clone(sampleSurajLibina),
    ownerEmail: "",
  };
}

/** Build a fresh draft seeded from an admin-created Design (with background art). */
export function draftFromDesign(d: {
  id: string;
  name: string;
  community: string;
  templateId: string;
  colors: Theme["colors"];
  fonts: Theme["fonts"];
  particles: Theme["particles"];
  backgrounds?: Theme["backgrounds"];
}): Draft {
  return {
    templateId: d.templateId,
    motifId: d.community,
    theme: {
      id: `design-${d.id}`,
      name: d.name,
      colors: d.colors,
      fonts: d.fonts,
      particles: d.particles,
      backgrounds: d.backgrounds,
    },
    content: clone(sampleSurajLibina),
    ownerEmail: "",
  };
}

/** Build a fresh draft seeded from a gallery preset (template + theme + motif). */
export function draftFromPreset(p: { templateId: string; themeId: string; motifId: string }): Draft {
  return {
    templateId: p.templateId,
    motifId: p.motifId,
    theme: clone(getTheme(p.themeId)),
    content: clone(sampleSurajLibina),
    ownerEmail: "",
  };
}

export function loadDraft(): Draft {
  if (typeof window === "undefined") return defaultDraft();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultDraft();
    const parsed = JSON.parse(raw);
    if (parsed?.content && parsed?.theme && parsed?.templateId) {
      return { ...defaultDraft(), ...parsed } as Draft;
    }
  } catch {
    /* ignore corrupt draft */
  }
  return defaultDraft();
}

/** Persist the working draft. Returns false if the browser refused the write
 *  (usually a localStorage quota overflow from large embedded photos/logo), so
 *  the caller can warn the couple instead of losing edits silently. */
export function saveDraft(d: Draft): boolean {
  if (typeof window === "undefined") return true;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    /* quota exceeded or serialization issue — report so the UI can react */
    return false;
  }
}

export function clearDraft() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

/* ----------------------------- date helpers ----------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "2027-01-09T15:00" -> "9th January 2027" */
export function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** event date + 1 day, as YYYY-MM-DD */
export function expiryFromDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
