"use client";

import { useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { Bell, CheckCheck, FileInput, Hourglass, Mail, MailOpen, Reply, RotateCcw, UserPlus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Pill, when } from "@/components/kit";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/types";

const DAY = 86400000;
type State = "done" | "pending" | "stopped";
interface Step { key: string; icon: React.ElementType; title: string; at: number; state: State; detail: string; msg?: { subject: string; body: string }; badges?: [string, string][] }

function stepsFor(lead: Lead, now: number, followup: boolean): Step[] {
  const first = lead.name.split(" ")[0];
  const reachedAt = lead.at;
  const instantAt = lead.at + lead.firstReplyMin * 60000;
  const stopped = lead.status === "booked" || lead.status === "replied";
  const out: Step[] = [
    { key: "in", icon: FileInput, title: lead.source === "form" ? "They filled out your form" : lead.source === "call" ? "They called" : "They emailed", at: reachedAt, state: "done", detail: lead.source === "form" && lead.via ? `From ${lead.via}. ${lead.service} at ${lead.address}.` : `${lead.service} at ${lead.address}.` },
    { key: "lead", icon: UserPlus, title: "Lead created and you were alerted", at: reachedAt + 4000, state: "done", detail: "Name, phone, email and the job details were saved. A job alert email went to the owner." },
    { key: "t1", icon: Mail, title: "First reply sent", at: instantAt, state: "done", detail: `Replied in ${lead.firstReplyMin} ${lead.firstReplyMin === 1 ? "minute" : "minutes"}.`,
      msg: { subject: `We got your request, ${first}`, body: `Hi ${first}, thanks for reaching out about ${lead.service.toLowerCase()}. We have your address as ${lead.address} and someone from the team will call you shortly. If anything is getting worse, call us any time at the number below.` },
      badges: lead.touches[0] ? [[lead.touches[0].replied ? "Replied" : lead.touches[0].opened ? "Opened" : "Delivered", lead.touches[0].replied ? "good" : lead.touches[0].opened ? "blue" : "mute"]] : undefined },
  ];
  if (followup) {
    const defs = [
      { n: 2, off: DAY + 9 * 3600000, title: "Next-day check-in", msg: { subject: `Still need help with the ${lead.service.toLowerCase()}?`, body: `Hi ${first}, just checking in on the ${lead.service.toLowerCase()} at ${lead.address.split(",")[0]}. We can still get someone out. Reply here or call and we'll set a time.` } },
      { n: 3, off: 4 * DAY + 10 * 3600000, title: "Day-4 follow-up", msg: { subject: `Last check from us, ${first}`, body: `Hi ${first}, we haven't heard back and don't want to leave you hanging. If you've already sorted it out, no problem at all. If not, we're one reply away.` } },
    ];
    for (const d of defs) {
      const t = lead.touches[d.n - 1]; const due = lead.at + d.off;
      if (t) out.push({ key: `t${d.n}`, icon: t.replied ? Reply : t.opened ? MailOpen : Mail, title: `${d.title} sent`, at: t.sentAt, state: "done", detail: t.replied ? "They replied, so the sequence stopped here." : t.opened ? "They opened it." : "Delivered.", msg: d.msg, badges: [[t.replied ? "Replied" : t.opened ? "Opened" : "Delivered", t.replied ? "good" : t.opened ? "blue" : "mute"]] });
      else if (stopped) out.push({ key: `t${d.n}`, icon: Hourglass, title: d.title, at: due, state: "stopped", detail: lead.status === "booked" ? "Not sent. They booked, so the sequence stopped." : "Not sent. They replied, so the sequence stopped." });
      else out.push({ key: `t${d.n}`, icon: Hourglass, title: d.title, at: due, state: "pending", detail: due > now ? "Scheduled. It sends automatically unless they reply or book." : "Due now.", msg: d.msg });
    }
  }
  const endLabel = lead.status === "booked" ? ["Job booked", "Booked and sent to your crew."] : lead.status === "replied" ? ["They replied", "A person takes over from here."] : lead.status === "lost" ? ["Closed", "No reply after the full sequence."] : ["In progress", "Waiting on their reply."];
  out.push({ key: "end", icon: lead.status === "booked" ? CheckCheck : Bell, title: endLabel[0], at: 0, state: lead.status === "new" || lead.status === "contacted" ? "pending" : "done", detail: endLabel[1] });
  return out;
}

const D = 0.28;
export function LeadTimeline({ lead, now, followup = true }: { lead: Lead; now: number; followup?: boolean }) {
  const [run, setRun] = useState(0);
  const steps = stepsFor(lead, now, followup);
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="truncate text-[15px] font-medium">{lead.name}</div><div className="mt-0.5 text-xs text-muted-foreground">{lead.phone} · {lead.email}</div></div>
          <button onClick={() => setRun((r) => r + 1)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"><RotateCcw className="size-3" />Replay</button>
        </div>
        <ol key={run} className="relative flex flex-col gap-6 pl-12">
          <motion.span aria-hidden className="absolute bottom-3 left-[17px] top-3 w-px origin-top bg-border" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: steps.length * D, ease: "easeInOut" }} />
          {steps.map((s, i) => (
            <motion.li key={s.key} className="relative" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * D, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}>
              <motion.span
                className={cn("absolute -left-12 top-0 flex size-9 items-center justify-center rounded-full border", s.state === "done" ? "border-foreground bg-foreground text-background" : s.state === "stopped" ? "border-border bg-card text-muted-foreground/60" : "border-dashed border-foreground/40 bg-card text-foreground")}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * D, type: "spring", stiffness: 380, damping: 16 }}>
                <s.icon className="size-4" strokeWidth={1.6} />
                {s.state === "pending" && <motion.i className="absolute inset-0 rounded-full border border-foreground/50" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: i * D + 0.6 }} />}
              </motion.span>
              <div className="flex flex-wrap items-center gap-2"><span className={cn("text-[13px] font-medium", s.state === "stopped" && "text-muted-foreground")}>{s.title}</span>{s.badges?.map(([t, tone]) => <Pill key={t} tone={tone}>{t}</Pill>)}{s.state === "pending" && <Pill tone="warn">Upcoming</Pill>}</div>
              {s.at > 0 && <div className="tnum mt-0.5 text-[11px] text-muted-foreground">{s.state === "pending" && s.at > now ? "Scheduled · " : ""}{when(s.at)}</div>}
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
              {s.msg && s.state !== "stopped" && (
                <motion.div className="mt-2.5 rounded-xl border border-border bg-background p-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * D + 0.35 }}>
                  <div className="text-[11px] text-muted-foreground">Subject</div><div className="text-[13px] font-medium">{s.msg.subject}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.msg.body}</p>
                </motion.div>
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </MotionConfig>
  );
}

export function LeadTimelineSheet({ lead, now, followup, onClose }: { lead: Lead | null; now: number; followup?: boolean; onClose: () => void }) {
  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()} title="Lead timeline" description="From first contact to the last follow-up" width="max-w-lg">
      {lead && <LeadTimeline key={lead.id} lead={lead} now={now} followup={followup} />}
    </Sheet>
  );
}
