"use client";

import { useId, useState } from "react";

export function AreaChart({ points, height = 160 }: { points: { label: string; total: number; after: number }[]; height?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, P = { l: 28, r: 8, t: 10, b: 22 };
  const max = Math.max(4, ...points.map((p) => p.total));
  const top = Math.ceil(max / 2) * 2;
  const x = (i: number) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / top) * (H - P.t - P.b);
  const line = (k: "total" | "after") => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const area = (k: "total" | "after") => `${line(k)} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, top / 2, top];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Calls per day" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width * W - P.l) / (W - P.l - P.r) * (points.length - 1)); setHover(Math.max(0, Math.min(points.length - 1, i))); }}>
        <defs>
          <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f4f4f5" stopOpacity=".22" /><stop offset="1" stopColor="#f4f4f5" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${id}b`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7aa7ff" stopOpacity=".35" /><stop offset="1" stopColor="#7aa7ff" stopOpacity="0" /></linearGradient>
        </defs>
        {ticks.map((t) => (<g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.07)" /><text x={P.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#8d8d96" className="tnum">{t}</text></g>))}
        <path d={area("total")} fill={`url(#${id}a)`} /><path d={line("total")} fill="none" stroke="#f4f4f5" strokeWidth="1.5" />
        <path d={area("after")} fill={`url(#${id}b)`} /><path d={line("after")} fill="none" stroke="#7aa7ff" strokeWidth="1.5" />
        {[0, Math.floor(points.length / 2), points.length - 1].map((i) => <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="#8d8d96">{points[i].label}</text>)}
        {hover != null && (<g><line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,.2)" /><circle cx={x(hover)} cy={y(points[hover].total)} r="3.5" fill="#f4f4f5" /><circle cx={x(hover)} cy={y(points[hover].after)} r="3.5" fill="#7aa7ff" /></g>)}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-1 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg" style={{ left: `${Math.min(78, Math.max(2, (x(hover) / W) * 100 - 8))}%` }}>
          <div className="text-muted-foreground">{points[hover].label}</div>
          <div className="tnum">{points[hover].total} calls · <span className="text-blue">{points[hover].after} after hours</span></div>
        </div>
      )}
    </div>
  );
}

export function BarList({ rows, color = "#f4f4f5" }: { rows: { label: string; n: number; tone?: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
          <span className="truncate text-[13px] text-foreground/90">{r.label}</span>
          <span className="tnum text-[13px] text-muted-foreground">{r.n}</span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><span className="block h-full rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: r.tone || color }} /></span>
        </li>
      ))}
    </ul>
  );
}

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(1, ...grid.flat());
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0,1fr))" }}>
        {grid.map((row, d) => (
          <div key={d} className="contents">
            <span className="text-[10px] leading-[14px] text-muted-foreground">{days[d]}</span>
            {row.map((v, h) => {
              const after = d >= 5 || h < 8 || h >= 18;
              return <span key={h} title={`${days[d]} ${h}:00 · ${v} calls`} className="aspect-square rounded-[3px]" style={{ background: v ? (after ? `rgba(122,167,255,${0.18 + 0.82 * (v / max)})` : `rgba(244,244,245,${0.1 + 0.6 * (v / max)})`) : "rgba(255,255,255,.04)" }} />;
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between pl-[28px] text-[10px] text-muted-foreground"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
      <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-2 rounded-[2px] bg-foreground/60" />Business hours</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-[2px] bg-blue" />After hours</span></div>
    </div>
  );
}

export function Spark({ values, color = "#f4f4f5" }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values), W = 80, H = 24;
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i / (values.length - 1)) * W},${H - 2 - (v / max) * (H - 4)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H}`} className="h-6 w-20" aria-hidden><path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
