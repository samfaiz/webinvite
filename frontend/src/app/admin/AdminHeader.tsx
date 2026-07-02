"use client";

/**
 * Legacy top-bar component. The admin shell (AdminShell in layout.tsx) now
 * provides sidebar navigation + a top bar for every /admin route, so this
 * component intentionally renders nothing. Kept as an export so the existing
 * `<AdminHeader active="..." />` calls in each page still compile. Once every
 * page has been reworked to the new shell, this file can be deleted.
 */
export function AdminHeader(_: { active?: string }) {
  return null;
}
