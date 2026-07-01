import { notFound } from "next/navigation";
import { getTemplateComponent } from "@/templates/components";
import { getPreset } from "@/templates/registry";
import { sampleSurajLibina } from "@/data/sampleSurajLibina";
import { getTheme } from "@/themes";
import { getMotif } from "@/motifs";
import type { Theme } from "@/engine/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

/** Live full-page preview of a code preset OR an admin-created design (by id). */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1) built-in code preset
  const preset = getPreset(id);
  if (preset) {
    const Template = getTemplateComponent(preset.templateId);
    return (
      <Template
        content={sampleSurajLibina}
        theme={getTheme(preset.themeId)}
        motif={getMotif(preset.motifId)}
        snap
      />
    );
  }

  // 2) admin-created design from the backend
  try {
    const res = await fetch(`${API}/designs/${id}`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      const Template = getTemplateComponent(d.templateId);
      const theme: Theme = {
        id: `design-${d.id}`,
        name: d.name,
        colors: d.colors,
        fonts: d.fonts,
        particles: d.particles,
        backgrounds: d.backgrounds,
      };
      return (
        <Template content={sampleSurajLibina} theme={theme} motif={getMotif(d.community)} snap />
      );
    }
  } catch {
    /* ignore */
  }

  notFound();
}
