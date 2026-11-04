"use client";

import { createContext, useContext, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { EXPLAIN } from "@/lib/explain";
import { agentById } from "@/lib/agents";
import { AgentIcon } from "@/components/agent-icon";
import { useData, useSettings } from "@/lib/store";
import { detailsFor } from "@/lib/details";

const Ctx = createContext<{ show: (k: string) => void; enabled: boolean }>({ show: () => {}, enabled: false });
export const useExplain = () => useContext(Ctx);

export function ExplainProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { data } = useData();
  const [key, setKey] = useState<string | null>(null);
  const info = key ? EXPLAIN[key] : null;
  const agent = info ? agentById(info.agent) : null;
  const det = key && data ? detailsFor(key, data) : null;
  return (
    <Ctx.Provider value={{ show: setKey, enabled: settings.bubbles }}>
      {children}
      <Sheet open={!!info} onOpenChange={(o) => !o && setKey(null)} title={info?.title ?? ""} description="How this number is produced">
        {info && agent && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <AgentIcon color={agent.color} size={40} />
              <div className="min-w-0"><div className="text-sm font-medium">{settings.agentNames[agent.id] || agent.name}</div><div className="text-xs text-muted-foreground">{agent.role}</div></div>
            </div>
            <ol className="relative flex flex-col gap-5 pl-7 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-border">
              {info.steps.map((s, i) => (
                <li key={s.label} className="relative">
                  <span className="absolute -left-7 top-0.5 flex size-[19px] items-center justify-center rounded-full border border-border bg-background text-[10px] tnum text-muted-foreground">{i + 1}</span>
                  <div className="text-[13px] font-medium">{s.label}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{s.detail}</p>
                </li>
              ))}
            </ol>
            <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground"><span className="text-foreground/80">Data source · </span>{info.source}</div>
            {info.note && <p className="text-xs leading-relaxed text-muted-foreground">{info.note}</p>}
            {det && (
              <div>
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Behind this number · {det.heading}</h4>
                {det.total && <div className="mb-3 grid gap-2 rounded-xl bg-foreground/[0.04] p-3">{det.total.map((t) => <div key={t.label} className="flex items-center justify-between text-[13px]"><span className="text-muted-foreground">{t.label}</span><span className="tnum font-medium">{t.value}</span></div>)}</div>}
                <ul className="divide-y divide-border/60">
                  {det.rows.map((r, i) => <li key={i} className="flex items-start justify-between gap-3 py-2.5"><span className="min-w-0"><span className="block truncate text-[13px] font-medium">{r.t}</span><span className="block truncate text-xs text-muted-foreground">{r.s}</span></span><span className="tnum shrink-0 pt-0.5 text-xs text-muted-foreground">{r.r}</span></li>)}
                </ul>
                {det.more > 0 && <p className="mt-2 text-xs text-muted-foreground">and {det.more} more. Open the page for the full list.</p>}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </Ctx.Provider>
  );
}
