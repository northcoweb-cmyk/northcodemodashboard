"use client";

import { useState } from "react";
import { Check, Flag, Minus } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, Table, dur, when } from "@/components/kit";
import { Sheet } from "@/components/ui/sheet";
import { ISSUES } from "@/lib/seed";
import { cn } from "@/lib/utils";
import type { Call, Dataset } from "@/lib/types";

const TONE: Record<string, [string, string]> = { job_booked: ["good", "Job booked"], quote_requested: ["blue", "Estimate"], transferred: ["warn", "Transferred"], info: ["mute", "Question"], spam: ["mute", "Spam"], issue: ["warn", "Follow-up"] };
const FILTERS = [["all", "All"], ["after", "After hours"], ["jobs", "Jobs"], ["issue", "Follow-up"]] as const;

function CallSheet({ call, onClose }: { call: Call | null; onClose: () => void }) {
  return (
    <Sheet open={!!call} onOpenChange={(o) => !o && onClose()} title={call?.name ?? ""} description={call ? `${when(call.at)} · ${dur(call.durationSec)} · ${call.phone}` : ""} width="max-w-lg">
      {call && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2"><Pill tone={TONE[call.outcome][0]}>{TONE[call.outcome][1]}</Pill>{call.afterHours && <Pill tone="blue">After hours</Pill>}{call.issue && <Pill tone="warn">{ISSUES[call.issue].short}</Pill>}{call.recovered && <Pill tone="good">Recovered as lead</Pill>}</div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{call.summary}</p>
          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">How it was handled</h4>
            <ol className="flex flex-col gap-3">
              {call.steps.map((s) => (
                <li key={s.key} className="flex items-start gap-3">
                  <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", s.state === "done" ? "bg-good/15 text-good" : s.state === "flagged" ? "bg-warn/15 text-warn" : "bg-foreground/[0.06] text-muted-foreground")}>{s.state === "done" ? <Check className="size-3" strokeWidth={2.5} /> : s.state === "flagged" ? <Flag className="size-3" /> : <Minus className="size-3" />}</span>
                  <div><div className="text-[13px] font-medium">{s.label}</div><div className="text-xs text-muted-foreground">{s.note}</div></div>
                </li>
              ))}
            </ol>
          </div>
          {call.issue && <div className="rounded-xl border border-warn/25 bg-warn/[0.06] p-3.5 text-[13px]"><div className="mb-1 font-medium">How we handle this now</div><p className="text-muted-foreground">{ISSUES[call.issue].fix}</p></div>}
          <div>
            <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Transcript</h4>
            <div className="flex flex-col gap-2">
              {call.transcript.map((t, i) => <div key={i} className={cn("max-w-[88%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed", t.who === "ai" ? "self-start border border-border bg-card" : "self-end bg-foreground/10")}><span className="mb-0.5 block text-[10px] uppercase tracking-wider text-muted-foreground">{t.who === "ai" ? "Receptionist" : "Caller"}</span>{t.text}</div>)}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Calls({ ds }: { ds: Dataset }) {
  const [f, setF] = useState<(typeof FILTERS)[number][0]>("all");
  const [sel, setSel] = useState<Call | null>(null);
  const rows = ds.calls.filter((c) => f === "all" || (f === "after" && c.afterHours) || (f === "jobs" && (c.outcome === "job_booked" || c.outcome === "quote_requested")) || (f === "issue" && c.issue)).slice(0, 60);
  return (
    <>
      <PageTitle title="Calls" sub="Every call, how it was handled, and what was said. Click a call to open it." />
      <div className="mb-4 flex flex-wrap gap-2">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", f === k ? "border-foreground/25 bg-foreground/10" : "border-border text-muted-foreground hover:text-foreground")}>{l}</button>)}</div>
      <Card>
        <CardHead title={`${rows.length} calls`} sub="Most recent first" />
        <Table head={["Caller", "When", "Length", "Outcome", "Summary"]}>
          {rows.map((c) => (
            <tr key={c.id} onClick={() => setSel(c)} className="cursor-pointer transition hover:bg-foreground/[0.03]">
              <td className="whitespace-nowrap font-medium">{c.name}</td>
              <td className="tnum whitespace-nowrap text-muted-foreground">{when(c.at)}{c.afterHours && <span className="ml-1.5 text-blue">●</span>}</td>
              <td className="tnum whitespace-nowrap text-muted-foreground">{dur(c.durationSec)}</td>
              <td><Pill tone={TONE[c.outcome][0]}>{TONE[c.outcome][1]}</Pill></td>
              <td className="max-w-[320px] truncate text-muted-foreground">{c.summary}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <CallSheet call={sel} onClose={() => setSel(null)} />
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Calls ds={ds} />}</Gate>; }
