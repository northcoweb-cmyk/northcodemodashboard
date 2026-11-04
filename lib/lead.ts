import type { Call, Dataset, Job, Lead } from "./types";
import { money } from "./stats";

const DAY = 86400000;

export const LOCATIONS = [
  { name: "Tacoma", cities: ["Tacoma", "Lakewood"] },
  { name: "South Sound", cities: ["Puyallup", "Federal Way"] },
  { name: "Gig Harbor", cities: ["Gig Harbor"] },
];
export const locationOf = (address: string) => LOCATIONS.find((l) => l.cities.some((c) => address.includes(c)))?.name ?? "Tacoma";

export interface Touchpoint { reason: string; action: string; due: number; value?: number; level: "now" | "soon" }

/** The things only a person can do next. This is what an owner actually wants to see. */
export function touchpoint(lead: Lead, job: Job | undefined, now: number): Touchpoint | null {
  const age = now - lead.at;
  if (lead.reactivation?.result === "replied") return { reason: "They answered the win-back message", action: "Call them back and book the job.", due: lead.reactivation.sentAt + DAY, value: lead.quote, level: "now" };
  if (lead.status === "replied") return { reason: "They replied to a follow-up", action: "Call or text them back today.", due: lead.at + DAY, value: lead.quote, level: "now" };
  if (lead.quote && lead.status === "contacted" && age > 2 * DAY && age < 9 * DAY) return { reason: `${money(lead.quote)} quote went out ${Math.floor(age / DAY)} days ago`, action: "Touch base by phone before it goes cold.", due: lead.at + 3 * DAY, value: lead.quote, level: "soon" };
  if (job && job.status === "scheduled" && now - job.at < DAY) return { reason: "Job booked in the last day", action: "Confirm the arrival window with the customer.", due: job.at + 4 * 3600000, value: job.value ?? undefined, level: "soon" };
  return null;
}

export function bookedVia(lead: Lead, call: Call | undefined): string | null {
  if (lead.status !== "booked") return null;
  if (lead.reactivation?.result === "won") return "Booked after the win-back message";
  if (call?.outcome === "job_booked") return "Booked on the call by the receptionist";
  if (call?.transferred) return "Transferred live to the owner, who booked it";
  if (lead.source === "form") return "Booked after the owner confirmed from the website form";
  return "Booked after a reply to the follow-up";
}

export function whyLead(lead: Lead, call: Call | undefined): string {
  if (call) return call.summary;
  if (lead.source === "form") return `Filled out ${lead.via ?? "a form on your website"} asking about ${lead.service.toLowerCase()}.`;
  return `Emailed asking about ${lead.service.toLowerCase()}.`;
}

export function previousJobs(lead: Lead, ds: Dataset): Job[] {
  return ds.jobs.filter((j) => j.phone === lead.phone && j.at < lead.at - DAY && j.leadId !== lead.id);
}

export function jobForLead(lead: Lead, ds: Dataset): Job | undefined {
  return ds.jobs.find((j) => j.leadId === lead.id);
}
export function callForLead(lead: Lead, ds: Dataset): Call | undefined {
  return lead.callId ? ds.calls.find((c) => c.id === lead.callId) : undefined;
}

export function touchpoints(ds: Dataset) {
  return ds.leads
    .map((l) => ({ lead: l, tp: touchpoint(l, jobForLead(l, ds), ds.now) }))
    .filter((x): x is { lead: Lead; tp: Touchpoint } => !!x.tp && ds.now - x.lead.at < 30 * DAY)
    .sort((a, b) => (a.tp.level === b.tp.level ? b.lead.at - a.lead.at : a.tp.level === "now" ? -1 : 1));
}
