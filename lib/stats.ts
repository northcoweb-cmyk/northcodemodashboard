import type { Dataset, IssueKey } from "./types";
import { ISSUES } from "./seed";

const DAY = 86400000;
export const within = (ds: Dataset, days: number, offset = 0) => (t: number) => t >= ds.now - (days + offset) * DAY && t < ds.now - offset * DAY;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

export function summary(ds: Dataset, days = 30) {
  const cur = within(ds, days), prev = within(ds, days, days);
  const calls = ds.calls.filter((c) => cur(c.at)), pcalls = ds.calls.filter((c) => prev(c.at));
  const leads = ds.leads.filter((l) => cur(l.at)), pleads = ds.leads.filter((l) => prev(l.at));
  const jobs = ds.jobs.filter((j) => cur(j.at)), pjobs = ds.jobs.filter((j) => prev(j.at));
  const real = calls.filter((c) => c.outcome !== "spam");
  const touches = leads.flatMap((l) => l.touches);
  const sent = touches.length, opened = touches.filter((t) => t.opened).length, replied = touches.filter((t) => t.replied).length;
  const issues = calls.filter((c) => c.issue);
  return {
    days, calls, leads, jobs,
    answered: calls.length, prevAnswered: pcalls.length,
    afterHours: calls.filter((c) => c.afterHours).length,
    afterHoursPct: pct(calls.filter((c) => c.afterHours).length, calls.length),
    avgDuration: Math.round(avg(real.map((c) => c.durationSec))),
    transfers: calls.filter((c) => c.transferred).length,
    spam: calls.filter((c) => c.outcome === "spam").length,
    leadCount: leads.length, prevLeads: pleads.length,
    avgFirstReply: Math.round(avg(leads.map((l) => l.firstReplyMin)) * 10) / 10,
    formLeads: leads.filter((l) => l.source === "form").length,
    jobsBooked: jobs.length, prevJobs: pjobs.length,
    pipelineValue: jobs.reduce((s, j) => s + (j.value ?? 0), 0),
    valued: jobs.filter((j) => j.value != null).length,
    sent, opened, replied, openRate: pct(opened, sent), replyRate: pct(replied, sent),
    issues: issues.length, recovered: issues.filter((c) => c.recovered).length,
  };
}

export function perDay(ds: Dataset, days = 30) {
  const out: { day: number; total: number; after: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = ds.now - (i + 1) * DAY, end = ds.now - i * DAY;
    const cs = ds.calls.filter((c) => c.at >= start && c.at < end);
    out.push({ day: end, total: cs.length, after: cs.filter((c) => c.afterHours).length });
  }
  return out;
}

export function outcomes(ds: Dataset, days = 30) {
  const cs = ds.calls.filter((c) => within(ds, days)(c.at));
  const count = (f: (c: (typeof cs)[number]) => boolean) => cs.filter(f).length;
  return [
    { key: "job_booked", label: "Job booked", n: count((c) => c.outcome === "job_booked") },
    { key: "quote_requested", label: "Estimate requested", n: count((c) => c.outcome === "quote_requested") },
    { key: "transferred", label: "Transferred to owner", n: count((c) => c.outcome === "transferred") },
    { key: "info", label: "Question answered", n: count((c) => c.outcome === "info") },
    { key: "issue", label: "Needed attention", n: count((c) => c.outcome === "issue") },
    { key: "spam", label: "Spam filtered", n: count((c) => c.outcome === "spam") },
  ];
}

export function byHour(ds: Dataset, days = 30) {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const c of ds.calls.filter((c) => within(ds, days)(c.at))) {
    const l = new Date(new Date(c.at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    grid[(l.getDay() + 6) % 7][l.getHours()]++;
  }
  return grid;
}

export function sources(ds: Dataset, days = 30) {
  const ls = ds.leads.filter((l) => within(ds, days)(l.at));
  return (["call", "form", "email"] as const).map((s) => ({ key: s, label: s === "call" ? "Phone calls" : s === "form" ? "Website forms" : "Email", n: ls.filter((l) => l.source === s).length }));
}

export function issueRows(ds: Dataset) {
  return (Object.keys(ISSUES) as IssueKey[]).map((k) => {
    const fix = ds.fixes.find((f) => f.issue === k)!;
    const all = ds.calls.filter((c) => c.issue === k);
    const before = ds.calls.filter((c) => c.at < fix.at), after = ds.calls.filter((c) => c.at >= fix.at);
    const rb = pct(before.filter((c) => c.issue === k).length * 10, before.length) / 10;
    const ra = pct(after.filter((c) => c.issue === k).length * 10, after.length) / 10;
    return { key: k, ...ISSUES[k], count: all.length, recovered: all.filter((c) => c.recovered).length, fix, rateBefore: rb, rateAfter: ra };
  }).sort((a, b) => b.count - a.count);
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
export const delta = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : 0);
