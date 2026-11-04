import { NextResponse } from "next/server";
import { answer, routeQuestion, type AgentId } from "@/lib/agents";
import { generate } from "@/lib/seed";
import type { CrewMember } from "@/lib/types";

export const runtime = "nodejs";

// No AI key, no outside calls. Every answer is built from the dashboard's own data in lib/agents.ts.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { q?: string; agent?: AgentId | "auto"; businessName?: string; followup?: boolean; checkins?: boolean; crewOn?: boolean; crew?: CrewMember[] };
  const q = String(body.q || "").slice(0, 400).trim();
  if (!q) return NextResponse.json({ error: "empty" }, { status: 400 });
  const ds = generate();
  const enabled = { followup: body.followup !== false, checkins: body.checkins === true, crew: body.crewOn !== false };
  const routed = body.agent && body.agent !== "auto" && body.agent !== "dispatch" ? body.agent : routeQuestion(q, enabled);
  return NextResponse.json(answer(ds, routed, q, { businessName: body.businessName || "your business", crew: Array.isArray(body.crew) ? body.crew.slice(0, 30) : [] }));
}
