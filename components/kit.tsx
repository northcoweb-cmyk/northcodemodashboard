"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExplain } from "./explain-provider";

export function Card({ className, children, explain, onClick }: { className?: string; children: React.ReactNode; explain?: string; onClick?: () => void }) {
  const ex = useExplain();
  const clickable = !!onClick || (!!explain && ex.enabled);
  return (
    <section
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => (onClick ? onClick() : explain && ex.show(explain))}
      onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick ? onClick() : explain && ex.show(explain); } }}
      className={cn("rise rounded-2xl border border-border bg-card p-5 text-left", clickable && "cursor-pointer transition hover:border-foreground/[0.16] hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring", className)}
    >{children}</section>
  );
}

export function CardHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h3 className="text-[13px] font-medium tracking-tight">{title}</h3>{sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}</div>
      {right}
    </div>
  );
}

export function Stat({ label, value, unit, delta, hint, explain, icon: Icon }: { label: string; value: string | number; unit?: string; delta?: number; hint?: string; explain?: string; icon?: React.ElementType }) {
  return (
    <Card explain={explain} className="p-4 sm:p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{label}</span>{Icon && <Icon className="size-4 opacity-60" strokeWidth={1.5} />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="tnum text-[28px] font-medium leading-none tracking-tight sm:text-[32px]">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-2.5 flex items-center gap-2 text-xs">
        {delta != null && (
          <span className={cn("tnum inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5", delta >= 0 ? "bg-good/10 text-good" : "bg-bad/10 text-bad")}>
            {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
}

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-medium tracking-tight">{title}</h1>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>
      {right}
    </div>
  );
}

const TONES: Record<string, string> = { good: "bg-good/10 text-good", warn: "bg-warn/10 text-warn", bad: "bg-bad/10 text-bad", blue: "bg-blue/10 text-blue", mute: "bg-foreground/[0.06] text-muted-foreground" };
export function Pill({ tone = "mute", children }: { tone?: keyof typeof TONES | string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", TONES[tone])}>{children}</span>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead><tr className="border-b border-border text-xs text-muted-foreground">{head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-normal first:pl-0 last:pr-0">{h}</th>)}</tr></thead>
        <tbody className="[&_td]:px-3 [&_td]:py-3 [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_tr]:border-b [&_tr]:border-border/60 [&_tr:last-child]:border-0">{children}</tbody>
      </table>
    </div>
  );
}

export const when = (t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
export const dayLabel = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" });
export const dur = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`);
export function Loading() { return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[120px] animate-pulse rounded-2xl border border-border bg-card" />)}</div>; }
