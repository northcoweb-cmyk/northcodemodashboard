"use client";

import { PhoneOutgoing, PhoneMissed, ThumbsUp, Search } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, Stat, Table, when } from "@/components/kit";
import { BarList } from "@/components/ui/charts";
import type { Dataset } from "@/lib/types";

const R: Record<string, [string, string]> = { booked: ["good", "Booked"], still_needs_help: ["warn", "Still needs help"], got_help_elsewhere: ["mute", "Found someone else"], no_answer: ["mute", "No answer"], voicemail_left: ["mute", "Left voicemail"] };

function CheckIns({ ds }: { ds: Dataset }) {
  const c = ds.checkins;
  const n = (r: string) => c.filter((x) => x.result === r).length;
  return (
    <>
      <PageTitle title="Check-in calls" sub="A few days after someone asks for help and doesn't book, the agent calls once to ask if they're covered. Only people who contacted you are called, during daytime hours." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={PhoneOutgoing} label="Check-in calls" value={c.length} hint="last 60 days" />
        <Stat icon={ThumbsUp} label="Booked after the call" value={n("booked")} />
        <Stat icon={Search} label="Still need help" value={n("still_needs_help")} hint="handed to you" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead title="Recent check-ins" />
          <Table head={["Person", "Called", "Result"]}>{c.slice(0, 25).map((x) => <tr key={x.id}><td className="font-medium">{x.name}</td><td className="tnum whitespace-nowrap text-muted-foreground">{when(x.at)}</td><td><Pill tone={R[x.result][0]}>{R[x.result][1]}</Pill></td></tr>)}</Table>
        </Card>
        <Card className="h-fit"><CardHead title="Results" /><BarList rows={Object.entries(R).map(([k, [, l]]) => ({ label: l, n: n(k) }))} color="#5fd6e8" /><p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><PhoneMissed className="size-3.5" />Anyone who says stop is never called again.</p></Card>
      </div>
    </>
  );
}
export default function Page() { return <Gate module="checkins">{(ds) => <CheckIns ds={ds} />}</Gate>; }
