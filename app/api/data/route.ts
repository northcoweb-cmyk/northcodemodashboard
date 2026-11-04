import { NextResponse } from "next/server";
import { generate } from "@/lib/seed";

// Same shape the live backend will return: Vapi call-ended events, form webhooks, Brevo events, owner-entered job values.
export async function GET() {
  return NextResponse.json(generate(), { headers: { "Cache-Control": "private, max-age=60" } });
}
