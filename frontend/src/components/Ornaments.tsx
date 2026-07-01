import type { CSSProperties } from "react";

/** A gold ornamental divider with a centered heart — used between sections. */
export function Divider({
  width = 160,
  symbol = "♥",
  className = "",
}: {
  width?: number;
  symbol?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
      style={{ color: "var(--c-accent)" }}
      aria-hidden
    >
      <span
        style={{
          height: 1,
          width,
          background:
            "linear-gradient(90deg, transparent, var(--c-accent), transparent)",
        }}
      />
      <span style={{ fontSize: 12 }}>{symbol}</span>
      <span
        style={{
          height: 1,
          width,
          background:
            "linear-gradient(90deg, transparent, var(--c-accent), transparent)",
        }}
      />
    </div>
  );
}

/** Laurel-wreath monogram crest (e.g. "S | L"). */
export function MonogramCrest({
  monogram = "S | L",
  size = 96,
  style,
}: {
  monogram?: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size, color: "var(--c-accent)", ...style }}
      aria-hidden
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          {/* left laurel */}
          <path d="M40 95 C20 80 18 50 38 30" />
          {/* right laurel */}
          <path d="M80 95 C100 80 102 50 82 30" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={`l${i}`}>
              <path d={`M${38 - i * 2} ${78 - i * 12} q-9 -3 -13 4`} />
            </g>
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={`r${i}`}>
              <path d={`M${82 + i * 2} ${78 - i * 12} q9 -3 13 4`} />
            </g>
          ))}
        </g>
      </svg>
      <span
        className="font-display"
        style={{
          fontSize: size * 0.26,
          color: "var(--c-primary)",
          letterSpacing: "0.05em",
        }}
      >
        {monogram}
      </span>
    </div>
  );
}
