"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Gate } from "@/components/gate";
import { BarList } from "@/components/ui/charts";
import { dayLabel } from "@/components/kit";
import { delta, issueRows, jobsByService, money, outcomes, summary } from "@/lib/stats";
import { useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Dataset } from "@/lib/types";

const PERIODS = [[7, "Week"], [30, "30 days"], [60, "60 days"]] as const;
const DAY = 86400000;

function Change({ cur, prev, lowerIsBetter }: { cur: number; prev: number; lowerIsBetter?: boolean }) {
  if (!prev) return <span className="text-muted-foreground">–</span>;
  const d = delta(cur, prev); const good = lowerIsBetter ? d <= 0 : d >= 0;
  return <span className={cn("tnum", d === 0 ? "text-muted-foreground" : good ? "text-good" : "text-bad")}>{d > 0 ? "+" : ""}{d}%</span>;
}

function Reports({ ds }: { ds: Dataset }) {
  const { settings } = useSettings();
  const [days, setDays] = useState<7 | 30 | 60>(7);
  const s = summary(ds, days), p = summary(ds, days, days);
  const issues = issueRows(ds);
  const busiest = (() => { const m = new Map<string, number>(); s.calls.forEach((c) => { const k = dayLabel(c.at); m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]; })();
  const within5 = s.leads.length ? Math.round((s.leads.filter((l) => l.firstReplyMin <= 5).length / s.leads.length) * 100) : 0;
  const byService = jobsByService(ds, days).map((x) => ({ label: `${x.label} (${x.n})`, n: x.value, display: money(x.value) }));
  const rows: { l: string; a: number; b: number; fmt?: (n: number) => string; low?: boolean }[] = [
    { l: "Calls answered", a: s.answered, b: p.answered },
    { l: "After-hours calls", a: s.afterHours, b: p.afterHours },
    { l: "Leads captured", a: s.leadCount, b: p.leadCount },
    { l: "First reply (minutes)", a: s.avgFirstReply, b: p.avgFirstReply, low: true },
    ...(settings.modules.followup.active ? [{ l: "Follow-up reply rate", a: s.replyRate, b: p.replyRate, fmt: (n: number) => `${n}%` }] : []),
    { l: "Jobs booked", a: s.jobsBooked, b: p.jobsBooked },
    { l: "Booked job value", a: s.pipelineValue, b: p.pipelineValue, fmt: money },
    { l: "Won back from quiet leads", a: s.wonBackValue, b: p.wonBackValue, fmt: money },
    { l: "Calls needing follow-up", a: s.issues, b: p.issues, low: true },
  ];
  const notes = [
    `${s.answered} calls were answered, ${s.afterHours} of them after hours (${s.afterHoursPct}%).${busiest ? ` The busiest day was ${busiest[0]} with ${busiest[1]} calls.` : ""}`,
    `New leads got a first reply in ${s.avgFirstReply} minutes on average, and ${within5}% were answered within 5 minutes.`,
    `${s.jobsBooked} jobs were booked${s.valued ? `. The ${s.valued} you've valued total ${money(s.pipelineValue)}` : ""}.`,
    s.issues ? `${s.issues} calls needed a follow-up and ${s.recovered} were recovered as leads.` : "No calls needed a follow-up.",
  ];
  return (
    <div className="mx-auto max-w-3xl print:max-w-none">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-xs text-muted-foreground">{settings.businessName}</div><h1 className="mt-1 text-2xl font-medium tracking-tight">Report</h1><p className="mt-1 text-sm text-muted-foreground">{dayLabel(ds.now - days * DAY)} to {dayLabel(ds.now)}</p></div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex rounded-full border border-border bg-card p-0.5">{PERIODS.map(([d, l]) => <button key={d} onClick={() => setDays(d)} className={cn("rounded-full px-3.5 py-1.5 text-xs transition", days === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>{l}</button>)}</div>
          <button onClick={() => window.print()} aria-label="Print report" className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"><Printer className="size-3.5" strokeWidth={1.5} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        {[["Calls", String(s.answered)], ["Leads", String(s.leadCount)], ["Job value", money(s.pipelineValue)], ["First reply", `${s.avgFirstReply} min`]].map(([l, v]) => <div key={l} className="bg-card p-5"><div className="text-xs text-muted-foreground">{l}</div><div className="tnum mt-2 text-[26px] font-medium leading-none tracking-tight">{v}</div></div>)}
      </div>

      <section className="mt-10">
        <h2 className="text-[13px] font-medium">What happened</h2>
        <ul className="mt-3 flex flex-col gap-2.5 text-[14px] leading-relaxed text-muted-foreground">{notes.map((n) => <li key={n} className="flex gap-3"><i className="mt-2.5 size-1 shrink-0 rounded-full bg-foreground/40" />{n}</li>)}</ul>
      </section>

      <section className="mt-10">
        <h2 className="text-[13px] font-medium">Compared with the {days === 7 ? "week" : `${days} days`} before</h2>
        <table className="mt-3 w-full text-left text-[13px]">
          <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="py-2 font-normal" /><th className="py-2 text-right font-normal">Now</th><th className="py-2 text-right font-normal">Before</th><th className="py-2 text-right font-normal">Change</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.l} className="border-b border-border/60 last:border-0"><td className="py-3">{r.l}</td><td className="tnum py-3 text-right font-medium">{(r.fmt ?? String)(r.a)}</td><td className="tnum py-3 text-right text-muted-foreground">{(r.fmt ?? String)(r.b)}</td><td className="py-3 text-right"><Change cur={r.a} prev={r.b} lowerIsBetter={r.low} /></td></tr>)}</tbody>
        </table>
      </section>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <section><h2 className="mb-4 text-[13px] font-medium">How calls ended</h2><BarList rows={outcomes(ds, days).map((o) => ({ label: o.label, n: o.n, tone: o.key === "issue" ? "#b9770e" : undefined }))} /></section>
        <section><h2 className="mb-4 text-[13px] font-medium">Booked value by service <span className="text-muted-foreground">· total {money(s.pipelineValue)}</span></h2>{byService.length ? <BarList rows={byService} color="#12935f" /> : <p className="text-sm text-muted-foreground">No jobs booked in this period.</p>}</section>
      </div>

      <section className="mt-10">
        <h2 className="text-[13px] font-medium">Improvements shipped</h2>
        <ul className="mt-3 divide-y divide-border/60">{issues.map((r) => <li key={r.key} className="flex items-center justify-between gap-4 py-3 text-[13px]"><span>{r.name}</span><span className="tnum shrink-0 text-muted-foreground">{r.rateBefore}% <span className="px-1">→</span> <span className="text-good">{r.rateAfter}%</span></span></li>)}</ul>
      </section>

      <p className="mt-12 border-t border-border pt-5 text-xs text-muted-foreground print:mt-6">This report is emailed to {settings.alertEmail} every Saturday at 8am.</p>
    </div>
  );
}
export default function Page() { return <Gate>{(ds) => <Reports ds={ds} />}</Gate>; }
