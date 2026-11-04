"use client";

import { Eye, MailCheck, Reply, Send } from "lucide-react";
import { useState } from "react";
import { Gate } from "@/components/gate";
import { LeadTimelineSheet } from "@/components/lead-timeline";
import { Card, CardHead, PageTitle, Pill, Stat, Table, dayLabel } from "@/components/kit";
import { money, summary } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { Dataset, Lead } from "@/lib/types";

function FollowUps({ ds }: { ds: Dataset }) {
  const s = summary(ds, 30);
  const rows = ds.leads.filter((l) => l.touches.length).slice(0, 30);
  const [sel, setSel] = useState<Lead | null>(null);
  return (
    <>
      <PageTitle title="Follow-ups" sub="Every new lead gets an instant reply, a next-day check-in and a day-4 follow-up. It stops the moment they reply or book." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Send} label="Emails sent" value={s.sent} hint="last 30 days" explain="followup" />
        <Stat icon={Eye} label="Opened" value={s.openRate} unit="%" explain="followup" />
        <Stat icon={Reply} label="Replied" value={s.replyRate} unit="%" explain="followup" />
        <Stat icon={MailCheck} label="Won back" value={money(s.wonBackValue)} hint={`${s.wonBack} jobs from quiet leads`} explain="wonback" />
      </div>
      <Card className="mt-4">
        <CardHead title="Win-back messages" sub="Leads that went quiet get one personal message about their actual job. Click one for the full timeline." />
        <Table head={["Lead", "Job", "Sent", "Message", "Result"]}>
          {ds.leads.filter((l) => l.reactivation).slice(0, 12).map((l) => (
            <tr key={l.id} onClick={() => setSel(l)} className="cursor-pointer transition hover:bg-foreground/[0.03]">
              <td className="whitespace-nowrap font-medium">{l.name}</td>
              <td className="whitespace-nowrap text-muted-foreground">{l.service}</td>
              <td className="tnum whitespace-nowrap text-muted-foreground">{dayLabel(l.reactivation!.sentAt)}</td>
              <td className="max-w-[300px] truncate text-muted-foreground">{l.reactivation!.message}</td>
              <td><Pill tone={l.reactivation!.result === "won" ? "good" : l.reactivation!.result === "replied" ? "blue" : "mute"}>{l.reactivation!.result === "won" ? "Won back" : l.reactivation!.result === "replied" ? "Replied" : "No reply"}</Pill></td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card className="mt-4" explain="followup">
        <CardHead title="Sequence by lead" sub="Each dot is one email. Click a lead for the full timeline." />
        <Table head={["Lead", "Started", "Instant reply", "Next-day", "Day 4", "Status"]}>
          {rows.map((l) => (
            <tr key={l.id} onClick={() => setSel(l)} className="cursor-pointer transition hover:bg-foreground/[0.03]">
              <td className="whitespace-nowrap font-medium">{l.name}</td>
              <td className="tnum whitespace-nowrap text-muted-foreground">{dayLabel(l.at)}</td>
              {[0, 1, 2].map((i) => { const t = l.touches[i]; return <td key={i}>{t ? <span className={cn("inline-flex items-center gap-1.5 text-xs", t.replied ? "text-good" : t.opened ? "text-foreground" : "text-muted-foreground")}><i className={cn("size-2 rounded-full", t.replied ? "bg-good" : t.opened ? "bg-foreground" : "bg-foreground/25")} />{t.replied ? "Replied" : t.opened ? "Opened" : "Sent"}</span> : <span className="text-xs text-muted-foreground/40">{l.status === "booked" || l.status === "replied" ? "Stopped" : "Scheduled"}</span>}</td>; })}
              <td className="whitespace-nowrap text-xs capitalize text-muted-foreground">{l.status}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <LeadTimelineSheet lead={sel} now={ds.now} followup onClose={() => setSel(null)} />
    </>
  );
}
export default function Page() { return <Gate module="followup">{(ds) => <FollowUps ds={ds} />}</Gate>; }
