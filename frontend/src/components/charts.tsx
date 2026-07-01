/* Tiny dependency-free charts for the analytics dashboard. */

type Point = { date: string; views: number; visitors: number };

export function LineChart({ data }: { data: Point[] }) {
  const W = 720;
  const H = 220;
  const P = 26;
  if (!data.length) return <div className="py-10 text-center text-sm text-slate-400">No data yet.</div>;

  const max = Math.max(1, ...data.map((d) => Math.max(d.views, d.visitors)));
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - P - (v * (H - 2 * P)) / max;
  const path = (key: "views" | "visitors") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const area = `${path("views")} L${x(data.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;

  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Traffic over time">
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={P + f * (H - 2 * P)} y2={P + f * (H - 2 * P)} stroke="#e2e8f0" strokeWidth={1} />
        ))}
        <path d={area} fill="#2b3a67" opacity={0.06} />
        <path d={path("views")} fill="none" stroke="#2b3a67" strokeWidth={2.5} strokeLinejoin="round" />
        <path d={path("visitors")} fill="none" stroke="#b08d57" strokeWidth={2} strokeLinejoin="round" />
        <text x={P} y={P - 10} fontSize={12} fill="#94a3b8">{max}</text>
        <text x={P} y={H - 6} fontSize={12} fill="#94a3b8">{fmt(first)}</text>
        <text x={W - P} y={H - 6} fontSize={12} fill="#94a3b8" textAnchor="end">{fmt(last)}</text>
      </svg>
      <div className="mt-1 flex justify-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#2b3a67]" /> Views</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#b08d57]" /> Visitors</span>
      </div>
    </div>
  );
}

export function BarList({ items, empty = "No data yet." }: { items: { label: string; value: number }[]; empty?: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-slate-400">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="relative h-6 flex-1 overflow-hidden rounded bg-slate-100">
            <div className="absolute inset-y-0 left-0 rounded bg-[#2b3a67]/12" style={{ width: `${(it.value / max) * 100}%` }} />
            <span className="absolute inset-y-0 left-2 flex items-center truncate pr-16 text-xs text-slate-700">{it.label}</span>
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-medium text-slate-500">{it.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
