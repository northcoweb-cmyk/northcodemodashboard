"use client";

import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Table, dayLabel } from "@/components/kit";
import { delta, issueRows, money, summary } from "@/lib/stats";
import { useSettings } from "@/lib/store";
import type { Dataset } from "@/lib/types";

function Reports({ ds }: { ds: Dataset }) {
  const { settings } = useSettings();
  const w = summary(ds, 7);
  const p = (() => { const a = summary(ds, 14); return { answered: a.answered - w.answered, leadCount: a.leadCount - w.leadCount, jobsBooked: a.jobsBooked - w.jobsBooked, afterHours: a.afterHours - w.afterHours, issues: a.issues - w.issues }; })();
  const rows: [string, number, number][] = [["Calls answered", w.answered, p.answered], ["After-hours calls", w.afterHours, p.afterHours], ["Leads captured", w.leadCount, p.leadCount], ["Jobs booked", w.jobsBooked, p.jobsBooked], ["Calls needing attention", w.issues, p.issues]];
  const top = issueRows(ds)[0];
  return (
    <>
      <PageTitle title="Reports" sub="The same summary that lands in your inbox every Saturday morning." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="This week vs last week" sub={`${dayLabel(ds.now - 7 * 86400000)} to ${dayLabel(ds.now)}`} />
          <Table head={["", "This week", "Last week", "Change"]}>
            {rows.map(([l, a, b]) => <tr key={l}><td className="font-medium">{l}</td><td className="tnum">{a}</td><td className="tnum text-muted-foreground">{b}</td><td className="tnum text-muted-foreground">{b ? `${delta(a, b) >= 0 ? "+" : ""}${delta(a, b)}%` : "–"}</td></tr>)}
          </Table>
          <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">First reply to new leads averaged <span className="text-foreground">{w.avgFirstReply} minutes</span>. {w.valued ? <>Jobs you valued this week total <span className="text-foreground">{money(w.pipelineValue)}</span>.</> : null} Most common issue since its fix: <span className="text-foreground">{top.title.toLowerCase()}</span>.</p>
        </Card>
        <Card className="h-fit">
          <CardHead title="Weekly email" sub="Sent Saturday, 8am" />
          <div className="rounded-xl border border-border bg-background p-4 text-[13px] leading-relaxed">
            <div className="text-xs text-muted-foreground">From NorthCo · To {settings.alertEmail}</div>
            <div className="mt-2 font-medium">{settings.businessName}: your week</div>
            <p className="mt-3 text-muted-foreground">{w.answered} calls answered, {w.afterHours} after hours. {w.leadCount} new leads, {w.jobsBooked} jobs booked. {w.issues} calls needed attention and {w.recovered} were recovered as leads.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Reports ds={ds} />}</Gate>; }
