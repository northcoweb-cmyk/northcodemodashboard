"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { AGENTS } from "@/lib/agents";
import { DEFAULTS, useData, useSettings } from "@/lib/store";
import { FORM_PAGES } from "@/lib/seed";
import { SERVICES, SIM_OUTCOMES, simulateCall, simulateForm, type SimOutcome } from "@/lib/sim";
import { cn } from "@/lib/utils";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-foreground" : "bg-foreground/15")}><i className={cn("absolute top-0.5 size-4 rounded-full transition-all", on ? "left-[18px] bg-background" : "left-0.5 bg-foreground/70")} /></button>;
}
const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">{label}
    <input defaultValue={value} onBlur={(e) => e.target.value.trim() && onChange(e.target.value.trim())} className="rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground/25" />
  </label>
);

const sel = "rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none focus:border-foreground/25";
function SimPanel() {
  const { simulate, clearSim, sim } = useData();
  const [kind, setKind] = useState<"call" | "form">("call");
  const [name, setName] = useState("Dana Whitfield");
  const [phone, setPhone] = useState("(253) 555-0188");
  const [email, setEmail] = useState("dana@gmail.com");
  const [service, setService] = useState(SERVICES[0]);
  const [address, setAddress] = useState("1840 Diamond Ave, Gaithersburg, MD");
  const [outcome, setOutcome] = useState<SimOutcome>("job_booked");
  const [via, setVia] = useState(`${FORM_PAGES[0][0]} · ${FORM_PAGES[0][1]}`);
  const [msg, setMsg] = useState("");
  const count = sim.calls.length + sim.leads.length;
  function add() {
    if (kind === "call") { simulate(simulateCall({ name, phone, service, address, outcome })); setMsg(outcome === "job_booked" || outcome === "transferred" ? "Call added. A job was booked and the crew was dispatched. Check Calls, Jobs, Crew and Activity." : "Call added. Check Calls and Activity."); }
    else { simulate(simulateForm({ name, phone, email, service, address, via })); setMsg("Form lead added. Open Website forms and click it to see the timeline."); }
  }
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between"><h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Simulate an event</h4><div className="flex rounded-full border border-border p-0.5 text-xs">{(["call", "form"] as const).map((k) => <button key={k} onClick={() => setKind(k)} className={cn("rounded-full px-3 py-1 transition", kind === k ? "bg-foreground text-background" : "text-muted-foreground")}>{k === "call" ? "Incoming call" : "Website form"}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={sel} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={sel} />
        {kind === "form" && <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={cn(sel, "col-span-2")} />}
        <select value={service} onChange={(e) => setService(e.target.value)} className={sel}>{SERVICES.map((x) => <option key={x}>{x}</option>)}</select>
        {kind === "call" ? <select value={outcome} onChange={(e) => setOutcome(e.target.value as SimOutcome)} className={sel}>{SIM_OUTCOMES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
          : <select value={via} onChange={(e) => setVia(e.target.value)} className={sel}>{FORM_PAGES.map((f) => <option key={f[1]} value={`${f[0]} · ${f[1]}`}>{f[0]}</option>)}</select>}
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className={cn(sel, "col-span-2")} />
      </div>
      <div className="flex items-center gap-3"><button onClick={add} className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background">Add to dashboard</button>{count > 0 && <button onClick={() => { clearSim(); setMsg("Simulated events cleared."); }} className="text-xs text-muted-foreground hover:text-foreground">Clear {count} simulated</button>}</div>
      {msg && <p className="text-xs text-good">{msg}</p>}
    </section>
  );
}

function AiPanel() {
  const [st, setSt] = useState<{ keySet: boolean; model: string; dailyCap: number } | null>(null);
  const [res, setRes] = useState<string>("");
  useEffect(() => { fetch("/api/agent/status").then((r) => r.json()).then(setSt).catch(() => {}); }, []);
  async function test() { setRes("Testing..."); const r = await fetch("/api/agent/status", { method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false, error: "Request failed" })); setRes(r.ok ? "Working. OpenAI answered." : `Failed: ${r.error}`); }
  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-border p-4">
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">AI answers</h4>
      <p className="text-[13px]">{st ? (st.keySet ? `OpenAI key found. Model ${st.model}, up to ${st.dailyCap} questions a day.` : "No OpenAI key on this deployment. Agents use the built-in answers.") : "Checking..."}</p>
      <div className="flex items-center gap-3"><button onClick={test} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground">Test the connection</button>{res && <span className={cn("text-xs", res.startsWith("Working") ? "text-good" : "text-muted-foreground")}>{res}</span>}</div>
    </section>
  );
}

const MODULES = [
  { k: "crew" as const, title: "Crew dispatch", sub: "Sends the right crew the address and customer details when a job is booked." },
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
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setUnlocked(false); setPin(""); } }} title="Admin" description="Controls for what this client sees" width="max-w-xl" side="center">
      {!unlocked ? (
        <form onSubmit={unlock} className="mx-auto flex max-w-xs flex-col items-center gap-4 py-6 text-center">
          <Lock className="size-5 text-muted-foreground" strokeWidth={1.5} />
          <input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Admin PIN" className={cn("w-full rounded-lg border bg-background px-3 py-2.5 text-center text-sm tracking-[0.3em] outline-none", bad ? "border-bad" : "border-border focus:border-foreground/25")} />
          <button className="w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background">Unlock</button>
        </form>
      ) : (
        <div className="flex flex-col gap-7">
          <SimPanel />
          <AiPanel />
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
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">Crew</h4>
            {settings.crew.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[13px]"><span className="min-w-0 truncate">{c.name} <span className="text-muted-foreground">· {c.phone}</span></span><button onClick={() => update({ crew: settings.crew.filter((x) => x.id !== c.id) })} className="shrink-0 text-xs text-muted-foreground hover:text-bad">Remove</button></div>
            ))}
            <button onClick={() => update({ crew: [...settings.crew, { id: `cr${Date.now()}`, name: "New crew member", role: "Technician", phone: "(240) 555-0100", skills: ["Paint protection film"], color: "#2a62e8", status: "available" }] })} className="self-start rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground">Add crew member</button>
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
