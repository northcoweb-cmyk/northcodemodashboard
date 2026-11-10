"use client";

import { Sheet } from "@/components/ui/sheet";
import { AskAgent } from "@/components/ask-agent";
import { Pill, when } from "@/components/kit";
import { bookedVia, callForLead, locationOf } from "@/lib/lead";
import { crewFor, dispatchMessage } from "@/lib/dispatch";
import { money } from "@/lib/stats";
import { useData, useSettings } from "@/lib/store";
import type { Job, Lead } from "@/lib/types";

const ST: Record<string, [string, string]> = { scheduled: ["blue", "Scheduled"], in_progress: ["warn", "In progress"], completed: ["good", "Completed"] };

export function JobSheet({ job, onClose, onLead }: { job: Job | null; onClose: () => void; onLead: (l: Lead) => void }) {
  const { data } = useData();
  const { settings } = useSettings();
  const lead = job && data ? data.leads.find((l) => l.id === job.leadId) : undefined;
  const call = lead && data ? callForLead(lead, data) : undefined;
  const crew = job && settings.modules.crew.active ? crewFor(job, settings.crew) : [];
  return (
    <Sheet open={!!job} onOpenChange={(o) => !o && onClose()} title="Job" description="Customer, car and how it got booked" width="max-w-lg">
      {job && (
        <div className="flex flex-col gap-6">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-medium">{job.customer}</h3><Pill tone={ST[job.status][0]}>{ST[job.status][1]}</Pill></div><div className="mt-1 text-xs text-muted-foreground">{job.phone}</div></div>
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
            {[["Job", job.service], ["Value", job.value != null ? money(job.value) : "Not valued yet"], ["Address", job.address.split(",")[0]], ["Location", locationOf(job.address)], ["Booked", when(job.at)], ["How", (lead && bookedVia(lead, call)) ?? "Booked from the dashboard"]].map(([l, v]) => <div key={l} className="min-w-0"><div className="text-[11px] text-muted-foreground">{l}</div><div className="mt-0.5 text-[13px] font-medium">{v}</div></div>)}
          </div>
          {crew.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Crew dispatched</div>
              <ul className="mb-3 flex flex-col gap-2">{crew.map((c) => <li key={c.id} className="flex items-center gap-3 text-[13px]"><span className="flex size-7 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: c.color }}>{c.name.split(" ").map((p) => p[0]).join("")}</span><span className="flex-1">{c.name} <span className="text-muted-foreground">· {c.role}</span></span><span className="tnum text-xs text-muted-foreground">{c.phone}</span></li>)}</ul>
              <p className="rounded-lg bg-foreground/[0.04] px-3 py-2 text-xs leading-relaxed text-muted-foreground">{dispatchMessage(job, settings.businessName)}</p>
            </div>
          )}
          <AskAgent agent="jobs" prompts={["What jobs are scheduled?", "Who's available right now?"]} onAsk={onClose} />
          {lead && <button onClick={() => { onClose(); onLead(lead); }} className="self-start rounded-lg border border-border px-3.5 py-2 text-xs text-muted-foreground transition hover:text-foreground">View the lead and everything that happened</button>}
        </div>
      )}
    </Sheet>
  );
}
