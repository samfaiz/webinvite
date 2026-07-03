import type { ComponentType } from "react";
import type { RenderProps } from "@/engine/types";
import { FlagshipTemplate } from "./flagship/FlagshipTemplate";
import { RoyalOrnateTemplate } from "./royal/RoyalOrnateTemplate";
import { MinimalModernTemplate } from "./minimal/MinimalModernTemplate";
import { CustomTemplate } from "@/custom/CustomTemplate";

/**
 * Template COMPONENT map (heavy — pulls in framer-motion etc.). Import this only
 * where you actually render a template (public invite page, preview, Studio).
 * Light pages should import metadata from ./registry instead.
 */
type TemplateComponent = ComponentType<
  RenderProps & {
    intro?: boolean;
    live?: boolean;
    snap?: boolean;
    compact?: boolean;
    editing?: boolean;
  }
>;

// NOTE: keep this a plain map of client components. Wrapping them here (HOC
// call) executes a client-module function during the SERVER build of
// /i/[slug] and breaks `next build`. Cross-cutting behavior belongs INSIDE
// the templates (see TextOffsets).
const components: Record<string, TemplateComponent> = {
  "flagship-lakecomo": FlagshipTemplate,
  "royal-ornate": RoyalOrnateTemplate,
  "minimal-modern": MinimalModernTemplate,
  custom: CustomTemplate,
};

export function getTemplateComponent(id: string): TemplateComponent {
  return components[id] ?? FlagshipTemplate;
}
