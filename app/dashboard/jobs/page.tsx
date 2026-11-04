"use client";

import { useEffect, useState } from "react";
import { CalendarClock, DollarSign, Hammer } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, Stat, Table, when } from "@/components/kit";
import { Editable } from "@/components/ui/editable";
import { money } from "@/lib/stats";
import { JobsTaskList } from "@/components/jobs-tasks";
import { LeadTimelineSheet } from "@/components/lead-timeline";
import { useSettings } from "@/lib/store";
import type { Dataset, Lead } from "@/lib/types";

const ST: Record<string, [string, string]> = { scheduled: ["blue", "Scheduled"], in_progress: ["warn", "In progress"], completed: ["good", "Completed"] };
const KEY = "nc_job_values_v1";

function Jobs({ ds }: { ds: Dataset }) {
  const { settings } = useSettings();
  const [sel, setSel] = useState<Lead | null>(null);
  const [vals, setVals] = useState<Record<string, number>>({});
  useEffect(() => { try { setVals(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {} }, []);
  const val = (j: Dataset["jobs"][number]) => vals[j.id] ?? j.value;
  const set = (id: string, raw: string) => { const n = Number(raw.replace(/[^0-9.]/g, "")); const next = { ...vals, [id]: n }; setVals(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} };
  const total = ds.jobs.reduce((s, j) => s + (val(j) ?? 0), 0);
  const valuedN = ds.jobs.filter((j) => val(j) != null).length;
  return (
    <>
      <PageTitle title="Jobs" sub="Booked work. You type in each job's value after the estimate, so these numbers are yours, not ours." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Hammer} label="Jobs booked, 60 days" value={ds.jobs.length} explain="jobs" />
        <Stat icon={CalendarClock} label="Scheduled now" value={ds.jobs.filter((j) => j.status === "scheduled").length} explain="jobs" />
        <Stat icon={DollarSign} label="Total booked value (60 days)" value={money(total)} hint={`${valuedN} valued, avg ${money(valuedN ? total / valuedN : 0)}`} explain="jobs" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <JobsTaskList ds={ds} title="Booked jobs" count={7} className="h-fit lg:col-span-1" />
      <Card className="lg:col-span-2">
        <CardHead title="All jobs" sub="Click a value to change it" />
        <Table head={["Customer", "Service", "Source", "Status", "Booked", "Value"]}>
          {ds.jobs.slice(0, 50).map((j) => (
            <tr key={j.id} onClick={() => setSel(ds.leads.find((l) => l.id === j.leadId) ?? null)} className="cursor-pointer transition hover:bg-foreground/[0.03]">
              <td className="whitespace-nowrap font-medium">{j.customer}</td>
              <td className="whitespace-nowrap text-muted-foreground">{j.service}</td>
              <td className="whitespace-nowrap text-muted-foreground">{j.source === "call" ? "Phone call" : j.source === "form" ? "Website form" : "Email"}</td>
              <td><Pill tone={ST[j.status][0]}>{ST[j.status][1]}</Pill></td>
              <td className="tnum whitespace-nowrap text-muted-foreground">{when(j.at)}</td>
              <td className="tnum whitespace-nowrap" onClick={(e) => e.stopPropagation()}><Editable value={val(j) != null ? money(val(j) as number) : ""} placeholder="Add value" onSave={(v) => set(j.id, v)} className="inline-block min-w-14" /></td>
            </tr>
          ))}
        </Table>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-4 text-[13px]"><span className="text-muted-foreground">Total of the {Math.min(50, ds.jobs.length)} jobs shown</span><span className="tnum font-medium">{money(ds.jobs.slice(0, 50).reduce((s, j) => s + (val(j) ?? 0), 0))}</span></div>
      </Card>
      </div>
      <LeadTimelineSheet lead={sel} now={ds.now} followup={settings.modules.followup.active} onClose={() => setSel(null)} />
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Jobs ds={ds} />}</Gate>; }
