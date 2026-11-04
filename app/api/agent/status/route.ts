import { NextResponse } from "next/server";

export const runtime = "nodejs";

const base = () => process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

/** GET: is a key set. POST: make one tiny real call to prove the key and model work. */
export async function GET() {
  return NextResponse.json({ keySet: !!process.env.OPENAI_API_KEY, model: process.env.AGENT_MODEL || "gpt-4o-mini", dailyCap: Number(process.env.AGENT_DAILY_CAP || 250) });
}

export async function POST() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY is not set on this deployment." });
  try {
    const res = await fetch(`${base()}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.AGENT_MODEL || "gpt-4o-mini", max_tokens: 5, messages: [{ role: "user", content: "Reply with the word ok." }] }) });
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string }; choices?: { message?: { content?: string } }[] };
    if (!res.ok) return NextResponse.json({ ok: false, error: j.error?.message || `OpenAI returned ${res.status}` });
    return NextResponse.json({ ok: true, reply: j.choices?.[0]?.message?.content ?? "" });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Request failed" });
  }
}
