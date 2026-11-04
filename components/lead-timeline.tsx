"use client";


import { motion } from "framer-motion";
import { Bell, CheckCheck, FileInput, Hourglass, Mail, MailOpen, Phone, RefreshCw, Reply, UserPlus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { AskAgent } from "@/components/ask-agent";
import { Pill, when } from "@/components/kit";
import { bookedVia, callForLead, jobForLead, locationOf, previousJobs, touchpoint, whyLead } from "@/lib/lead";
import { money } from "@/lib/stats";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Dataset, Lead } from "@/lib/types";

const DAY = 86400000;
const ST: Record<string, [string, string]> = { new: ["blue", "New"], contacted: ["mute", "Contacted"], replied: ["good", "Replied"], booked: ["good", "Booked"], lost: ["mute", "Closed"] };
type State = "done" | "pending" | "stopped";
interface Step { key: string; icon: React.ElementType; title: string; at: number; state: State; detail: string; msg?: string }

function steps(lead: Lead, now: number, followup: boolean): Step[] {
  const first = lead.name.split(" ")[0];
  const stopped = lead.status === "booked" || lead.status === "replied";
  const out: Step[] = [
    { key: "in", icon: lead.source === "call" ? Phone : FileInput, title: lead.source === "call" ? "Called in" : lead.source === "form" ? "Filled out your form" : "Emailed you", at: lead.at, state: "done", detail: lead.source === "form" && lead.via ? `From ${lead.via}.` : "The receptionist answered and took the details." },
    { key: "lead", icon: UserPlus, title: "Lead created, owner alerted", at: lead.at + 4000, state: "done", detail: "Details saved and a job alert emailed to you." },
    { key: "t1", icon: Mail, title: `First reply in ${lead.firstReplyMin} min`, at: lead.at + lead.firstReplyMin * 60000, state: "done", detail: lead.touches[0]?.replied ? "They replied." : lead.touches[0]?.opened ? "They opened it." : "Delivered.", msg: `Hi ${first}, thanks for reaching out about ${lead.service.toLowerCase()}. We have your address as ${lead.address} and someone will call you shortly.` },
  ];
  if (followup) {
    ([[2, "Next-day check-in", DAY + 9 * 3600000], [3, "Day-4 follow-up", 4 * DAY + 10 * 3600000]] as const).forEach(([n, title, off]) => {
      const t = lead.touches[n - 2 + 1]; const due = lead.at + off;
      if (t) out.push({ key: `t${n}`, icon: t.replied ? Reply : t.opened ? MailOpen : Mail, title, at: t.sentAt, state: "done", detail: t.replied ? "They replied, so the sequence stopped." : t.opened ? "Opened." : "Delivered." });
      else if (stopped) out.push({ key: `t${n}`, icon: Hourglass, title, at: due, state: "stopped", detail: lead.status === "booked" ? "Skipped. They booked." : "Skipped. They replied." });
      else out.push({ key: `t${n}`, icon: Hourglass, title, at: due, state: "pending", detail: due > now ? "Scheduled." : "Due now." });
    });
    if (lead.reactivation) out.push({ key: "react", icon: RefreshCw, title: "Win-back message", at: lead.reactivation.sentAt, state: "done", detail: lead.reactivation.result === "won" ? "They answered and booked." : lead.reactivation.result === "replied" ? "They replied." : "No reply.", msg: lead.reactivation.message });
  }
  return out;
}

function Field({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return <div className="min-w-0"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-0.5 break-words text-[13px] font-medium">{value}</div>{sub && <div className="truncate text-[11px] text-muted-foreground">{sub}</div>}</div>;
}

export function LeadDetail({ lead, ds, followup }: { lead: Lead; ds: Dataset; followup: boolean }) {
  const call = callForLead(lead, ds), job = jobForLead(lead, ds), prev = previousJobs(lead, ds);
  const tp = touchpoint(lead, job, ds.now), via = bookedVia(lead, call);
  const value = job?.value ?? lead.quote;
  const list = steps(lead, ds.now, followup);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-medium">{lead.name}</h3><Pill tone={ST[lead.status][0]}>{ST[lead.status][1]}</Pill>{lead.reactivation?.result === "won" && <Pill tone="good">Won back</Pill>}{prev.length > 0 && <Pill tone="blue">Returning customer</Pill>}</div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><a href={`tel:${lead.phone}`} className="hover:text-foreground">{lead.phone}</a><a href={`mailto:${lead.email}`} className="hover:text-foreground">{lead.email}</a></div>
      </div>

      {tp && (
        <div className={cn("rounded-xl border p-3.5", tp.level === "now" ? "border-warn/40 bg-warn/[0.07]" : "border-border bg-foreground/[0.03]")}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Needs a person</div>
          <div className="mt-1 text-[13px] font-medium">{tp.reason}</div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">{tp.action}{tp.value ? ` ${money(tp.value)} is on the line.` : ""}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-border p-4">
        <Field label="Job" value={lead.service} />
        <Field label={job ? "Job value" : "Quoted"} value={value ? money(value) : "No quote yet"} sub={job ? (job.value != null ? "Entered by you" : "Not valued yet") : lead.quote ? "Sent to the customer" : undefined} />
        <Field label="Address" value={lead.address.split(",")[0]} sub={lead.address.split(",").slice(1).join(",").trim()} />
        <Field label="Location" value={locationOf(lead.address)} />
        <Field label="Came in through" value={lead.source === "call" ? "Phone call" : lead.source === "form" ? "Website form" : "Email"} sub={lead.via} />
        <Field label="Speed to lead" value={`${lead.firstReplyMin} min`} sub={lead.source === "call" ? "Answered on the first ring" : "From submission to first reply"} />
        <Field label="Received" value={when(lead.at)} />
        <Field label="How it got booked" value={via ?? (lead.status === "lost" ? "Not booked" : "Not booked yet")} sub={job ? `Crew: ${job.status.replace("_", " ")}` : undefined} />
      </div>

      <div><div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Why they're a lead</div><p className="text-[13px] leading-relaxed text-muted-foreground">{whyLead(lead, call)}</p></div>

      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">History with you</div>
        {prev.length ? <ul className="divide-y divide-border/60">{prev.map((j) => <li key={j.id} className="flex items-center justify-between py-2 text-[13px]"><span>{j.service}<span className="text-muted-foreground"> · {j.address.split(",")[0]}</span></span><span className="tnum text-muted-foreground">{new Date(j.at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Los_Angeles" })} · {j.value != null ? money(j.value) : "-"}</span></li>)}</ul> : <p className="text-[13px] text-muted-foreground">First time they've contacted you.</p>}
      </div>

      <div>
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">What happened</div>
        <ol className="flex flex-col">
          {list.map((s, i) => (
            <motion.li key={s.key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.18 }} className="relative flex gap-3 pb-4 last:pb-0">
              {i < list.length - 1 && <span aria-hidden className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />}
              <span className={cn("z-10 flex size-7 shrink-0 items-center justify-center rounded-full border", s.state === "done" ? "border-foreground bg-foreground text-background" : s.state === "stopped" ? "border-border bg-card text-muted-foreground/60" : "border-dashed border-foreground/40 bg-card")}><s.icon className="size-3.5" strokeWidth={1.7} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3"><span className={cn("text-[13px] font-medium", s.state === "stopped" && "text-muted-foreground")}>{s.title}</span><span className="tnum shrink-0 text-[11px] text-muted-foreground">{s.state === "pending" && s.at > ds.now ? "Scheduled " : ""}{when(s.at)}</span></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                {s.msg && <p className="mt-1.5 rounded-lg bg-foreground/[0.04] px-3 py-2 text-xs leading-relaxed text-muted-foreground">{s.msg}</p>}
              </div>
            </motion.li>
          ))}
          {lead.status === "booked" && <li className="flex gap-3 pt-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-good/15 text-good"><CheckCheck className="size-3.5" strokeWidth={2} /></span><div><div className="text-[13px] font-medium">Booked</div><p className="text-xs text-muted-foreground">{via}. The crew was dispatched.</p></div></li>}
          {tp && lead.status !== "booked" && <li className="flex gap-3 pt-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-warn text-warn"><Bell className="size-3.5" strokeWidth={1.7} /></span><div><div className="text-[13px] font-medium">Next: {tp.action}</div></div></li>}
        </ol>
      </div>
    </div>
  );
}

export function LeadTimelineSheet({ lead, followup = true, onClose }: { lead: Lead | null; now?: number; followup?: boolean; onClose: () => void }) {
  const { data } = useData();
  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()} title="Lead" description="Everything we know about this person" width="max-w-lg">
      {lead && data && <div className="flex flex-col gap-6"><LeadDetail key={lead.id} lead={lead} ds={data} followup={followup} /><AskAgent agent="leads" prompts={["What's my conversion rate by source?", "How fast do we reply to new leads?"]} onAsk={onClose} /></div>}
    </Sheet>
  );
}
