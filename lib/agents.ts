import type { CrewMember, Dataset, Settings } from "./types";
import { dispatches } from "./dispatch";
import { delta, issueRows, jobsByService, money, summary, within } from "./stats";

export type AgentId = "dispatch" | "receptionist" | "leads" | "jobs";

export interface AgentDef {
  id: AgentId;
  name: string;
  role: string;
  color: string;
  blurb: string;
  prompts: string[];
  keys: RegExp;
}

export const AGENTS: AgentDef[] = [
  { id: "dispatch", name: "Concierge", role: "Routes your question", color: "#8a8a99", blurb: "Ask anything. Concierge hands it to the right agent.", prompts: ["How did we do this week?"], keys: /^$/ },
  { id: "receptionist", name: "Receptionist", role: "Calls, issues and fixes", color: "#7aa7ff", blurb: "Answers every call and knows what was said, how it was handled, and what went wrong.", prompts: ["Why couldn't it hear some callers?", "How many calls came in after hours?", "What have you improved?"], keys: /busiest|peak|latest|call|phone|ring|answer|hear|audio|noise|transfer|spam|hang|after.?hours|night|weekend|voicemail|transcript|greeting|handled|issue|problem/i },
  { id: "leads", name: "Lead Response", role: "Leads, follow-up and forms", color: "#4ade9a", blurb: "Replies to every new lead in minutes, runs the follow-up emails, and watches your website forms.", prompts: ["What's my conversion rate by source?", "Which form converts best?", "What's the ROI on my forms?", "How fast do we reply to new leads?"], keys: /conver|cta|roi\b|return on|spend|click|lead|inquir|form|source|speed|fast|quick|respond|reply|waiting|new customer|follow.?up|email|open|replied|sequence|touch|nurture|drip|check.?in|covered|outbound/i },
  { id: "jobs", name: "Operations", role: "Jobs, crew and reports", color: "#ff9a6b", blurb: "Tracks booked jobs, dispatches your crew, and sums up the week.", prompts: ["What jobs are scheduled?", "Who's available right now?", "Give me this week's summary"], keys: /job|booked|schedul|pipeline|revenue|value|worth|work order|completed|crew|team|dispatch|technician|tech\b|available|who.?s on|on a job|assigned|report|summary|week|trend|compare|month|improv|fix next|overview|how did we do|performance/i },
];

export const agentById = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

/** Pick the agent a question belongs to. Scores keyword hits; ties go to the more specific agent. */
export function routeQuestion(q: string, enabled: { followup: boolean; checkins: boolean; crew?: boolean }): AgentId {
  void enabled;
  if (/check.?in|covered|outbound/i.test(q)) return "leads";
  const scores = AGENTS.filter((a) => a.id !== "dispatch").map((a) => {
    const hits = q.match(new RegExp(a.keys.source, "gi"));
    return { id: a.id, s: hits ? hits.length : 0 };
  });
  scores.sort((a, b) => b.s - a.s);
  return scores[0].s > 0 ? scores[0].id : "dispatch";
}

export interface Metric { label: string; value: string; sub?: string }
export interface Card { title: string; metrics?: Metric[]; head?: string[]; rows?: string[][]; note?: string }
export interface Reply { agent: AgentId; text: string; card?: Card; suggestions?: string[]; usedModel?: boolean }

const has = (q: string, re: RegExp) => re.test(q);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const mins = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
const when = (t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
const sgn = (n: number) => `${n >= 0 ? "+" : ""}${n}%`;

type AnswerSettings = Pick<Settings, "businessName"> & { crew?: CrewMember[]; adSpend?: number };

function convRows(ds: Dataset, days: number, keyOf: (l: Dataset["leads"][number]) => string) {
  const ls = ds.leads.filter((l) => within(ds, days)(l.at));
  const map = new Map<string, Dataset["leads"]>();
  ls.forEach((l) => map.set(keyOf(l), [...(map.get(keyOf(l)) || []), l]));
  return [...map.entries()].map(([label, arr]) => {
    const ids = new Set(arr.map((l) => l.id));
    const booked = arr.filter((l) => l.status === "booked").length;
    const value = ds.jobs.filter((j) => ids.has(j.leadId)).reduce((a, j) => a + (j.value ?? 0), 0);
    return { label, leads: arr.length, booked, rate: pct(booked, arr.length), value, speed: arr.length ? Math.round((arr.reduce((a, l) => a + l.firstReplyMin, 0) / arr.length) * 10) / 10 : 0 };
  }).sort((a, b) => b.value - a.value);
}
const srcName = (l: Dataset["leads"][number]) => (l.source === "call" ? "Phone calls" : l.source === "form" ? "Website forms" : "Email");

export function answer(ds: Dataset, agent: AgentId, q: string, settings?: AnswerSettings): Reply {
  const s = summary(ds, 30), w = summary(ds, 7), p = summary(ds, 30, 30);
  const rows = issueRows(ds);
  const name = settings?.businessName ?? "your business";
  const R = (text: string, card?: Card, suggestions?: string[]): Reply => ({ agent, text, card, suggestions });
  let sub: string = agent;
  if (agent === "leads") sub = has(q, /check.?in|covered|outbound/i) ? "checkins" : has(q, /follow.?up|email|open|replied|sequence|touch|nurture|drip/i) && !has(q, /conver|roi|cta/i) ? "followup" : "leads";
  if (agent === "jobs") sub = has(q, /crew|team|dispatch|technician|tech\b|available|who.?s on|on a job|assigned|busy/i) ? "crew" : has(q, /report|summary|week|trend|compare|month|improv|fix next|overview|how did we do|performance/i) ? "reports" : "jobs";

  if (agent === "receptionist") {
    if (has(q, /hear|audio|noise|quiet|unclear/i)) {
      const r = rows.find((x) => x.key === "poor_audio")!;
      return R(`${r.count} calls had audio the receptionist couldn't make out. It asks the caller to repeat, saves the number and flags a callback.`, { title: r.name, metrics: [{ label: "Calls", value: String(r.count) }, { label: "Recovered", value: String(r.recovered), sub: "became leads" }, { label: "Rate", value: `${r.rateBefore}% → ${r.rateAfter}%` }] }, ["What have you improved?", "How many calls came in after hours?"]);
    }
    if (has(q, /improv|issue|problem|fix|went|better/i))
      return R(`${rows.length} improvements shipped. Calls that needed a follow-up are down from ${pct(p.issues, p.received)}% to ${pct(s.issues, s.received)}%.`, { title: "Improvements shipped", head: ["Improvement", "Before", "After"], rows: rows.map((r) => [r.name, `${r.rateBefore}%`, `${r.rateAfter}%`]) }, ["Why couldn't it hear some callers?", "Give me this week's summary"]);
    if (has(q, /after.?hours|night|weekend/i)) {
      const a = s.calls.filter((c) => c.afterHours);
      const conv = a.filter((c) => c.outcome === "job_booked" || c.outcome === "quote_requested").length;
      return R(`${s.afterHoursPct}% of calls came outside business hours, and every one was answered.`, { title: "After-hours calls, last 30 days", metrics: [{ label: "After hours", value: String(a.length) }, { label: "Of all calls", value: `${s.afterHoursPct}%` }, { label: "Job or estimate", value: String(conv), sub: `${pct(conv, a.length)}% of them` }] }, ["When is my busiest hour?", "How are leads converting?"]);
    }
    if (has(q, /busiest|peak|most calls|when do/i)) {
      const hrs = Array(24).fill(0) as number[];
      s.calls.forEach((c) => { hrs[new Date(new Date(c.at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getHours()]++; });
      const top = hrs.map((n, h) => ({ h, n })).sort((a, b) => b.n - a.n).slice(0, 4);
      const lbl = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;
      return R(`Your busiest hour is ${lbl(top[0].h)}, with ${top[0].n} calls in 30 days.`, { title: "Busiest hours", head: ["Hour", "Calls"], rows: top.map((t) => [`${lbl(t.h)} to ${lbl((t.h + 1) % 24)}`, String(t.n)]) }, ["How many calls came in after hours?"]);
    }
    if (has(q, /transfer/i)) return R(`${s.transfers} calls were transferred live to you. It only transfers when a caller is frustrated or asks for a person.`, undefined, ["How did calls end this month?"]);
    if (has(q, /spam/i)) return R(`${s.spam} spam calls were filtered out. They never trigger an alert.`);
    if (has(q, /latest|last call|recent|who called/i)) {
      const c = ds.calls.find((x) => x.outcome !== "missed") ?? ds.calls[0];
      return R(`${c.name} called ${when(c.at)}.`, { title: "Latest call", metrics: [{ label: "Service", value: c.service }, { label: "Length", value: mins(c.durationSec) }, { label: "Outcome", value: c.outcome.replace("_", " ") }], note: c.summary });
    }
    if (has(q, /how.*handle|what happens|process|script|greeting/i))
      return R("Every call follows the same six steps, any hour.", { title: "How a call is handled", head: ["Step", "Calls"], rows: [["Answered", String(s.answered)], ["Urgency checked", String(s.calls.filter((c) => c.steps.find((x) => x.key === "qualified")?.state === "done").length)], ["Details captured", String(s.calls.filter((c) => c.steps.find((x) => x.key === "captured")?.state === "done").length)], ["Owner alerted", String(s.calls.filter((c) => c.steps.find((x) => x.key === "alerted")?.state === "done").length)]] }, ["What have you improved?"]);
    return R(`${s.answered} calls answered in 30 days, ${s.answerRate}% of everything that rang. The rest hit a busy line.`, { title: "Calls, last 30 days", metrics: [{ label: "Answered", value: String(s.answered), sub: sgn(delta(s.answered, p.answered)) + " vs last month" }, { label: "Answer rate", value: `${s.answerRate}%`, sub: `${s.missed} hit a busy line` }, { label: "After hours", value: String(s.afterHours), sub: `${s.afterHoursPct}%` }, { label: "Average call", value: mins(s.avgDuration) }] }, ["How many calls came in after hours?", "What have you improved?"]);
  }

  if (sub === "leads") {
    const bySrc = convRows(ds, 30, srcName), byForm = convRows(ds.leads.some((l) => l.via) ? { ...ds, leads: ds.leads.filter((l) => l.source === "form") } : ds, 30, (l) => l.via?.split(" · ")[0] ?? "Website form");
    if (has(q, /roi|return on|spend|worth it|payback/i)) {
      const f = bySrc.find((x) => x.label === "Website forms");
      const value = f?.value ?? 0, spend = settings?.adSpend ?? 0;
      if (spend > 0) return R(`Website forms returned ${money(value)} on ${money(spend)} of spend this month, ${Math.round(((value - spend) / spend) * 100)}% ROI.`, { title: "Website forms ROI, 30 days", metrics: [{ label: "Booked value", value: money(value) }, { label: "Spend", value: money(spend) }, { label: "ROI", value: `${Math.round(((value - spend) / spend) * 100)}%` }, { label: "Per lead", value: money(f ? spend / Math.max(1, f.leads) : 0), sub: "cost" }] }, ["What's my conversion rate by source?"]);
      return R(`Website forms produced ${money(value)} in booked jobs this month. Add your monthly marketing spend in Settings and I'll show the exact ROI.`, { title: "Website forms return, 30 days", metrics: [{ label: "Form leads", value: String(f?.leads ?? 0) }, { label: "Booked", value: String(f?.booked ?? 0) }, { label: "Booked value", value: money(value) }], note: "ROI needs your spend, which we don't have yet." }, ["What's my conversion rate by source?", "Which form converts best?"]);
    }
    if (has(q, /cta|which form|best form|each form|per form|form.*conver|page/i)) {
      return R(byForm.length ? `${byForm[0].label} brings in the most booked value. We track submissions and bookings per form. Page views and button clicks need your site analytics connected.` : "No form submissions yet.", { title: "Forms, last 30 days", head: ["Form", "Leads", "Booked", "Rate", "Value"], rows: byForm.map((x) => [x.label, String(x.leads), String(x.booked), `${x.rate}%`, money(x.value)]) }, ["What's the ROI on my forms?", "How fast do we reply to form leads?"]);
    }
    if (has(q, /conver|rate|close/i)) {
      const all = { leads: s.leadCount, booked: s.leads.filter((l) => l.status === "booked").length };
      return R(`${pct(all.booked, all.leads)}% of leads booked a job in the last 30 days.`, { title: "Lead conversion by source, 30 days", head: ["Source", "Leads", "Booked", "Rate", "Value"], rows: [...bySrc.map((x) => [x.label, String(x.leads), String(x.booked), `${x.rate}%`, money(x.value)]), ["All", String(all.leads), String(all.booked), `${pct(all.booked, all.leads)}%`, money(bySrc.reduce((a, x) => a + x.value, 0))]] }, ["Which form converts best?", "How fast do we reply to new leads?"]);
    }
    if (has(q, /fast|speed|quick|how soon|reply time|respond/i)) {
      const within5 = pct(s.leads.filter((l) => l.firstReplyMin <= 5).length, s.leadCount);
      return R(`New leads hear back in ${s.avgFirstReply} minutes on average.`, { title: "Speed to lead, 30 days", metrics: [{ label: "Average", value: `${s.avgFirstReply} min` }, { label: "Within 5 min", value: `${within5}%` }], head: ["Source", "Avg first reply"], rows: bySrc.map((x) => [x.label, `${x.speed} min`]) }, ["What's my conversion rate by source?"]);
    }
    if (has(q, /waiting|unanswered|new\b/i)) {
      const open = ds.leads.filter((l) => l.status === "new").slice(0, 6);
      return R(open.length ? `${open.length} new leads are being worked. Each already got the instant reply.` : "Everyone has had a first reply.", open.length ? { title: "New leads", head: ["Lead", "Job", "Replied in"], rows: open.map((l) => [l.name, l.service, `${l.firstReplyMin} min`]) } : undefined, ["What's my conversion rate by source?"]);
    }
    return R(`${s.leadCount} leads in 30 days, ${sgn(delta(s.leadCount, p.leadCount))} vs last month. ${bySrc[0]?.label ?? "Phone calls"} bring in the most value.`, { title: "Leads, last 30 days", head: ["Source", "Leads", "Booked", "Value"], rows: bySrc.map((x) => [x.label, String(x.leads), String(x.booked), money(x.value)]) }, ["What's my conversion rate by source?", "How fast do we reply to new leads?"]);
  }

  if (sub === "followup") {
    const wb = s.wonBack;
    return R(`${s.sent} follow-up emails went out. ${s.replyRate}% got a reply, and quiet leads won back ${money(s.wonBackValue)}.`, { title: "Follow-up, last 30 days", metrics: [{ label: "Sent", value: String(s.sent) }, { label: "Opened", value: `${s.openRate}%` }, { label: "Replied", value: `${s.replyRate}%` }, { label: "Won back", value: money(s.wonBackValue), sub: `${wb} jobs` }] }, ["What's my conversion rate by source?", "Who needs a touch?"]);
  }

  if (sub === "jobs") {
    if (has(q, /schedul/i)) {
      const sched = ds.jobs.filter((j) => j.status === "scheduled").slice(0, 6);
      return R(`${ds.jobs.filter((j) => j.status === "scheduled").length} jobs are scheduled.`, { title: "Scheduled jobs", head: ["Customer", "Job", "Value"], rows: sched.map((j) => [j.customer, j.service, j.value != null ? money(j.value) : "-"]) }, ["Who's available right now?"]);
    }
    if (has(q, /biggest|largest|top|highest/i)) {
      const top = [...ds.jobs].filter((x) => x.value != null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 5);
      return R(`The biggest job is ${top[0].customer}, ${money(top[0].value!)}.`, { title: "Biggest jobs", head: ["Customer", "Job", "Value"], rows: top.map((j) => [j.customer, j.service, money(j.value!)]) });
    }
    const svc = jobsByService(ds, 30);
    return R(`${s.jobsBooked} jobs booked in 30 days, ${money(s.pipelineValue)} total.`, { title: "Jobs, last 30 days", metrics: [{ label: "Booked", value: String(s.jobsBooked), sub: sgn(delta(s.jobsBooked, p.jobsBooked)) }, { label: "Value", value: money(s.pipelineValue) }, { label: "Average job", value: money(s.avgJob) }], head: ["Service", "Jobs", "Value"], rows: svc.map((x) => [x.label, String(x.n), money(x.value)]) }, ["What jobs are scheduled?", "Give me this week's summary"]);
  }

  if (sub === "reports") {
    if (has(q, /fix next|improve|should/i)) {
      const next = [...rows].sort((a, b) => b.rateAfter - a.rateAfter)[0];
      return R(`Next up: ${next.name.toLowerCase()}. ${next.fix.change}`, { title: next.name, metrics: [{ label: "Rate now", value: `${next.rateAfter}%` }, { label: "Before", value: `${next.rateBefore}%` }] });
    }
    return R(`This week: ${w.answered} calls, ${w.leadCount} leads, ${w.jobsBooked} jobs and ${money(w.pipelineValue)} booked.`, { title: "This week", metrics: [{ label: "Calls", value: String(w.answered) }, { label: "Leads", value: String(w.leadCount) }, { label: "Jobs", value: String(w.jobsBooked) }, { label: "Value", value: money(w.pipelineValue) }], note: `Average first reply ${w.avgFirstReply} min. ${w.afterHours} calls came after hours.` }, ["What's my conversion rate by source?", "What should I fix next?"]);
  }

  if (sub === "crew") {
    const crew = settings?.crew ?? [];
    const by = (st: string) => crew.filter((c) => c.status === st);
    if (has(q, /dispatch|sent|today|send/i)) {
      const list = dispatches(ds, crew, name, 40).slice(0, 5);
      return R(`${list.length} most recent dispatches. Each message carries the address, customer and phone.`, { title: "Recent dispatches", head: ["Job", "Crew", "Sent"], rows: list.map((d) => [`${d.job.service}, ${d.job.address.split(",")[0]}`, d.crew.map((c) => c.name.split(" ")[0]).join(", ") || "-", when(d.sentAt)]) });
    }
    return R(`${by("available").length} available, ${by("on_job").length} on a job, ${by("off").length} off today.`, { title: "Crew right now", head: ["Name", "Role", "Status"], rows: crew.map((c) => [c.name, c.role, c.status.replace("_", " ")]) }, ["What did we dispatch today?"]);
  }

  if (sub === "checkins") {
    const cs = ds.checkins.filter((c) => within(ds, 30)(c.at));
    const c = (r: string) => cs.filter((x) => x.result === r).length;
    return R(`${cs.length} check-in calls this month, ${c("booked")} booked.`, { title: "Check-in calls", metrics: [{ label: "Booked", value: String(c("booked")) }, { label: "Still need help", value: String(c("still_needs_help")) }, { label: "Found someone else", value: String(c("got_help_elsewhere")) }, { label: "No answer", value: String(c("no_answer") + c("voicemail_left")) }] });
  }

  return R("I can route that. Try one of these.", undefined, ["How many calls came in after hours?", "What's my conversion rate by source?", "Give me this week's summary"]);
}
