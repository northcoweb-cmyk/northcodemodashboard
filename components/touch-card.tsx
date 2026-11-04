"use client";

import { useState } from "react";
import { Hand } from "lucide-react";
import { Card, CardHead, Pill } from "@/components/kit";
import { LeadTimelineSheet } from "@/components/lead-timeline";
import { touchpoints } from "@/lib/lead";
import { money } from "@/lib/stats";
import { useSettings } from "@/lib/store";
import type { Dataset, Lead } from "@/lib/types";

/** The short list of things only a person can do, with the money riding on each. */
export function TouchCard({ ds, limit = 6 }: { ds: Dataset; limit?: number }) {
  const { settings } = useSettings();
  const [sel, setSel] = useState<Lead | null>(null);
  const all = touchpoints(ds);
  const total = all.reduce((a, x) => a + (x.tp.value ?? 0), 0);
  return (
    <Card>
      <CardHead title="Needs your touch" sub={all.length ? `${all.length} leads waiting on a person, ${money(total)} in quotes and jobs` : "Nothing is waiting on you."} right={<Hand className="size-4 text-muted-foreground" strokeWidth={1.5} />} />
      <ul className="divide-y divide-border/60">
        {all.slice(0, limit).map(({ lead, tp }) => (
          <li key={lead.id}>
            <button onClick={() => setSel(lead)} className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-foreground/[0.03]">
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{lead.name} <span className="font-normal text-muted-foreground">· {lead.service}</span></span><span className="block truncate text-xs text-muted-foreground">{tp.reason}. {tp.action}</span></span>
              <span className="flex shrink-0 items-center gap-2">{tp.value ? <span className="tnum text-[13px]">{money(tp.value)}</span> : null}<Pill tone={tp.level === "now" ? "warn" : "mute"}>{tp.level === "now" ? "Today" : "Soon"}</Pill></span>
            </button>
          </li>
        ))}
      </ul>
      <LeadTimelineSheet lead={sel} followup={settings.modules.followup.active} onClose={() => setSel(null)} />
    </Card>
  );
}
