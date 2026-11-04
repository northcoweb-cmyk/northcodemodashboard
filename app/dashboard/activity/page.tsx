"use client";

import { useState } from "react";
import { FileInput, HardHat, Mail, PhoneCall, Wrench } from "lucide-react";
import { Gate } from "@/components/gate";
import { LeadTimelineSheet } from "@/components/lead-timeline";
import { Card, PageTitle, when } from "@/components/kit";
import { dispatches } from "@/lib/dispatch";
import { useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Dataset, Lead } from "@/lib/types";

type Ev = { lead?: string; id: string; at: number; kind: "call" | "lead" | "email" | "dispatch" | "job"; title: string; sub: string };
const KIND = { call: [PhoneCall, "Calls"], lead: [FileInput, "Leads"], email: [Mail, "Emails"], dispatch: [HardHat, "Dispatch"], job: [Wrench, "Jobs"] } as const;

function Activity({ ds }: { ds: Dataset }) {
  const { settings } = useSettings();
  const [f, setF] = useState<"all" | Ev["kind"]>("all");
  const [sel, setSel] = useState<Lead | null>(null);
  const cut = ds.now - 14 * 86400000;
  const ev: Ev[] = [
    ...ds.calls.filter((c) => c.at > cut).map((c) => ({ id: c.id, at: c.at, kind: "call" as const, title: `${c.name} called`, sub: c.summary })),
    ...ds.leads.filter((l) => l.at > cut).map((l) => ({ id: l.id, at: l.at, lead: l.id, kind: "lead" as const, title: `New lead: ${l.name}`, sub: `${l.service}, via ${l.source === "call" ? "phone" : l.source === "form" ? "website form" : "email"}. First reply in ${l.firstReplyMin} min.` })),
    ...(settings.modules.followup.active ? ds.leads.filter((l) => l.at > cut).flatMap((l) => l.touches.filter((t) => t.sentAt > cut && t.sentAt <= ds.now).map((t) => ({ id: `${l.id}-${t.n}`, at: t.sentAt, lead: l.id, kind: "email" as const, title: `${t.label} sent to ${l.name}`, sub: t.replied ? "They replied." : t.opened ? "Opened." : "Delivered." }))) : []),
    ...ds.jobs.filter((j) => j.at > cut).map((j) => ({ id: j.id, at: j.at, kind: "job" as const, title: `Job booked: ${j.customer}`, sub: `${j.service} at ${j.address}` })),
    ...(settings.modules.crew.active ? dispatches(ds, settings.crew, settings.businessName, 80).filter((d) => d.sentAt > cut).map((d) => ({ id: d.id, at: d.sentAt, kind: "dispatch" as const, title: `Dispatched ${d.crew.map((c) => c.name.split(" ")[0]).join(" and ") || "no one"}`, sub: `${d.job.service} at ${d.job.address}` })) : []),
  ].sort((a, b) => b.at - a.at);
  const rows = ev.filter((e) => f === "all" || e.kind === f).slice(0, 80);
  return (
    <>
      <PageTitle title="Activity" sub="Everything that happened in the last 14 days, newest first." />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "call", "lead", "email", "job", "dispatch"] as const).map((k) => <button key={k} onClick={() => setF(k)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", f === k ? "border-foreground/25 bg-foreground/10" : "border-border text-muted-foreground hover:text-foreground")}>{k === "all" ? "Everything" : KIND[k][1]}</button>)}
      </div>
      <Card className="p-0">
        <ul className="divide-y divide-border/60">
          {rows.map((e) => { const Icon = KIND[e.kind][0]; return (
            <li key={e.id} onClick={() => e.lead && setSel(ds.leads.find((l) => l.id === e.lead) ?? null)} className={cn("flex items-start gap-3.5 px-5 py-3.5", e.lead && "cursor-pointer transition hover:bg-foreground/[0.03]")}>
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground"><Icon className="size-4" strokeWidth={1.5} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium">{e.title}</span><span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{e.sub}</span></span>
              <span className="tnum shrink-0 pt-0.5 text-[11px] text-muted-foreground">{when(e.at)}</span>
            </li>); })}
        </ul>
      </Card>
      <LeadTimelineSheet lead={sel} now={ds.now} followup={settings.modules.followup.active} onClose={() => setSel(null)} />
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Activity ds={ds} />}</Gate>; }
