"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, dayLabel, when } from "@/components/kit";
import { issueRows } from "@/lib/stats";
import type { Dataset } from "@/lib/types";

function Issues({ ds }: { ds: Dataset }) {
  const rows = issueRows(ds);
  const total = rows.reduce((a, r) => a + r.count, 0), rec = rows.reduce((a, r) => a + r.recovered, 0);
  return (
    <>
      <PageTitle title="Issues & fixes" sub={`${total} calls in 60 days didn't go cleanly. ${rec} were recovered as leads, and every pattern got a fix.`} />
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => {
          const recent = ds.calls.filter((c) => c.issue === r.key).slice(0, 3);
          return (
            <Card key={r.key}>
              <div className="flex items-start justify-between gap-3"><h3 className="text-[14px] font-medium">{r.title}</h3><Pill tone="good">Fixed {dayLabel(r.fix.at)}</Pill></div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[["Calls", String(r.count)], ["Recovered", String(r.recovered)], ["Rate", `${r.rateBefore}% → ${r.rateAfter}%`]].map(([l, v]) => <div key={l} className="rounded-xl bg-foreground/[0.04] py-2.5"><div className="tnum text-[15px] font-medium">{v}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{l}</div></div>)}
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground"><span className="text-foreground">What we changed: </span>{r.fix.change}</p>
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">Recent examples</div>
                <ul className="flex flex-col gap-1.5">{recent.map((c) => <li key={c.id} className="flex justify-between gap-3 text-xs"><span className="truncate">{c.name}{c.recovered ? <span className="text-good"> · recovered</span> : null}</span><span className="tnum shrink-0 text-muted-foreground">{when(c.at)}</span></li>)}</ul>
              </div>
            </Card>
          );
        })}
      </div>
      <Link href="/dashboard/calls" className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">Open the calls list <ArrowRight className="size-3.5" /></Link>
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Issues ds={ds} />}</Gate>; }
