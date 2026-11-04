"use client";

import { useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Card, dayLabel } from "@/components/kit";
import { Sheet } from "@/components/ui/sheet";
import { AskAgent } from "@/components/ask-agent";
import { issueRows, summary } from "@/lib/stats";
import type { Dataset } from "@/lib/types";

/** One calm card. Opening it breaks the improvements down. */
export function ImprovementsCard({ ds }: { ds: Dataset }) {
  const [open, setOpen] = useState(false);
  const rows = issueRows(ds);
  const now = summary(ds, 30), before = summary(ds, 30, 30);
  const rate = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const r1 = rate(before.issues, before.answered), r2 = rate(now.issues, now.answered);
  return (
    <>
      <Card onClick={() => setOpen(true)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06]"><Sparkles className="size-4" strokeWidth={1.5} /></span>
            <div><h3 className="text-[14px] font-medium">Your receptionist keeps getting better</h3><p className="mt-0.5 text-xs text-muted-foreground">{rows.length} improvements shipped. Calls that needed a follow-up went from {r1}% to {r2}% of all calls, and {now.recovered + before.recovered} were recovered as leads.</p></div>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">See the breakdown <ArrowUpRight className="size-3.5" /></span>
        </div>
      </Card>
      <Sheet open={open} onOpenChange={setOpen} title="Improvements" description="What we changed, and what it did to your calls" width="max-w-lg">
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.key} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3"><h4 className="text-[14px] font-medium">{r.name}</h4><span className="tnum shrink-0 text-xs text-muted-foreground">{dayLabel(r.fix.at)}</span></div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{r.fix.change}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[["Calls handled", String(r.count)], ["Recovered", String(r.recovered)], ["Rate", `${r.rateBefore}% → ${r.rateAfter}%`]].map(([l, v]) => <div key={l} className="rounded-lg bg-foreground/[0.04] py-2"><div className="tnum text-[14px] font-medium">{v}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{l}</div></div>)}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6"><AskAgent agent="receptionist" prompts={["Why couldn't it hear some callers?", "What should I fix next?"]} onAsk={() => setOpen(false)} /></div>
      </Sheet>
    </>
  );
}
