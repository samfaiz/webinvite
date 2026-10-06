/**
 * Keeps a title with its name: "Mrs. Lilykutty" never breaks after "Mrs.",
 * and a missing space ("Mr.Rajan") is put back. For display only; what the
 * couple typed is stored as they typed it.
 */
export function keepTitles(s: string): string {
  return s.replace(/\b(Mr|Mrs|Ms|Miss|Dr|Smt|Sri|Shri|Rev|Fr|Prof|Adv|Er)\.\s*(?=\S)/g, "$1. ");
}
