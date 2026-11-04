"use client";

import { useState } from "react";
import { Check, MapPin, Phone, Plus, Send, Trash2 } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, PageTitle, Pill, when } from "@/components/kit";
import { Sheet } from "@/components/ui/sheet";
import { dispatches, type Dispatch } from "@/lib/dispatch";
import { SERVICES } from "@/lib/sim";
import { useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { CrewMember, Dataset } from "@/lib/types";

const ST: Record<string, [string, string]> = { available: ["good", "Available"], on_job: ["warn", "On a job"], off: ["mute", "Off today"] };
const ORDER = ["available", "on_job", "off"] as const;
const COLORS = ["#2a62e8", "#12935f", "#b9770e", "#8a4fe0", "#d6457a", "#0e8aa6", "#c2410c"];
const initials = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const input = "rounded-lg border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-foreground/25";

function CrewForm({ member, onSave, onRemove, onClose }: { member: CrewMember | null; onSave: (m: CrewMember) => void; onRemove?: () => void; onClose: () => void }) {
  const { settings } = useSettings();
  const [m, setM] = useState<CrewMember>(member ?? { id: `cr${Date.now()}`, name: "", role: "Technician", phone: "", skills: ["Water damage"], color: COLORS[settings.crew.length % COLORS.length], status: "available" });
  const toggle = (s: string) => setM({ ...m, skills: m.skills.includes(s) ? m.skills.filter((x) => x !== s) : [...m.skills, s] });
  const ok = m.name.trim() && m.phone.trim() && m.skills.length;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-xs text-muted-foreground">Name<input autoFocus value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="Full name" className={input} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5 text-xs text-muted-foreground">Role<input value={m.role} onChange={(e) => setM({ ...m, role: e.target.value })} className={input} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">Mobile number<input value={m.phone} onChange={(e) => setM({ ...m, phone: e.target.value })} placeholder="(253) 555-0100" className={input} /></label>
        </div>
      </div>
      <div><div className="mb-2 text-xs text-muted-foreground">Jobs they take</div><div className="flex flex-wrap gap-2">{SERVICES.map((s) => <button key={s} onClick={() => toggle(s)} className={cn("rounded-full border px-3 py-1.5 text-xs transition", m.skills.includes(s) ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")}>{s}</button>)}</div></div>
      <div><div className="mb-2 text-xs text-muted-foreground">Status today</div><div className="flex gap-2">{ORDER.map((s) => <button key={s} onClick={() => setM({ ...m, status: s })} className={cn("rounded-full border px-3 py-1.5 text-xs transition", m.status === s ? "border-foreground bg-foreground/10" : "border-border text-muted-foreground")}>{ST[s][1]}</button>)}</div></div>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        {onRemove ? <button onClick={onRemove} className="flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-bad"><Trash2 className="size-3.5" />Remove</button> : <span />}
        <div className="flex gap-2"><button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground">Cancel</button><button disabled={!ok} onClick={() => { onSave({ ...m, name: m.name.trim() }); onClose(); }} className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-30">{member ? "Save" : "Add to crew"}</button></div>
      </div>
    </div>
  );
}

function Crew({ ds }: { ds: Dataset }) {
  const { settings, update } = useSettings();
  const list = dispatches(ds, settings.crew, settings.businessName, 25);
  const [sel, setSel] = useState<Dispatch | null>(null);
  const [edit, setEdit] = useState<CrewMember | "new" | null>(null);
  const cur = sel ?? list[0];
  const save = (m: CrewMember) => update({ crew: settings.crew.some((c) => c.id === m.id) ? settings.crew.map((c) => (c.id === m.id ? m : c)) : [...settings.crew, m] });
  const jobsFor = (id: string) => list.filter((d) => d.crew.some((c) => c.id === id)).length;

  return (
    <>
      <PageTitle title="Crew" sub="When a job is booked, the right people are dispatched automatically with the address and the customer's details." right={
        <button onClick={() => update({ autoDispatch: !settings.autoDispatch })} className="flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs">
          <span>Auto-dispatch on booking</span>
          <span className={cn("relative h-5 w-9 rounded-full transition", settings.autoDispatch ? "bg-foreground" : "bg-foreground/15")}><i className={cn("absolute top-0.5 size-4 rounded-full transition-all", settings.autoDispatch ? "left-[18px] bg-background" : "left-0.5 bg-foreground/60")} /></span>
        </button>
      } />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settings.crew.map((c) => (
          <Card key={c.id} className="p-4" onClick={() => setEdit(c)}>
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: c.color }}>{initials(c.name)}</span>
              <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-medium">{c.name}</div><div className="mt-0.5 truncate text-xs text-muted-foreground">{c.role}</div></div>
              <Pill tone={ST[c.status][0]}>{ST[c.status][1]}</Pill>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground"><Phone className="size-3.5" strokeWidth={1.5} /><span className="tnum">{c.phone}</span></div>
            <div className="mt-3 flex flex-wrap gap-1.5">{c.skills.map((s) => <span key={s} className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>)}</div>
            <div className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground"><span className="tnum text-foreground">{jobsFor(c.id)}</span> recent dispatches</div>
          </Card>
        ))}
        <button onClick={() => setEdit("new")} className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"><Plus className="size-5" strokeWidth={1.5} />Add crew member</button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHead title="Dispatch log" sub="Most recent first. Click one to see exactly what the team received." />
          <ul className="flex flex-col divide-y divide-border/60">
            {list.slice(0, 12).map((d) => (
              <li key={d.id}>
                <button onClick={() => setSel(d)} className={cn("flex w-full items-center gap-3 py-3 text-left transition hover:bg-foreground/[0.03]", cur?.id === d.id && "bg-foreground/[0.04]")}>
                  <span className="flex -space-x-2">{d.crew.map((c) => <span key={c.id} className="flex size-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white" style={{ background: c.color }}>{initials(c.name)}</span>)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{d.job.service} · {d.job.customer}</span><span className="block truncate text-xs text-muted-foreground">{d.job.address}</span></span>
                  <span className="tnum shrink-0 text-[11px] text-muted-foreground">{when(d.sentAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {cur && (
          <Card className="h-fit lg:col-span-2">
            <CardHead title="What the crew gets" sub={`Sent ${when(cur.sentAt)}, 45 seconds after booking`} />
            <div className="rounded-[22px] border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground"><span>To: {cur.crew.map((c) => c.name.split(" ")[0]).join(", ") || "No one available"}</span><Send className="size-3" /></div>
              <div className="rounded-2xl rounded-bl-md bg-foreground px-3.5 py-2.5 text-[13px] leading-relaxed text-background">{cur.message}</div>
              <div className="mt-2 flex items-start gap-1.5 px-1 text-[11px] text-muted-foreground"><MapPin className="mt-0.5 size-3 shrink-0" /><span>{cur.job.address}</span></div>
              {cur.replies.map((r) => <div key={r.who} className="mt-2 flex flex-col items-end"><div className="rounded-2xl rounded-br-md bg-foreground/10 px-3 py-1.5 text-[13px]">{r.text}</div><span className="mt-0.5 text-[10px] text-muted-foreground">{r.who.split(" ")[0]} · {new Date(r.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })}</span></div>)}
            </div>
            <ul className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
              {["Job booked by the receptionist", "Crew matched by skill and availability", "Dispatch message sent with address and customer", "First reply accepts the job"].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-good" strokeWidth={2} />{t}</li>)}
            </ul>
          </Card>
        )}
      </div>

      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit === "new" ? "Add crew member" : "Crew member"} description="They get dispatched for the jobs you pick" width="max-w-md">
        {edit && <CrewForm key={edit === "new" ? "new" : edit.id} member={edit === "new" ? null : edit} onSave={save} onRemove={edit === "new" ? undefined : () => { update({ crew: settings.crew.filter((c) => c.id !== (edit as CrewMember).id) }); setEdit(null); }} onClose={() => setEdit(null)} />}
      </Sheet>
    </>
  );
}
export default function Page() { return <Gate module="crew">{(ds) => <Crew ds={ds} />}</Gate>; }
