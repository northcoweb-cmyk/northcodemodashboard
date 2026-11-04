"use client";

import { useState } from "react";
import { Check, FileInput, Timer, Zap } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, Stat, Table, when } from "@/components/kit";
import { BarList } from "@/components/ui/charts";
import { LeadTimelineSheet } from "@/components/lead-timeline";
import { useSettings } from "@/lib/store";
import { summary } from "@/lib/stats";
import type { Dataset, Lead } from "@/lib/types";

function Forms({ ds }: { ds: Dataset }) {
  const { settings } = useSettings();
  const [sel, setSel] = useState<Lead | null>(null);
  const s = summary(ds, 30);
  const fl = ds.leads.filter((l) => l.source === "form");
  const f30 = fl.filter((l) => l.at > ds.now - 30 * 86400000);
  const avg = f30.length ? Math.round((f30.reduce((a, l) => a + l.firstReplyMin, 0) / f30.length) * 10) / 10 : 0;
  const pages = Object.entries(f30.reduce<Record<string, number>>((m, l) => { const k = l.via || "Website form"; m[k] = (m[k] || 0) + 1; return m; }, {})).map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  return (
    <>
      <PageTitle title="Website forms" sub="When someone fills out a form on your site, they get a reply in minutes and you get the details. Click a submission to see the whole timeline." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={FileInput} label="Form leads, 30 days" value={s.formLeads} explain="leads" />
        <Stat icon={Timer} label="Average first reply" value={avg} unit="min" explain="reply" />
        <Stat icon={Zap} label="Replied within 5 min" value={f30.length ? Math.round((f30.filter((l) => l.firstReplyMin <= 5).length / f30.length) * 100) : 0} unit="%" explain="reply" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="Recent submissions" sub="Where each person reached out from, and what happened next" />
          <Table head={["Name", "Reached out from", "Service", "Replied in", "Received", "Status"]}>
            {fl.slice(0, 20).map((l) => (
              <tr key={l.id} onClick={() => setSel(l)} className="cursor-pointer transition hover:bg-foreground/[0.03]">
                <td className="whitespace-nowrap font-medium">{l.name}</td>
                <td className="whitespace-nowrap"><span className="rounded-md bg-foreground/[0.06] px-2 py-1 text-xs">{l.via || "Website form"}</span></td>
                <td className="whitespace-nowrap text-muted-foreground">{l.service}</td>
                <td className="tnum whitespace-nowrap text-muted-foreground">{l.firstReplyMin} min</td>
                <td className="tnum whitespace-nowrap text-muted-foreground">{when(l.at)}</td>
                <td><Pill tone={l.status === "booked" ? "good" : l.status === "replied" ? "blue" : "mute"}>{l.status === "booked" ? "Booked" : l.status === "replied" ? "Replied" : l.status === "lost" ? "Closed" : "Open"}</Pill></td>
              </tr>
            ))}
          </Table>
        </Card>
        <div className="flex flex-col gap-4">
          <Card><CardHead title="Where they reached out" sub="Last 30 days" /><BarList rows={pages} color="#4ade9a" /></Card>
          <Card>
            <CardHead title="How it connects" />
            <ul className="flex flex-col gap-3 text-[13px]">
              {["Your site's form sends us the submission", "A lead is created with name, phone and service", "An email goes to the person right away", "You get the job alert with their details", "The follow-up sequence takes over"].map((t) => <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-good" strokeWidth={2} /><span className="text-muted-foreground">{t}</span></li>)}
            </ul>
          </Card>
        </div>
      </div>
      <LeadTimelineSheet lead={sel} now={ds.now} followup={settings.modules.followup.active} onClose={() => setSel(null)} />
    </>
  );
}
export default function Page() { return <Gate module="forms">{(ds) => <Forms ds={ds} />}</Gate>; }
