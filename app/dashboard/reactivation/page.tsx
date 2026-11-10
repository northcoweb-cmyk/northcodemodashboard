"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, DollarSign, Mail, RefreshCw } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, Stat, when } from "@/components/kit";
import { LeadTimelineSheet } from "@/components/lead-timeline";
import { maintenanceDue, openEstimates } from "@/lib/reactivation";
import { money } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Dataset, Lead } from "@/lib/types";

function Msg({ subject, body }: { subject: string; body: string }) {
  return <div className="mt-2 rounded-lg bg-foreground/[0.04] px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"><div className="mb-1 font-medium text-foreground">{subject}</div><div className="whitespace-pre-line">{body}</div></div>;
}

function Reactivation({ ds }: { ds: Dataset }) {
  const est = openEstimates(ds), due = maintenanceDue(ds);
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Lead | null>(null);
  const total = est.reduce((a, e) => a + (e.lead.quote ?? 0), 0);
  return (
    <>
      <PageTitle title="Old estimates & past customers" sub="Estimates that never closed and customers who are due for a touch-up. The next follow-up is already written and scheduled for each one. It stops the moment they reply or book." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={DollarSign} label="Open estimate value" value={money(total)} hint={`${est.length} estimates still open`} />
        <Stat icon={Mail} label="Follow-ups queued" value={est.length + due.length} hint="Next ones go out tomorrow morning" />
        <Stat icon={RefreshCw} label="Customers due for a touch-up" value={due.length} hint="Ceramic and film, 9+ months since install" />
      </div>

      <Card className="mt-4">
        <CardHead title="Estimates that never closed" sub="Biggest first. Each one is on its own follow-up plan of up to 12 steps." />
        <ul className="flex flex-col divide-y divide-border/60">
          {est.slice(0, 12).map((e) => {
            const k = `e_${e.lead.id}`; const isOpen = open === k;
            return (
              <li key={e.lead.id} className="py-3">
                <button onClick={() => setOpen(isOpen ? null : k)} className="flex w-full items-center gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-[13px] font-medium">{e.lead.name}</span><span className="text-xs text-muted-foreground">{e.lead.vehicle} · {e.lead.service}</span></div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Estimate {money(e.lead.quote ?? 0)} · sent {e.ageDays} days ago · next email {when(e.nextAt)}</div>
                  </div>
                  <Pill tone="blue">Step {e.step} of {e.total}</Pill>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} strokeWidth={1.5} />
                </button>
                {isOpen && <div className="pl-1"><Msg subject={e.draft.subject} body={e.draft.body} /><button onClick={() => setSel(e.lead)} className="mt-2 text-xs font-medium underline underline-offset-4">See the whole timeline</button></div>}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mt-4">
        <CardHead title="Past customers due for maintenance" sub="A friendly check-in before the coating needs attention. Each one goes out at a normal weekday time." />
        <ul className="flex flex-col divide-y divide-border/60">
          {due.map((d) => {
            const k = `m_${d.customer.id}`; const isOpen = open === k;
            return (
              <li key={d.customer.id} className="py-3">
                <button onClick={() => setOpen(isOpen ? null : k)} className="flex w-full items-center gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-[13px] font-medium">{d.customer.name}</span><span className="text-xs text-muted-foreground">{d.customer.vehicle} · {d.customer.service}</span></div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Done {d.months} months ago · email queued for {when(d.nextAt)}</div>
                  </div>
                  <Pill tone="good"><CalendarClock className="mr-1 inline size-3" strokeWidth={1.8} />Queued</Pill>
                  <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", isOpen && "rotate-180")} strokeWidth={1.5} />
                </button>
                {isOpen && <div className="pl-1"><Msg subject={d.draft.subject} body={d.draft.body} /></div>}
              </li>
            );
          })}
        </ul>
      </Card>
      <LeadTimelineSheet lead={sel} onClose={() => setSel(null)} />
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Reactivation ds={ds} />}</Gate>; }
