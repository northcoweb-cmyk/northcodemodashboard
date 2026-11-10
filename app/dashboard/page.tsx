"use client";

import { Clock, DollarSign, Hammer, MailCheck, PhoneCall, Moon, Users, Timer } from "lucide-react";
import { Gate } from "@/components/gate";
import { Card, CardHead, Stat, PageTitle, when, dur } from "@/components/kit";
import { AreaChart, BarList, Heatmap } from "@/components/ui/charts";
import { useChat } from "@/components/agent-chat";
import { Editable } from "@/components/ui/editable";
import { useSettings } from "@/lib/store";
import { byHour, delta, issueRows, money, outcomes, perDay, sources, summary } from "@/lib/stats";
import { dayLabel } from "@/components/kit";
import { cn } from "@/lib/utils";
import { JobsTaskList } from "@/components/jobs-tasks";
import { ImprovementsCard } from "@/components/improvements-card";
import { TouchCard } from "@/components/touch-card";
import type { Dataset } from "@/lib/types";
import { openEstimates } from "@/lib/reactivation";

function Overview({ ds }: { ds: Dataset }) {
  const { settings, update } = useSettings();
  const chat = useChat();
  const s = summary(ds, 30);
  const m = settings.modules;
  const pts = perDay(ds, 30).map((p) => ({ ...p, label: dayLabel(p.day) }));
  const real = s.calls.filter((c) => c.outcome !== "spam");
  const stepCount = (k: string) => real.filter((c) => c.steps.find((x) => x.key === k)?.state === "done").length;
  const flow = [
    { label: "Answered", n: s.answered, note: "Picked up on the first ring" },
    { label: "Service identified", n: stepCount("qualified"), note: "PPF, ceramic, correction, wrap, tint, detail" },
    { label: "Details captured", n: stepCount("captured"), note: "Name, phone, email, vehicle, service" },
    { label: "Classified", n: stepCount("classified"), note: "Estimate, question, booking, spam" },
    { label: "Shop alerted", n: stepCount("alerted"), note: "Lead alert email sent" },
  ];
  const issues = issueRows(ds);
  const hour = new Date().getHours();
  return (
    <>
      <PageTitle title={`${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, ${settings.ownerName.split(" ")[0]}`} sub="Your last 30 days at a glance. Click any card to see how it's produced." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={PhoneCall} label="Calls answered" value={s.answered} delta={delta(s.answered, s.prevAnswered)} hint={`${s.answerRate}% answer rate · ${s.missed} hit a busy line`} explain="calls" />
        <Stat icon={Moon} label="After-hours calls" value={s.afterHours} hint={`${s.afterHoursPct}% of all calls`} explain="afterhours" />
        <Stat icon={Users} label="Leads captured" value={s.leadCount} delta={delta(s.leadCount, s.prevLeads)} hint="vs previous 30 days" explain="leads" />
        <Stat icon={Timer} label="Time to first reply" value={s.avgFirstReply} unit="min" hint="average, all sources" explain="reply" />
        <Stat icon={Hammer} label="Booked work" value={s.jobsBooked} delta={delta(s.jobsBooked, s.prevJobs)} hint="vs previous 30 days" explain="jobs" />
        <Stat icon={DollarSign} label="Booked work value (30 days)" value={money(s.pipelineValue)} hint={`${s.valued} of ${s.jobsBooked} jobs valued by you · avg ${money(s.avgJob)}`} explain="jobs" />
        {m.followup.active && <Stat icon={MailCheck} label="Follow-up reply rate" value={s.replyRate} unit="%" hint={`${s.openRate}% opened`} explain="followup" />}
        <Stat icon={Clock} label="Won back from quiet leads" value={money(s.wonBackValue)} hint={`${s.wonBack} jobs from win-back messages`} explain="wonback" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" explain="calls">
          <CardHead title="Calls per day" sub="All calls and the share that came after hours" right={<div className="flex gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-foreground" />All</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue" />After hours</span></div>} />
          <AreaChart points={pts} height={235} />
        </Card>
        <Card explain="calls">
          <CardHead title="How calls ended" sub="Last 30 days" />
          <BarList rows={outcomes(ds, 30).map((o) => ({ label: o.label, n: o.n, tone: o.key === "issue" ? "#f2b84b" : o.key === "spam" ? "#55555c" : undefined }))} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" explain="handling">
          <CardHead title="How every call is handled" sub="The same six steps, any hour of the day" />
          <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-5">
            {flow.map((f, i) => (
              <li key={f.label} className="bg-card p-3.5">
                <div className="text-[11px] text-muted-foreground">Step {i + 1}</div>
                <div className="mt-1 text-[13px] font-medium">{f.label}</div>
                <div className="tnum mt-3 text-xl font-medium">{f.n}</div>
                <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{f.note}</div>
              </li>
            ))}
          </ol>
        </Card>
        <Card explain="sources"><CardHead title="Where leads come from" sub="Last 30 days" /><BarList rows={sources(ds, 30).filter((x) => x.key !== "form" || m.forms.active).map((x) => ({ label: x.label, n: x.n }))} color="#4ade9a" /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1"><JobsTaskList ds={ds} title="Booked jobs" count={5} className="h-full" /></div>
        <Card className="lg:col-span-2">
          <CardHead title="Next follow-ups going out" sub="Already written and scheduled. Each stops the moment the person replies or books." />
          <ul className="flex flex-col divide-y divide-border/60">
            {openEstimates(ds).slice(0, 5).map((e) => (
              <li key={e.lead.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground"><MailCheck className="size-4" strokeWidth={1.5} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{e.lead.name} · {e.lead.vehicle}</span><span className="block truncate text-xs text-muted-foreground">Step {e.step} of {e.total}: “{e.draft.subject}”</span></span>
                <span className="tnum shrink-0 text-[11px] text-muted-foreground">{when(e.nextAt)}</span>
              </li>
            ))}
          </ul>
          <a href="/dashboard/reactivation" className="mt-3 inline-block text-xs font-medium underline underline-offset-4">See all old estimates and past customers</a>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2"><TouchCard ds={ds} /><ImprovementsCard ds={ds} /></div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" explain="heatmap"><CardHead title="When calls come in" sub="By day and hour, last 30 days" /><Heatmap grid={byHour(ds, 30)} /></Card>
        <Card>
          <CardHead title="Latest calls"  />
          <ul className="flex flex-col divide-y divide-border/60">
            {ds.calls.slice(0, 6).map((c) => (
              <li key={c.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-medium">{c.name}</span><span className="tnum shrink-0 text-[11px] text-muted-foreground">{when(c.at)}</span></div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.summary}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">Ask any question in the bar below. <button onClick={() => chat.openAgent("dispatch")} className="underline underline-offset-4 hover:text-foreground">Open your agents</button></p>
      
    </>
  );
}
export default function Page() { return <Gate>{(ds) => <Overview ds={ds} />}</Gate>; }
