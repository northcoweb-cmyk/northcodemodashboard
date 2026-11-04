"use client";

import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, Table, Stat, when } from "@/components/kit";
import { summary, sources } from "@/lib/stats";
import { BarList } from "@/components/ui/charts";
import { Timer, Users, FileInput } from "lucide-react";
import type { Dataset } from "@/lib/types";

const ST: Record<string, [string, string]> = { new: ["blue", "New"], contacted: ["mute", "Contacted"], replied: ["good", "Replied"], booked: ["good", "Booked"], lost: ["mute", "Closed"] };
const SRC = { call: "Phone call", form: "Website form", email: "Email" };

function Leads({ ds }: { ds: Dataset }) {
  const s = summary(ds, 30);
  return (
    <>
      <PageTitle title="Leads" sub="Everyone who reached out, where they came from, and how fast they got a reply." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="Leads, last 30 days" value={s.leadCount} explain="leads" />
        <Stat icon={Timer} label="Time to first reply" value={s.avgFirstReply} unit="min" explain="reply" />
        <Stat icon={FileInput} label="From website forms" value={s.formLeads} explain="sources" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="All leads" sub="Most recent first" />
          <Table head={["Name", "Source", "Service", "Status", "First reply", "Received"]}>
            {ds.leads.slice(0, 50).map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap font-medium">{l.name}<div className="text-[11px] font-normal text-muted-foreground">{l.phone}</div></td>
                <td className="whitespace-nowrap text-muted-foreground">{SRC[l.source]}</td>
                <td className="whitespace-nowrap text-muted-foreground">{l.service}</td>
                <td><Pill tone={ST[l.status][0]}>{ST[l.status][1]}</Pill></td>
                <td className="tnum whitespace-nowrap text-muted-foreground">{l.firstReplyMin} min</td>
                <td className="tnum whitespace-nowrap text-muted-foreground">{when(l.at)}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card explain="sources" className="h-fit"><CardHead title="By source" sub="Last 30 days" /><BarList rows={sources(ds, 30).map((x) => ({ label: x.label, n: x.n }))} color="#4ade9a" /></Card>
      </div>
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Leads ds={ds} />}</Gate>; }
