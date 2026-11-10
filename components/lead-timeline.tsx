"use client";


import { motion } from "framer-motion";
import { Bell, CheckCheck, FileInput, Hourglass, Mail, MailOpen, MessageSquare, Phone, RefreshCw, Reply, UserPlus } from "lucide-react";
import { MAX_TOUCHES, TOUCH_DAYS, TOUCH_LABELS, emailFor, touchTime } from "@/lib/messages";
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

const SRC_NAME: Record<string, string> = { call: "Phone call", form: "Website form", email: "Email", gbp: "Google Business Profile" };

function steps(lead: Lead, now: number, followup: boolean): Step[] {
  const stopped = lead.status === "booked" || lead.status === "replied";
  const inTitle = lead.source === "call" ? "Called in" : lead.source === "form" ? "Filled out your quote form" : lead.source === "gbp" ? "Messaged your Google listing" : "Emailed you";
  const inDetail = lead.source === "call" ? "The receptionist answered right away, asked what they want done and what they drive, and took their details." : lead.source === "form" && lead.via ? `From ${lead.via}.` : lead.source === "gbp" ? "A message came in from your Google Business Profile." : "Came in by email.";
  const out: Step[] = [
    { key: "in", icon: lead.source === "call" ? Phone : FileInput, title: inTitle, at: lead.at, state: "done", detail: inDetail },
    { key: "lead", icon: UserPlus, title: "Lead created, shop alerted", at: lead.at + 4000, state: "done", detail: `${lead.vehicle ? lead.vehicle + ", " : ""}${lead.service.toLowerCase()}. Details saved and an alert emailed to you.` },
  ];
  const t0 = lead.touches[0];
  out.push({ key: "t1", icon: t0 ? (t0.replied ? Reply : t0.opened ? MailOpen : Mail) : Mail, title: t0?.subject ? `Email: “${t0.subject}”` : `First reply in ${lead.firstReplyMin} min`, at: t0?.sentAt ?? lead.at + lead.firstReplyMin * 60000, state: t0 && t0.sentAt <= now ? "done" : "pending", detail: t0 && t0.sentAt > now ? "Writing and sending. Goes out a few minutes after they reach out, with their name, car and service." : t0?.replied ? "They replied." : t0?.opened ? "They opened it." : `Sent ${lead.firstReplyMin} minutes after they reached out.`, msg: t0?.body });
  if (lead.source === "call") out.push({ key: "sms", icon: MessageSquare, title: "Text follow-up", at: lead.at + 20 * 60000, state: "stopped", detail: "Texting turns on once carrier approval clears, usually a few weeks. Until then you get a tap-to-text link on this lead." });
  if (followup) {
    for (let i = 1; i < MAX_TOUCHES; i++) {
      const t = lead.touches[i]; const due = touchTime(lead.at, i);
      if (t) out.push({ key: `t${i + 1}`, icon: t.replied ? Reply : t.opened ? MailOpen : Mail, title: `${TOUCH_LABELS[i]}: “${t.subject ?? ""}”`, at: t.sentAt, state: "done", detail: t.replied ? "They replied, so the sequence stopped." : t.opened ? "Opened." : "Delivered.", msg: t.body });
      else if (stopped) { if (i < 4) out.push({ key: `t${i + 1}`, icon: Hourglass, title: TOUCH_LABELS[i], at: due, state: "stopped", detail: lead.status === "booked" ? "Skipped. They booked." : "Skipped. They replied." }); }
      else if (i < lead.touches.length + 2) { const e = emailFor(i + 1, lead); out.push({ key: `t${i + 1}`, icon: Hourglass, title: `${TOUCH_LABELS[i]}: “${e.subject}”`, at: due, state: "pending", detail: due > now ? `Step ${i + 1} of ${MAX_TOUCHES}. Scheduled.` : "Due now.", msg: e.body }); }
    }
    if (!stopped && lead.touches.length + 2 < MAX_TOUCHES) out.push({ key: "more", icon: Hourglass, title: `${MAX_TOUCHES - lead.touches.length - 2} more steps queued`, at: lead.at + TOUCH_DAYS[MAX_TOUCHES - 1] * DAY, state: "pending", detail: `Check-ins continue up to step ${MAX_TOUCHES} (about 3 months), and stop the moment they reply or book.` });
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
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><a href={`tel:${lead.phone}`} className="hover:text-foreground">{lead.phone}</a><a href={`mailto:${lead.email}`} className="hover:text-foreground">{lead.email}</a><a href={`sms:${lead.phone}?&body=${encodeURIComponent(`Hi ${lead.name.split(" ")[0]}, it's My Paint Doctor following up on your ${lead.service.toLowerCase()} request.`)}`} className="font-medium text-foreground underline underline-offset-4">Tap to text</a></div>
      </div>

      {tp && (
        <div className={cn("rounded-xl border p-3.5", tp.level === "now" ? "border-warn/40 bg-warn/[0.07]" : "border-border bg-foreground/[0.03]")}>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Needs a person</div>
          <div className="mt-1 text-[13px] font-medium">{tp.reason}</div>
          <div className="mt-0.5 text-[13px] text-muted-foreground">{tp.action}{tp.value ? ` ${money(tp.value)} is on the line.` : ""}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-border p-4">
        <Field label="Service" value={lead.service} sub={lead.vehicle} />
        <Field label={job ? "Job value" : "Estimate"} value={value ? money(value) : "No quote yet"} sub={job ? (job.value != null ? "Entered by you" : "Not valued yet") : lead.quote ? "Sent to the customer" : undefined} />
        <Field label="Contact" value={lead.email} sub={lead.phone} />
        <Field label="Area" value={lead.address.split(",").slice(1).join(",").trim() || locationOf(lead.address)} />
        <Field label="Came in through" value={SRC_NAME[lead.source]} sub={lead.via} />
        <Field label="Speed to lead" value={`${lead.firstReplyMin} min`} sub={lead.source === "call" ? "Phone answered on the first ring, email follow-up after" : "From submission to first reply"} />
        <Field label="Received" value={when(lead.at)} />
        <Field label="How it got booked" value={via ?? (lead.status === "lost" ? "Not booked" : "Not booked yet")} sub={job ? `Job: ${job.status.replace("_", " ")}` : undefined} />
      </div>

      <div><div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Why they're a lead</div><p className="text-[13px] leading-relaxed text-muted-foreground">{whyLead(lead, call)}</p></div>

      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">History with you</div>
        {prev.length ? <ul className="divide-y divide-border/60">{prev.map((j) => <li key={j.id} className="flex items-center justify-between py-2 text-[13px]"><span>{j.service}<span className="text-muted-foreground"> · {j.address.split(",")[0]}</span></span><span className="tnum text-muted-foreground">{new Date(j.at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/New_York" })} · {j.value != null ? money(j.value) : "-"}</span></li>)}</ul> : <p className="text-[13px] text-muted-foreground">First time they've contacted you.</p>}
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
                {s.msg && <p className="mt-1.5 whitespace-pre-line rounded-lg bg-foreground/[0.04] px-3 py-2 text-xs leading-relaxed text-muted-foreground">{s.msg}</p>}
              </div>
            </motion.li>
          ))}
          {lead.status === "booked" && <li className="flex gap-3 pt-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-good/15 text-good"><CheckCheck className="size-3.5" strokeWidth={2} /></span><div><div className="text-[13px] font-medium">Booked</div><p className="text-xs text-muted-foreground">{via}. Added to the schedule.</p></div></li>}
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
