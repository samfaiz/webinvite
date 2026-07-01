"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Draft } from "@/studio/draft";
import { loadDraft } from "@/studio/draft";
import { getTemplateComponent } from "@/templates/components";
import { getMotif } from "@/motifs";

/** Full-screen, real preview of the current Studio draft (reads localStorage). */
export default function StudioFullPreview() {
  const [draft, setDraft] = useState<Draft | null>(null);
  useEffect(() => setDraft(loadDraft()), []);

  if (!draft) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading preview…</div>;
  }

  const Template = getTemplateComponent(draft.templateId);
  return (
    <div className="relative">
      <Link
        href="/studio"
        className="fixed left-4 top-4 z-[80] rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow hover:bg-white"
      >
        ← Back to Studio
      </Link>
      <Template content={draft.content} theme={draft.theme} motif={getMotif(draft.motifId)} snap />
    </div>
  );
}
