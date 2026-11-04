// PIN gate. Set DASHBOARD_PIN, ADMIN_PIN and AUTH_SECRET in Vercel env vars. Defaults are for local use only.
export const PIN = () => process.env.DASHBOARD_PIN || "4821";
export const ADMIN_PIN = () => process.env.ADMIN_PIN || "7391";
const SECRET = () => process.env.AUTH_SECRET || "northco-local-secret";

export async function sign(value: string) {
  const data = new TextEncoder().encode(`${value}:${SECRET()}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const COOKIE = "nc_session";
export async function sessionValue() { return sign(`session:${PIN()}`); }
