import type { Customer, Dataset, Lead } from "./types";
import { MAX_TOUCHES, emailFor, etAt, maintenanceEmail, touchTime, type Draft } from "./messages";

const DAY = 86400000;
const nextMorning = (now: number, hour = 9, extraDays = 0) => etAt(now + (1 + extraDays) * DAY, hour, 30);

export interface OpenEstimate { lead: Lead; step: number; total: number; nextAt: number; draft: Draft; ageDays: number }
export interface MaintenanceRow { customer: Customer; months: number; nextAt: number; draft: Draft }

/** Estimates that went out and never closed, each with its next follow-up already queued. */
export function openEstimates(ds: Dataset): OpenEstimate[] {
  return ds.leads
    .filter((l) => l.quote != null && (l.status === "contacted" || l.status === "lost") && ds.now - l.at > 3 * DAY && ds.now - l.at < 45 * DAY)
    .map((lead) => {
      const sent = lead.touches.length;
      const step = Math.min(MAX_TOUCHES, sent + 1);
      const planned = touchTime(lead.at, step - 1);
      const nextAt = sent >= MAX_TOUCHES ? 0 : planned > ds.now ? planned : nextMorning(ds.now);
      return { lead, step, total: MAX_TOUCHES, nextAt, draft: emailFor(step, lead), ageDays: Math.floor((ds.now - lead.at) / DAY) };
    })
    .filter((x) => x.nextAt > 0)
    .sort((a, b) => (b.lead.quote ?? 0) - (a.lead.quote ?? 0));
}

/** Past customers whose coating or film is due for a maintenance visit (about 9 months or more). */
export function maintenanceDue(ds: Dataset): MaintenanceRow[] {
  return (ds.customers ?? [])
    .filter((c) => ds.now - c.doneAt >= 270 * DAY)
    .map((customer, i) => ({ customer, months: Math.round((ds.now - customer.doneAt) / (30.4 * DAY)), nextAt: nextMorning(ds.now, 10, i % 3), draft: maintenanceEmail(customer, ds.now) }))
    .sort((a, b) => a.nextAt - b.nextAt);
}
