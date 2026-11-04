import type { Dataset, Settings } from "./types";
import { ISSUES } from "./seed";
import { delta, issueRows, money, outcomes, sources, summary, within } from "./stats";

export type AgentId = "dispatch" | "receptionist" | "leads" | "followup" | "jobs" | "reports" | "checkins";

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
  { id: "dispatch", name: "Dispatch", role: "Routes your question", color: "#f4f4f5", blurb: "Ask anything. Dispatch hands it to the right agent.", prompts: ["How did we do this week?"], keys: /^$/ },
  { id: "receptionist", name: "Receptionist", role: "Answers every call", color: "#7aa7ff", blurb: "Knows every call: what was said, how it was handled, what went wrong.", prompts: ["Why couldn't it hear some callers?", "How many calls came in after hours?", "What issues did you catch?"], keys: /call|phone|ring|answer|hear|audio|noise|transfer|spam|hang|after.?hours|night|weekend|voicemail|transcript|greeting|handled/i },
  { id: "leads", name: "Lead Response", role: "Replies in minutes", color: "#4ade9a", blurb: "Tracks every new lead and how fast we responded.", prompts: ["How fast do we reply to new leads?", "Where are leads coming from?", "Who is still waiting on a reply?"], keys: /lead|inquir|form|source|speed|fast|quick|respond|reply time|waiting|new customer/i },
  { id: "followup", name: "Follow-up", role: "Keeps leads warm", color: "#f2b84b", blurb: "Runs the email follow-up and watches opens and replies.", prompts: ["How are the follow-up emails doing?", "Who replied this month?"], keys: /follow.?up|email|open|replied|sequence|touch|nurture|drip/i },
  { id: "jobs", name: "Jobs", role: "Tracks booked work", color: "#ff9a6b", blurb: "Booked jobs, what's scheduled and what's in the pipeline.", prompts: ["What jobs are scheduled?", "What's my pipeline worth?"], keys: /job|booked|schedul|pipeline|revenue|value|worth|work order|completed|crew/i },
  { id: "reports", name: "Reports", role: "Weekly summary", color: "#c4a1ff", blurb: "Compares weeks and tells you what to fix next.", prompts: ["Give me this week's summary", "What should I fix next?"], keys: /report|summary|week|trend|compare|month|improv|fix next|overview|how did we do|performance/i },
  { id: "checkins", name: "Check-in Calls", role: "Calls to see if you're covered", color: "#5fd6e8", blurb: "Calls back people who asked for help and didn't book, to see if they still need it.", prompts: ["How did the check-in calls go?"], keys: /check.?in|covered|coverage|outbound|called back|call back/i },
];

export const agentById = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

/** Pick the agent a question belongs to. Scores keyword hits; ties go to the more specific agent. */
export function routeQuestion(q: string, enabled: { followup: boolean; checkins: boolean }): AgentId {
  const scores = AGENTS.filter((a) => a.id !== "dispatch").map((a) => {
    if ((a.id === "followup" && !enabled.followup) || (a.id === "checkins" && !enabled.checkins)) return { id: a.id, s: 0 };
    const hits = q.match(new RegExp(a.keys.source, "gi"));
    return { id: a.id, s: hits ? hits.length : 0 };
  });
  scores.sort((a, b) => b.s - a.s);
  return scores[0].s > 0 ? scores[0].id : "dispatch";
}

export interface Reply { agent: AgentId; text: string; facts?: string[]; usedModel?: boolean }

const mins = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
const has = (q: string, re: RegExp) => re.test(q);

export function answer(ds: Dataset, agent: AgentId, q: string, settings?: Pick<Settings, "businessName">): Reply {
  const s = summary(ds, 30);
  const w = summary(ds, 7);
  const rows = issueRows(ds);
  const name = settings?.businessName ?? "your business";

  if (agent === "receptionist") {
    if (has(q, /hear|audio|noise|quiet|unclear/i)) {
      const r = rows.find((x) => x.key === "poor_audio")!;
      return { agent, text: `${r.count} calls in the last 60 days had audio the receptionist couldn't make out. When that happens it asks the caller to repeat or move somewhere quieter, then saves the number and emails you a callback task. ${r.recovered} of those became leads. Since the fix on ${new Date(r.fix.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}, the rate dropped from ${r.rateBefore}% to ${r.rateAfter}% of calls.`, facts: [`${r.count} calls affected`, `${r.recovered} recovered as leads`, `Rate ${r.rateBefore}% to ${r.rateAfter}%`] };
    }
    if (has(q, /issue|problem|wrong|fix|went/i)) {
      const top = rows.slice(0, 4);
      return { agent, text: `In the last 60 days ${rows.reduce((a, r) => a + r.count, 0)} calls needed attention. Most common: ${top.map((r) => `${r.short.toLowerCase()} (${r.count})`).join(", ")}. Each one has a fix that's already live, and the rates are falling.`, facts: top.map((r) => `${r.short}: ${r.rateBefore}% to ${r.rateAfter}%`) };
    }
    if (has(q, /after.?hours|night|weekend/i))
      return { agent, text: `${s.afterHours} of ${s.answered} calls (${s.afterHoursPct}%) in the last 30 days came in outside 8am to 6pm weekdays. All were answered, and ${s.calls.filter((c) => c.afterHours && (c.outcome === "job_booked" || c.outcome === "quote_requested")).length} of them turned into a job or estimate request.` };
    if (has(q, /transfer/i)) return { agent, text: `${s.transfers} calls were transferred live to ${name}'s owner in the last 30 days. The receptionist only transfers when a caller is clearly frustrated or asks for a person.` };
    if (has(q, /spam/i)) return { agent, text: `${s.spam} spam calls were filtered out in the last 30 days. They don't trigger alerts.` };
    return { agent, text: `Last 30 days: ${s.answered} calls answered (${delta(s.answered, s.prevAnswered) >= 0 ? "+" : ""}${delta(s.answered, s.prevAnswered)}% vs the 30 days before), ${s.afterHoursPct}% after hours, average real call ${mins(s.avgDuration)}, ${s.transfers} transferred to you.`, facts: outcomes(ds, 30).filter((o) => o.n).map((o) => `${o.label}: ${o.n}`) };
  }

  if (agent === "leads") {
    if (has(q, /source|where/i)) return { agent, text: `Leads in the last 30 days: ${sources(ds, 30).map((x) => `${x.n} from ${x.label.toLowerCase()}`).join(", ")}.` };
    if (has(q, /waiting|new|unanswered/i)) {
      const open = ds.leads.filter((l) => l.status === "new").slice(0, 5);
      return { agent, text: open.length ? `${open.length} lead${open.length > 1 ? "s are" : " is"} new and being worked: ${open.map((l) => `${l.name} (${l.service.toLowerCase()})`).join(", ")}. Each already got the instant reply email.` : "No leads are waiting. Everyone has had a first reply." };
    }
    return { agent, text: `${s.leadCount} leads in the last 30 days (${delta(s.leadCount, s.prevLeads) >= 0 ? "+" : ""}${delta(s.leadCount, s.prevLeads)}% vs the month before). Average time to first reply: ${s.avgFirstReply} minutes. Website form leads: ${s.formLeads}.` };
  }

  if (agent === "followup") {
    if (has(q, /replied|who/i)) {
      const who = s.leads.filter((l) => l.touches.some((t) => t.replied)).slice(0, 6);
      return { agent, text: who.length ? `Replied to a follow-up recently: ${who.map((l) => l.name).join(", ")}. Their sequences stop once they reply.` : "No replies to follow-ups in the last 30 days." };
    }
    return { agent, text: `${s.sent} follow-up emails sent in the last 30 days. ${s.openRate}% opened, ${s.replyRate}% replied. The sequence is an instant reply, a next-day check-in and a day-4 follow-up. It stops when the lead replies or books.` };
  }

  if (agent === "jobs") {
    const sched = ds.jobs.filter((j) => j.status === "scheduled");
    if (has(q, /schedul/i)) return { agent, text: sched.length ? `${sched.length} jobs scheduled: ${sched.slice(0, 5).map((j) => `${j.customer} (${j.service.toLowerCase()})`).join(", ")}.` : "No jobs are waiting to be scheduled." };
    return { agent, text: `${s.jobsBooked} jobs booked in the last 30 days (${delta(s.jobsBooked, s.prevJobs) >= 0 ? "+" : ""}${delta(s.jobsBooked, s.prevJobs)}% vs the month before). ${s.valued} have a value entered, totaling ${money(s.pipelineValue)}. Job values are the ones you enter, nothing is estimated.` };
  }

  if (agent === "reports") {
    if (has(q, /fix next|improve|should/i)) {
      const next = [...rows].sort((a, b) => b.rateAfter - a.rateAfter)[0];
      return { agent, text: `The issue still happening most is "${next.title.toLowerCase()}" at ${next.rateAfter}% of calls since its fix. ${next.fix.change}` };
    }
    return { agent, text: `This week: ${w.answered} calls, ${w.leadCount} leads, ${w.jobsBooked} jobs booked, first reply in ${w.avgFirstReply} min. ${w.afterHours} calls came after hours. ${w.issues} calls needed attention and ${w.recovered} were recovered.` };
  }

  if (agent === "checkins") {
    const cs = ds.checkins.filter((c) => within(ds, 30)(c.at));
    const c = (r: string) => cs.filter((x) => x.result === r).length;
    return { agent, text: `${cs.length} check-in calls in the last 30 days to people who asked for help and hadn't booked. ${c("booked")} booked, ${c("still_needs_help")} still need help, ${c("got_help_elsewhere")} found someone else, ${c("no_answer") + c("voicemail_left")} didn't pick up.` };
  }

  return { agent: "dispatch", text: `I can route that. Try asking about calls, leads, follow-up emails, jobs, or a weekly report. For example: "${AGENTS[1].prompts[0]}"` };
}

export const ISSUE_TITLES = Object.fromEntries(Object.entries(ISSUES).map(([k, v]) => [k, v.title]));
