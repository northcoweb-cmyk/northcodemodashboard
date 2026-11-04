import { NextResponse } from "next/server";
import { answer, agentById, routeQuestion, type AgentId, type Reply } from "@/lib/agents";
import { generate } from "@/lib/seed";
import { issueRows, summary } from "@/lib/stats";

export const runtime = "nodejs";

// Optional: set ANTHROPIC_API_KEY (and AGENT_MODEL) in env to let a language model phrase the answer.
// The facts always come from lib/agents.ts + the dataset; the model only rewrites them. Without a key, the rule-based answer is returned.
async function phrase(agent: AgentId, question: string, base: Reply, ctx: unknown): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.AGENT_MODEL || "claude-haiku-5-5",
        max_tokens: 400,
        system: `You are the ${agentById(agent).name} agent for a restoration company's dashboard. Answer in 2-4 plain sentences using ONLY the facts provided. Never invent numbers, never promise texting, never claim results beyond the data.`,
        messages: [{ role: "user", content: `Question: ${question}\n\nFacts:\n${JSON.stringify(ctx)}\n\nDraft answer: ${base.text}` }],
      }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { content?: { text?: string }[] };
    return j.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { q?: string; agent?: AgentId | "auto"; businessName?: string; followup?: boolean; checkins?: boolean };
  const q = String(body.q || "").slice(0, 400).trim();
  if (!q) return NextResponse.json({ error: "empty" }, { status: 400 });
  const ds = generate();
  const enabled = { followup: body.followup !== false, checkins: body.checkins === true };
  const routed = body.agent && body.agent !== "auto" && body.agent !== "dispatch" ? body.agent : routeQuestion(q, enabled);
  const base = answer(ds, routed, q, { businessName: body.businessName || "your business" });
  const text = await phrase(base.agent, q, base, { summary30: { ...summary(ds, 30), calls: undefined, leads: undefined, jobs: undefined }, issues: issueRows(ds).map((r) => ({ issue: r.title, count: r.count, before: r.rateBefore, after: r.rateAfter })) });
  return NextResponse.json({ ...base, text: text ?? base.text, usedModel: !!text, routedFrom: body.agent === "auto" || !body.agent || body.agent === "dispatch" ? "auto" : "direct" });
}
