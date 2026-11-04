import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessionValue } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const ok = req.cookies.get(COOKIE)?.value === (await sessionValue());
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "locked" }, { status: 401 });
  return NextResponse.redirect(new URL("/", req.url));
}
export const config = { matcher: ["/dashboard/:path*", "/api/data/:path*", "/api/agent/:path*", "/api/admin/:path*"] };
