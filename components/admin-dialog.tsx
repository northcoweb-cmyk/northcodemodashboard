"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { AGENTS } from "@/lib/agents";
import { DEFAULTS, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-foreground" : "bg-white/15")}><i className={cn("absolute top-0.5 size-4 rounded-full transition-all", on ? "left-[18px] bg-background" : "left-0.5 bg-white/70")} /></button>;
}
const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">{label}
    <input defaultValue={value} onBlur={(e) => e.target.value.trim() && onChange(e.target.value.trim())} className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-white/25" />
  </label>
);

const MODULES = [
  { k: "followup" as const, title: "Follow-up emails", sub: "Instant reply, next-day check-in, day-4 follow-up." },
  { k: "forms" as const, title: "Website form speed-to-lead", sub: "Connects the site's contact forms and replies in minutes." },
  { k: "checkins" as const, title: "Check-in calls", sub: "Outbound calls asking people who didn't book if they still need help." },
];

export function AdminDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { settings, update, setModule, reset } = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState(""); const [bad, setBad] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (r.ok) { setUnlocked(true); setBad(false); } else { setBad(true); setPin(""); }
  }
  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setUnlocked(false); setPin(""); } }} title="Admin" description="Controls for what this client sees" width="max-w-lg" side="center">
      {!unlocked ? (
        <form onSubmit={unlock} className="mx-auto flex max-w-xs flex-col items-center gap-4 py-6 text-center">
          <Lock className="size-5 text-muted-foreground" strokeWidth={1.5} />
          <input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Admin PIN" className={cn("w-full rounded-lg border bg-background px-3 py-2.5 text-center text-sm tracking-[0.3em] outline-none", bad ? "border-bad" : "border-border focus:border-white/25")} />
          <button className="w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background">Unlock</button>
        </form>
      ) : (
        <div className="flex flex-col gap-7">
          <section className="flex flex-col gap-4">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Modules</h4>
            {MODULES.map((m) => (
              <div key={m.k} className="rounded-xl border border-border p-3.5">
                <div className="text-[13px] font-medium">{m.title}</div><p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>
                <div className="mt-3 flex items-center justify-between text-xs"><span>Running</span><Toggle label={`${m.title} running`} on={settings.modules[m.k].active} onChange={(v) => setModule(m.k, { active: v, ...(v ? {} : {}) })} /></div>
                <div className="mt-2.5 flex items-center justify-between text-xs"><span>Show page in sidebar</span><Toggle label={`${m.title} in sidebar`} on={settings.modules[m.k].sidebar} onChange={(v) => setModule(m.k, { sidebar: v })} /></div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-border p-3.5 text-xs"><div><div className="text-[13px] font-medium">"How it runs" popups</div><p className="mt-0.5 text-muted-foreground">Click any card to see where the number comes from.</p></div><Toggle label="Popups" on={settings.bubbles} onChange={(v) => update({ bubbles: v })} /></div>
          </section>
          <section className="flex flex-col gap-3">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Business</h4>
            <Field label="Business name" value={settings.businessName} onChange={(v) => update({ businessName: v })} />
            <Field label="Owner" value={settings.ownerName} onChange={(v) => update({ ownerName: v })} />
            <Field label="Phone" value={settings.phone} onChange={(v) => update({ phone: v })} />
            <Field label="Alert email" value={settings.alertEmail} onChange={(v) => update({ alertEmail: v })} />
            <Field label="Hours" value={settings.hours} onChange={(v) => update({ hours: v })} />
            <Field label="Service area" value={settings.serviceArea} onChange={(v) => update({ serviceArea: v })} />
            <Field label="Greeting" value={settings.greeting} onChange={(v) => update({ greeting: v })} />
          </section>
          <section className="flex flex-col gap-3">
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Agent names</h4>
            {AGENTS.map((a) => <Field key={a.id} label={a.name} value={settings.agentNames[a.id] || a.name} onChange={(v) => update({ agentNames: { ...settings.agentNames, [a.id]: v } })} />)}
          </section>
          <button onClick={() => { reset(); }} className="self-start rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground">Reset everything to defaults ({DEFAULTS.businessName})</button>
        </div>
      )}
    </Sheet>
  );
}
