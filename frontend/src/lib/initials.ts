/** Derive wax-seal initials from the couple's names, e.g. "Suraj","Libina" → "S L". */
export function sealInitials(p1?: string, p2?: string): string {
  const a = (p1 || "").trim().charAt(0).toUpperCase();
  const b = (p2 || "").trim().charAt(0).toUpperCase();
  return [a, b].filter(Boolean).join(" ") || "S L";
}

/** The seal to show: a non-empty manual value overrides the auto-derived one. */
export function resolveSeal(manual: string | undefined, p1?: string, p2?: string): string {
  return manual?.trim() || sealInitials(p1, p2);
}

/** Titles that come before a name and aren't part of it: "Dr. Jessin" → "Jessin". */
const TITLES = /^(?:(?:dr|mr|mrs|ms|miss|mx|er|adv|prof|capt|lt|col|maj|rev|fr|sr|smt|shri|sri|kum|km|ca)\.?\s+)+/i;

/** The initial of a name, skipping any title: "Dr. Jessin" → "J". */
export function initialOf(name?: string): string {
  return (name || "").trim().replace(TITLES, "").trim().charAt(0).toUpperCase();
}

