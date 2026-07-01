/**
 * Gold wax heart seal with a laurel wreath and the couple's initials embossed
 * inside — a raised "double heart" rim gives it a stamped, beveled look. Pure
 * SVG so it stays crisp and themeable (no image asset needed).
 */
const HEART =
  "M50 84 C20 60 18 34 37 27 C49 22.5 50 37 50 40 C50 37 51 22.5 63 27 C82 34 80 60 50 84 Z";

export function WaxHeartSeal({
  initials = "S L",
  size = 92,
}: {
  initials?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id="wax-face" cx="40%" cy="30%" r="82%">
          <stop offset="0%" stopColor="#ecc77d" />
          <stop offset="42%" stopColor="#cba059" />
          <stop offset="100%" stopColor="#8a6a3c" />
        </radialGradient>
        <radialGradient id="wax-rim" cx="50%" cy="38%" r="78%">
          <stop offset="0%" stopColor="#bd954f" />
          <stop offset="100%" stopColor="#6c5028" />
        </radialGradient>
        <radialGradient id="wax-gloss" cx="36%" cy="24%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft cast shadow */}
      <ellipse cx="50" cy="88" rx="27" ry="5" fill="rgba(40,30,10,0.18)" />

      {/* raised outer rim */}
      <path d={HEART} fill="url(#wax-rim)" stroke="#5a4220" strokeWidth="0.8" />

      {/* inner face (slightly inset) with the emboss */}
      <g transform="translate(50 50) scale(0.82) translate(-50 -50)">
        <path d={HEART} fill="url(#wax-face)" />

        {/* laurel wreath — two sprigs rising from the base */}
        <g fill="none" stroke="#6c5028" strokeWidth="1.5" strokeLinecap="round" opacity="0.72">
          <path d="M41 66 C33 58 33 48 39 41" />
          <path d="M59 66 C67 58 67 48 61 41" />
          {[0, 1, 2, 3].map((i) => (
            <g key={`L${i}`}>
              <path d={`M${39.5 - i * 1.2} ${62 - i * 6.5} q-6 -2 -9 2`} />
              <path d={`M${60.5 + i * 1.2} ${62 - i * 6.5} q6 -2 9 2`} />
            </g>
          ))}
        </g>

        {/* embossed initials (dark base + light top for relief) */}
        <text
          x="50"
          y="54.5"
          textAnchor="middle"
          fontFamily="var(--font-cinzel), Georgia, serif"
          fontSize="20"
          fontWeight={600}
          letterSpacing="1.5"
          fill="#5a4220"
          opacity="0.55"
        >
          {initials}
        </text>
        <text
          x="50"
          y="53.7"
          textAnchor="middle"
          fontFamily="var(--font-cinzel), Georgia, serif"
          fontSize="20"
          fontWeight={600}
          letterSpacing="1.5"
          fill="#f4e3bd"
        >
          {initials}
        </text>

        {/* top-left gloss highlight */}
        <path d={HEART} fill="url(#wax-gloss)" />
      </g>
    </svg>
  );
}
