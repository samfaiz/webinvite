"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Floating petals / sparkles drifting up the page. Pure CSS animation (float-up
 * keyframe) for performance. Respects prefers-reduced-motion.
 */
export function ParticleField({
  type = "petals",
  color = "#ffffff",
  count = 14,
}: {
  type?: "petals" | "sparkles" | "none";
  color?: string;
  count?: number;
}) {
  const reduce = useReducedMotion();

  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 97 + 13) % 100, // deterministic spread (no Math.random for SSR safety)
        delay: (i % 7) * 1.6,
        duration: 14 + (i % 5) * 4,
        size: type === "sparkles" ? 4 + (i % 3) * 2 : 8 + (i % 4) * 4,
        drift: (i % 2 === 0 ? 1 : -1) * (10 + (i % 3) * 8),
      })),
    [count, type]
  );

  if (type === "none" || reduce) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-5 overflow-hidden"
    >
      {items.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            bottom: "-40px",
            width: p.size,
            height: type === "sparkles" ? p.size : p.size * 1.4,
            background: color,
            borderRadius: type === "sparkles" ? "50%" : "50% 0 50% 50%",
            opacity: 0,
            filter: type === "sparkles" ? "blur(0.3px)" : "none",
            boxShadow:
              type === "sparkles"
                ? `0 0 6px ${color}`
                : "0 1px 2px rgba(0,0,0,0.08)",
            animation: `float-up ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
