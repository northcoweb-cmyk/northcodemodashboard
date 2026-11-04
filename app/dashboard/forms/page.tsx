"use client";

import { Check, FileInput, Timer, Zap } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, Stat, Table, when } from "@/components/kit";
import { summary } from "@/lib/stats";
import type { Dataset } from "@/lib/types";

function Forms({ ds }: { ds: Dataset }) {
  const s = summary(ds, 30);
  const fl = ds.leads.filter((l) => l.source === "form");
  const avg = fl.length ? Math.round((fl.reduce((a, l) => a + l.firstReplyMin, 0) / fl.length) * 10) / 10 : 0;
  return (
    <>
      <PageTitle title="Website forms" sub="When someone fills out a form on your site, they get a reply in minutes and you get the details." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={FileInput} label="Form leads, 30 days" value={s.formLeads} explain="leads" />
        <Stat icon={Timer} label="Average first reply" value={avg} unit="min" explain="reply" />
        <Stat icon={Zap} label="Replied within 10 min" value={fl.length ? Math.round((fl.filter((l) => l.firstReplyMin <= 10).length / fl.length) * 100) : 0} unit="%" explain="reply" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="Recent submissions" />
          <Table head={["Name", "Service", "Replied in", "Received", "Status"]}>
            {fl.slice(0, 20).map((l) => <tr key={l.id}><td className="font-medium">{l.name}</td><td className="text-muted-foreground">{l.service}</td><td className="tnum text-muted-foreground">{l.firstReplyMin} min</td><td className="tnum whitespace-nowrap text-muted-foreground">{when(l.at)}</td><td><Pill tone={l.status === "booked" ? "good" : "mute"}>{l.status === "booked" ? "Booked" : "Open"}</Pill></td></tr>)}
          </Table>
        </Card>
        <Card className="h-fit">
          <CardHead title="How it connects" />
          <ul className="flex flex-col gap-3 text-[13px]">
            {["Your site's form sends us the submission", "A lead is created with name, phone and service", "An email goes to the person right away", "You get the job alert with their details", "The follow-up sequence takes over"].map((t) => <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-good" strokeWidth={2} /><span className="text-muted-foreground">{t}</span></li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
export default function Page() { return <Gate module="forms">{(ds) => <Forms ds={ds} />}</Gate>; }
