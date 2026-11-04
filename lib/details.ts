import type { Dataset } from "./types";
import { money, within } from "./stats";

export interface DetailRow { t: string; s: string; r: string }
export interface Details { heading: string; rows: DetailRow[]; total?: { label: string; value: string }[]; more: number }

const stamp = (t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });
const LIMIT = 30;
const cut = (rows: DetailRow[]) => ({ rows: rows.slice(0, LIMIT), more: Math.max(0, rows.length - LIMIT) });

/** The records behind a card, so every number can be expanded into the rows that make it up. */
export function detailsFor(key: string, ds: Dataset, days = 30): Details | null {
  const w = (t: number) => within(ds, days)(t);
  const calls = ds.calls.filter((c) => w(c.at));
  const leads = ds.leads.filter((l) => w(l.at));
  const jobs = ds.jobs.filter((j) => w(j.at));
  if (key === "calls" || key === "handling" || key === "duration" || key === "heatmap")
    return { heading: `${calls.length} calls, last ${days} days`, ...cut(calls.map((c) => ({ t: c.name, s: c.summary, r: stamp(c.at) }))) };
  if (key === "afterhours") { const a = calls.filter((c) => c.afterHours); return { heading: `${a.length} after-hours calls`, ...cut(a.map((c) => ({ t: c.name, s: c.summary, r: stamp(c.at) }))) }; }
  if (key === "leads" || key === "sources") return { heading: `${leads.length} leads, last ${days} days`, ...cut(leads.map((l) => ({ t: l.name, s: `${l.service}, via ${l.source === "call" ? "phone" : l.source === "form" ? "website form" : "email"}`, r: stamp(l.at) }))) };
  if (key === "reply") return { heading: "Time to first reply, per lead", ...cut(leads.map((l) => ({ t: l.name, s: l.service, r: `${l.firstReplyMin} min` }))) };
  if (key === "jobs") {
    const sum = jobs.reduce((a, j) => a + (j.value ?? 0), 0), valued = jobs.filter((j) => j.value != null).length;
    return { heading: `${jobs.length} jobs booked`, ...cut(jobs.map((j) => ({ t: j.customer, s: `${j.service}, ${j.address.split(",")[0]}`, r: j.value != null ? money(j.value) : "Not valued yet" }))), total: [{ label: "Total booked value", value: money(sum) }, { label: "Average per valued job", value: valued ? money(sum / valued) : "-" }, { label: "Jobs valued", value: `${valued} of ${jobs.length}` }] };
  }
  if (key === "wonback") {
    const j = jobs.filter((x) => x.reactivated);
    return { heading: `${j.length} jobs won back`, ...cut(j.map((x) => ({ t: x.customer, s: `${x.service}, won back from a quiet lead`, r: x.value != null ? money(x.value) : "Not valued yet" }))), total: [{ label: "Won-back value", value: money(j.reduce((a, x) => a + (x.value ?? 0), 0)) }] };
  }
  if (key === "followup") {
    const t = leads.flatMap((l) => l.touches.map((x) => ({ l, x })));
    return { heading: `${t.length} follow-up emails`, ...cut(t.map(({ l, x }) => ({ t: l.name, s: x.label, r: x.replied ? "Replied" : x.opened ? "Opened" : "Delivered" }))) };
  }
  return null;
}
