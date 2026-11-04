import { NextResponse } from "next/server";
import { ADMIN_PIN } from "@/lib/auth";

export async function POST(req: Request) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
  return pin && pin === ADMIN_PIN() ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 401 });
}
