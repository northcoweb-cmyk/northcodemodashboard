import { NextResponse } from "next/server";
import { agentById, answer, routeQuestion, type AgentId, type Reply } from "@/lib/agents";
import { generate } from "@/lib/seed";
import { EMPTY_SIM, withSim, type SimStore } from "@/lib/sim";
import { issueRows, jobsByService, money, summary } from "@/lib/stats";
import { dispatches } from "@/lib/dispatch";
import type { CrewMember, Dataset } from "@/lib/types";

export const runtime = "nodejs";

// Answers are built from the dashboard data by rules (lib/agents.ts). If OPENAI_API_KEY is set in the host's
// environment variables, an OpenAI model phrases them and can answer free-form questions from the same data.
// The key is never in the code or the browser. Without a key, or if a call fails or the daily cap is hit, the rule answer is returned.
const day = () => new Date().toISOString().slice(0, 10);
let counter = { d: day(), n: 0 };
function budgetOk() {
  if (counter.d !== day()) counter = { d: day(), n: 0 };
  const cap = Number(process.env.AGENT_DAILY_CAP || 250);
  if (counter.n >= cap) return false;
  counter.n++; return true;
}

const stamp = (t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });

function context(ds: Dataset, crew: CrewMember[], business: string) {
  const s = summary(ds, 30), w = summary(ds, 7), p = summary(ds, 30, 30);
  return {
    business, today: stamp(ds.now),
    last30Days: { callsAnswered: s.answered, previous30: p.answered, afterHoursCalls: s.afterHours, afterHoursPct: s.afterHoursPct, avgCallSeconds: s.avgDuration, transferredToOwner: s.transfers, spamFiltered: s.spam, leads: s.leadCount, formLeads: s.formLeads, avgFirstReplyMinutes: s.avgFirstReply, jobsBooked: s.jobsBooked, bookedJobValue: money(s.pipelineValue), avgJobValue: money(s.avgJob), jobsValued: s.valued, followUpEmailsSent: s.sent, openRatePct: s.openRate, replyRatePct: s.replyRate, wonBackJobs: s.wonBack, wonBackValue: money(s.wonBackValue), callsNeedingFollowUp: s.issues, recoveredAsLeads: s.recovered },
    last7Days: { calls: w.answered, leads: w.leadCount, jobs: w.jobsBooked, bookedJobValue: money(w.pipelineValue) },
    bookedValueByService: jobsByService(ds, 30).map((x) => ({ service: x.label, jobs: x.n, value: money(x.value) })),
    improvements: issueRows(ds).map((r) => ({ name: r.name, callsHandled: r.count, recovered: r.recovered, rateBeforePct: r.rateBefore, rateAfterPct: r.rateAfter, change: r.fix.change })),
    crew: crew.map((c) => ({ name: c.name, role: c.role, status: c.status, skills: c.skills })),
    recentCalls: ds.calls.slice(0, 12).map((c) => ({ when: stamp(c.at), caller: c.name, service: c.service, address: c.address, outcome: c.outcome, summary: c.summary, afterHours: c.afterHours })),
    recentLeads: ds.leads.slice(0, 12).map((l) => ({ when: stamp(l.at), name: l.name, source: l.source, via: l.via, service: l.service, status: l.status, firstReplyMin: l.firstReplyMin })),
    recentJobs: ds.jobs.slice(0, 12).map((j) => ({ when: stamp(j.at), customer: j.customer, service: j.service, address: j.address, status: j.status, value: j.value != null ? money(j.value) : "not valued yet" })),
    recentDispatches: dispatches(ds, crew, business, 8).map((d) => ({ when: stamp(d.sentAt), job: d.job.service, address: d.job.address, crew: d.crew.map((c) => c.name) })),
  };
}

async function viaOpenAI(agent: AgentId, q: string, base: Reply, ctx: unknown, history: { role: "user" | "assistant"; content: string }[] = []): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !budgetOk()) return null;
  try {
    const res = await fetch(`${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.AGENT_MODEL || "gpt-4o-mini",
        max_tokens: 160, temperature: 0.25,
        messages: [
          { role: "system", content: `You are the ${agentById(agent).name} agent in an owner's dashboard for a restoration company. The owner sees a card with the exact numbers right under your reply, so write ONE or TWO short sentences: the direct answer plus the single most useful takeaway. Do not repeat every figure, no lists, no markdown. Use dollar signs for money. Use ONLY the data provided; if it isn't there, say you don't have it yet. Never invent numbers, customers or results. Never say texting is live. For ROI or CTA questions, only state what the data supports (we track form submissions and bookings, not page views, and ad spend only if given).` },
          ...history,
          { role: "user", content: `Question: ${q}\n\nDashboard data (JSON):\n${JSON.stringify(ctx)}\n\nCard shown to the owner:\n${JSON.stringify(base.card ?? null)}\n\nRules-engine draft:\n${base.text}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { q?: string; agent?: AgentId | "auto"; businessName?: string; followup?: boolean; checkins?: boolean; crewOn?: boolean; crew?: CrewMember[]; sim?: SimStore; adSpend?: number; history?: { role: "user" | "agent"; text: string }[] };
  const q = String(body.q || "").slice(0, 400).trim();
  if (!q) return NextResponse.json({ error: "empty" }, { status: 400 });
  const sim: SimStore = body.sim && Array.isArray(body.sim.calls) ? { calls: body.sim.calls.slice(0, 40), leads: (body.sim.leads || []).slice(0, 40), jobs: (body.sim.jobs || []).slice(0, 40) } : EMPTY_SIM;
  const ds = withSim(generate(), sim);
  const crew = Array.isArray(body.crew) ? body.crew.slice(0, 30) : [];
  const business = body.businessName || "your business";
  const routed = body.agent && body.agent !== "auto" && body.agent !== "dispatch" ? body.agent : routeQuestion(q, { followup: body.followup !== false, checkins: body.checkins === true, crew: body.crewOn !== false });
  const base = answer(ds, routed, q, { businessName: business, crew, adSpend: Number(body.adSpend) || 0 });
  const history = Array.isArray(body.history) ? body.history.slice(-6).map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: String(m.text).slice(0, 400) })) : [];
  const text = await viaOpenAI(base.agent, q, base, context(ds, crew, business), history);
  return NextResponse.json({ ...base, text: text ?? base.text, usedModel: !!text });
}
