import type { CSSProperties } from "react";

/**
 * Per-community corner flourishes used to frame heroes and cards. The `variant`
 * is driven by a MotifPack's decorativeBorders entry, giving each community a
 * distinct ornamental identity (floral / paisley / geometric / crescent).
 */
export type BorderVariant = "floral-vine" | "paisley" | "geometric" | "crescent";

const CORNER: Record<BorderVariant, string> = {
  "floral-vine":
    "M4 60 C4 30 30 8 60 6 M4 60 C4 44 12 40 18 44 C24 48 18 56 10 54 M28 14 C24 8 30 2 36 6 C40 9 36 16 28 14",
  paisley:
    "M6 62 C6 30 28 10 58 8 M16 40 C8 38 8 26 18 26 C28 26 26 40 16 40 Z",
  geometric: "M4 60 V18 H46 M4 32 H30 V8 M16 60 V40 H40",
  crescent:
    "M6 60 C6 32 28 10 56 8 M22 22 a10 10 0 1 0 12 14 a8 8 0 1 1 -12 -14 M44 10 l2 5 l5 1 l-4 4 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -4 l5 -1 Z",
};

function Corner({
  variant,
  className,
  style,
}: {
  variant: BorderVariant;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d={CORNER[variant]}
        fill="none"
        stroke="var(--c-accent)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Places the chosen flourish at all four corners (mirrored). */
export function DecorativeFrame({
  variant = "floral-vine",
  inset = 8,
  className = "",
}: {
  variant?: BorderVariant;
  inset?: number;
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden>
      <Corner variant={variant} style={{ position: "absolute", top: inset, left: inset }} />
      <Corner
        variant={variant}
        style={{ position: "absolute", top: inset, right: inset, transform: "scaleX(-1)" }}
      />
      <Corner
        variant={variant}
        style={{ position: "absolute", bottom: inset, left: inset, transform: "scaleY(-1)" }}
      />
      <Corner
        variant={variant}
        style={{
          position: "absolute",
          bottom: inset,
          right: inset,
          transform: "scale(-1,-1)",
        }}
      />
    </div>
  );
}
