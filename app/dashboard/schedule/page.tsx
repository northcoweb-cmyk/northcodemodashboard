"use client";

import { Gate } from "@/components/gate";
import { Card, PageTitle } from "@/components/kit";
import { crewFor } from "@/lib/dispatch";
import { useSettings } from "@/lib/store";
import type { Dataset } from "@/lib/types";

const DAY = 86400000;

function Schedule({ ds }: { ds: Dataset }) {
  const { settings } = useSettings();
  const open = ds.jobs.filter((j) => j.status !== "completed").slice(0, 14);
  const startOfToday = new Date(new Date(ds.now).toLocaleString("en-US", { timeZone: "America/New_York" })); startOfToday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(startOfToday); d.setDate(d.getDate() + i); return d; });
  const bucket = days.map(() => [] as { hour: number; job: (typeof open)[number] }[]);
  open.forEach((j, i) => { const n = parseInt(j.id.slice(2), 10); bucket[Math.min(4, Math.floor(i / 3))].push({ hour: 8 + (n % 9), job: j }); });
  bucket.forEach((b) => b.sort((a, c) => a.hour - c.hour));
  const hr = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
  return (
    <>
      <PageTitle title="Schedule" sub="Booked jobs and who's heading out, day by day." />
      <div className="grid gap-3 md:grid-cols-5">
        {days.map((d, i) => (
          <Card key={i} className="p-4">
            <div className="mb-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">{i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" })}</div><div className="text-lg font-medium tnum">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div></div>
            {bucket[i].length === 0 && <p className="text-xs text-muted-foreground">Nothing booked yet.</p>}
            <ul className="flex flex-col gap-2.5">
              {bucket[i].map(({ hour, job }) => (
                <li key={job.id} className="rounded-xl border border-border p-2.5">
                  <div className="tnum text-[11px] text-muted-foreground">{hr(hour)}</div>
                  <div className="mt-0.5 text-[13px] font-medium leading-snug">{job.service}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{job.address.split(",")[0]}</div>
                  {settings.modules.crew.active && <div className="mt-2 flex -space-x-1.5">{crewFor(job, settings.crew).map((c) => <span key={c.id} title={c.name} className="flex size-5 items-center justify-center rounded-full border-2 border-card text-[8px] font-semibold text-white" style={{ background: c.color }}>{c.name.split(" ").map((p) => p[0]).join("")}</span>)}</div>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Schedule ds={ds} />}</Gate>; }
