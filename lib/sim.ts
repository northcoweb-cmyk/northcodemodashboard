import type { Call, Dataset, IssueKey, Job, Lead, Outcome } from "./types";
import { FORM_PAGES, ISSUES, isAfterHours, stepsFor, transcript } from "./seed";

export interface SimStore { calls: Call[]; leads: Lead[]; jobs: Job[] }
export const EMPTY_SIM: SimStore = { calls: [], leads: [], jobs: [] };

export const SERVICES = ["Water damage", "Burst pipe", "Fire & smoke", "Mold", "Sewage backup", "Storm damage"];
export type SimOutcome = Outcome | IssueKey;
export const SIM_OUTCOMES: { key: SimOutcome; label: string }[] = [
  { key: "job_booked", label: "Job booked" },
  { key: "quote_requested", label: "Estimate requested" },
  { key: "transferred", label: "Transferred to owner" },
  { key: "info", label: "Question answered" },
  { key: "spam", label: "Spam" },
  ...(Object.keys(ISSUES) as IssueKey[]).map((k) => ({ key: k as SimOutcome, label: `Issue: ${ISSUES[k].title}` })),
];

const uid = (p: string) => `${p}_sim${Date.now().toString(36)}${Math.floor(Math.random() * 99)}`;

export function simulateCall(f: { name: string; phone: string; service: string; address: string; outcome: SimOutcome }): SimStore {
  const at = Date.now();
  const isIssue = f.outcome in ISSUES;
  const outcome: Outcome = isIssue ? "issue" : (f.outcome as Outcome);
  const issue = isIssue ? (f.outcome as IssueKey) : undefined;
  const transferred = outcome === "transferred";
  const recovered = issue ? issue === "poor_audio" || issue === "needs_pricing" || issue === "address_unclear" : undefined;
  const street = f.address.split(",")[0];
  const call: Call = {
    id: uid("c"), at, durationSec: outcome === "spam" ? 12 : issue === "early_hangup" ? 5 : 90 + Math.floor(Math.random() * 120),
    name: outcome === "spam" ? "Unknown caller" : f.name, phone: f.phone, afterHours: isAfterHours(at), service: f.service, address: f.address, outcome, issue, recovered, transferred,
    summary: issue ? `${ISSUES[issue].title}.` : outcome === "spam" ? "Recorded sales call, no alert sent." : outcome === "info" ? "Question about services, answered. Follow-up sent by email." : transferred ? `${f.service}. Caller frustrated, transferred live to the owner.` : outcome === "quote_requested" ? `${f.service} estimate request at ${f.address}.` : `${f.service} at ${f.address}. Job alert sent.`,
    steps: stepsFor(outcome, issue, transferred), transcript: transcript(outcome, issue, f.name, f.service, street),
  };
  const out: SimStore = { calls: [call], leads: [], jobs: [] };
  const makesLead = outcome === "job_booked" || outcome === "quote_requested" || transferred || (issue && recovered);
  if (makesLead) {
    const booked = outcome === "job_booked" || transferred;
    const lead: Lead = { id: uid("l"), at, source: "call", name: f.name, phone: f.phone, email: `${f.name.split(" ")[0].toLowerCase()}@gmail.com`, service: f.service, address: f.address, status: booked ? "booked" : "new", firstReplyMin: 1, callId: call.id, touches: [{ n: 1, label: "Instant reply", sentAt: at + 60000, opened: false, replied: false }] };
    out.leads.push(lead);
    if (booked) out.jobs.push({ id: uid("j"), leadId: lead.id, customer: f.name, service: f.service, address: f.address, phone: f.phone, value: null, status: "scheduled", at, source: "call" });
  }
  return out;
}

export function simulateForm(f: { name: string; phone: string; email: string; service: string; address: string; via?: string }): SimStore {
  const at = Date.now();
  return { calls: [], jobs: [], leads: [{ id: uid("l"), at, source: "form", name: f.name, phone: f.phone, email: f.email, service: f.service, address: f.address, via: f.via || `${FORM_PAGES[0][0]} · ${FORM_PAGES[0][1]}`, status: "new", firstReplyMin: 1, touches: [{ n: 1, label: "Instant reply", sentAt: at + 60000, opened: false, replied: false }] }] };
}

export const mergeSim = (a: SimStore, b: SimStore): SimStore => ({ calls: [...b.calls, ...a.calls], leads: [...b.leads, ...a.leads], jobs: [...b.jobs, ...a.jobs] });

export function withSim(base: Dataset, sim: SimStore): Dataset {
  if (!sim.calls.length && !sim.leads.length && !sim.jobs.length) return base;
  return { ...base, now: Math.max(base.now, Date.now() + 1000), calls: [...sim.calls, ...base.calls].sort((a, b) => b.at - a.at), leads: [...sim.leads, ...base.leads].sort((a, b) => b.at - a.at), jobs: [...sim.jobs, ...base.jobs].sort((a, b) => b.at - a.at) };
}
