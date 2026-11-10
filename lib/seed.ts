import type {
  Call, CallStep, CheckIn, Customer, Dataset, Fix, IssueKey, Job, Lead, LeadSource, LeadStatus, Outcome, Touch, Turn,
} from "./types";
import { MAX_TOUCHES, TOUCH_LABELS, emailFor, touchTime } from "./messages";

export const IMPROVEMENT_NAMES: Record<IssueKey, string> = { poor_audio: "Audio quality handling", early_hangup: "Faster greeting", out_of_area: "Service-area answers", needs_pricing: "Price-question answers", address_unclear: "Vehicle read-back" };

export const ISSUES: Record<IssueKey, { title: string; short: string; fix: string }> = {
  poor_audio: {
    title: "Couldn't hear the caller",
    short: "Bad audio",
    fix: "The receptionist asks the caller to repeat or move somewhere quieter, then saves the number and creates a callback task.",
  },
  early_hangup: {
    title: "Caller hung up in the first seconds",
    short: "Early hang-up",
    fix: "Shorter greeting. The first question is now \"how can I help with your car?\" so the caller is talking within 4 seconds.",
  },
  out_of_area: {
    title: "Outside the service area",
    short: "Out of area",
    fix: "Service-area list added. Callers outside Maryland and the DC area get a polite answer and the shop gets an FYI.",
  },
  needs_pricing: {
    title: "Asked for a price on the phone",
    short: "Price question",
    fix: "Explains that every estimate is done in person and what affects the price, then books a time to look at the car instead of quoting blind.",
  },
  address_unclear: {
    title: "Vehicle details unclear",
    short: "Vehicle unclear",
    fix: "Read-back step added: the receptionist repeats the make and model and asks the caller to confirm before the lead is created.",
  },
};

const FIX_DAYS: Record<IssueKey, number> = {
  out_of_area: 41, poor_audio: 34, address_unclear: 27, early_hangup: 21, needs_pricing: 14,
};
const ISSUE_RATE: Record<IssueKey, [number, number]> = {
  poor_audio: [0.03, 0.012],
  early_hangup: [0.028, 0.01],
  out_of_area: [0.02, 0.008],
  needs_pricing: [0.045, 0.02],
  address_unclear: [0.024, 0.006],
};

const FIRST = ["Marcus","Dana","Priya","Tom","Elena","Chris","Jordan","Nate","Alicia","Ben","Rosa","Kyle","Megan","Omar","Sandra","Luis","Hannah","Greg","Tasha","Victor","Monica","Dennis","Leah","Ray","Daniel","Tyler","Jasmine","Andre"];
const LAST = ["Alvarez","Brooks","Chen","Dawson","Ellis","Foster","Grant","Hughes","Ibarra","Jensen","Kim","Lopez","Mercer","Nguyen","Ortiz","Patel","Quinn","Reyes","Stone","Tran","Vance","Walsh","Young","Whitfield","Okafor"];
const STREETS = ["Diamond Ave","Frederick Ave","Muddy Branch Rd","Quince Orchard Rd","Great Seneca Hwy","Darnestown Rd","Clopper Rd","Wisteria Dr","Montgomery Village Ave","Falls Rd"];
const CITIES = ["Gaithersburg","Rockville","Germantown","Bethesda","Potomac","Frederick","Columbia"];
const CARS = ["Porsche 911","BMW X5","Mercedes-Benz G63","Tesla Model Y","Audi RS6","Corvette C8","Toyota Supra","Genesis G80","Range Rover Sport","Lexus LC 500","Nissan GT-R","Ford Bronco","Jeep Wagoneer S","Mercedes-AMG GT","Maybach S580","BMW M4","Cadillac Escalade","Lamborghini Urus","Acura NSX","Tesla Model 3"];
/** Pages and forms on the shop's website that can send a lead. */
export const FORM_PAGES = [["Free quote form", "/contact"], ["Paint protection film page", "/paint-protection-film"], ["Ceramic coating page", "/ceramic-coatings"], ["Vinyl wrap page", "/vinyl-wrap"], ["Window tint page", "/window-tint"]] as const;
const VALUE: Record<string, [number, number]> = { "Paint protection film": [1800, 7500], "Ceramic coating": [900, 2800], "Paint correction": [600, 2000], "Vinyl wrap": [2500, 6500], "Window tint": [300, 900], "Detailing": [200, 700] };
const SVC_W: [string, number][] = [["Paint protection film", 30], ["Ceramic coating", 25], ["Paint correction", 14], ["Vinyl wrap", 11], ["Window tint", 12], ["Detailing", 8]];
function wsvc(r: () => number) { let x = r() * 100; for (const [n, w] of SVC_W) { x -= w; if (x <= 0) return n; } return "Paint protection film"; }
const qv = (r: () => number, svc: string) => { const g = VALUE[svc] || [800, 2500]; return Math.round((g[0] + r() * (g[1] - g[0])) / 50) * 50; };

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hour weights (Eastern). Most calls come in business hours; a real share lands after close.
const HOUR_W = [1,1,1,1,1,1,2,3,6,9,11,11,9,8,8,9,9,8,7,6,5,4,3,2];

function pick<T>(r: () => number, arr: readonly T[]): T { return arr[Math.floor(r() * arr.length)]; }
function wpick(r: () => number, w: number[]) {
  const sum = w.reduce((a, b) => a + b, 0); let x = r() * sum;
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
  return w.length - 1;
}

/** Shop hours: Mon to Fri 9am-6pm, Saturday 11am-4pm, Sunday closed (Eastern). */
export function isAfterHours(ts: number) {
  const d = new Date(ts);
  const local = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const h = local.getHours(), dow = local.getDay();
  if (dow === 0) return true;
  if (dow === 6) return h < 11 || h >= 16;
  return h < 9 || h >= 18;
}

const GREETING = "Thanks for calling My Paint Doctor. How can I help with your car?";

export function transcript(outcome: Outcome, issue: IssueKey | undefined, name: string, service: string, vehicle: string): Turn[] {
  const a = (text: string): Turn => ({ who: "ai", text });
  const c = (text: string): Turn => ({ who: "caller", text });
  const open = a(GREETING);
  const svc = service.toLowerCase();
  if (issue === "poor_audio")
    return [open, c("[unclear] ...ceramic... my car..."), a("I'm having trouble hearing you. Could you say that again, maybe from somewhere quieter?"), c("[unclear]"), a("I still can't make it out. I've saved your number and the team will call you back."), c("[line drops]")];
  if (issue === "early_hangup") return [open, c("[hangs up]")];
  if (issue === "out_of_area")
    return [open, c(`Hi, I'm in Atlanta. Do you do ${svc}?`), a("Thanks for calling. The shop is in Gaithersburg, Maryland and serves the DC and Baltimore area, so that's outside what we cover. I've passed your details along in case the team can point you somewhere."), c("Okay, thanks anyway.")];
  if (issue === "needs_pricing")
    return [open, c(`How much for ${svc}? Just give me a number.`), a("The price depends on the car and the paint, so the team does a quick in-person estimate. What are you driving?"), c(`A ${vehicle}.`), a(`Let me read that back to confirm. A ${vehicle}, is that right?`), c("Yes, that's right.")];
  if (issue === "address_unclear")
    return [open, c(`I want ${svc} on my car.`), a("Great. What are you driving?"), c("Uh, it's a dark gray one, a sedan."), a("I need the make and model so the team can prepare an accurate estimate. Do you have that handy?"), c("I'll have to check, I'm not at home.")];
  if (outcome === "missed") return [{ who: "caller", text: "[busy signal, caller hung up]" }];
  if (outcome === "spam") return [open, c("This is a recorded message about your vehicle's extended warranty..."), a("This number is for service requests only. Goodbye.")];
  if (outcome === "info")
    return [open, c("What's the difference between PPF and ceramic coating?"), a("Paint protection film is a clear layer that physically helps stop rock chips and scratches. Ceramic coating is a liquid layer that adds gloss and makes the car easier to clean, but it doesn't stop chips. A lot of people do film on the front of the car and ceramic over the rest. What are you driving?"), c(`A ${vehicle}.`), a("Nice car. The team can look at it and recommend what makes sense. What's your name and a good email so I can send you the options?"), c(`${name}.`)];
  if (outcome === "transferred")
    return [open, c(`I've called about my ${vehicle} three times and nobody has gotten back to me!`), a("I'm sorry about that. I'm connecting you to the owner right now."), c("Thank you."), a("Transferring now.")];
  if (outcome === "quote_requested")
    return [open, c(`I'd like ${svc} on my ${vehicle}. Can I get an estimate?`), a("Happy to set that up. Is the car new, or does the paint have some wear?"), c("It's about two years old, a few small chips."), a(`Got it, ${name.split(" ")[0]}. I'll send your request to the team and you'll get an email in a few minutes with next steps. What's the best email?`), c("I'll spell it for you.")];
  return [open, c(`I need ${svc} on my ${vehicle}. Can I come in this week?`), a("Let me check. What's your name and the best number?"), c(`${name}.`), a("I have an estimate slot open. I've booked you in and you'll get a confirmation email shortly."), c("Perfect, thanks.")];
}

export function stepsFor(outcome: Outcome, issue: IssueKey | undefined, transferred: boolean): CallStep[] {
  const mk = (key: CallStep["key"], label: string, state: CallStep["state"], note: string): CallStep => ({ key, label, state, note });
  if (outcome === "missed") return [mk("answered", "Answered", "flagged", "Line was busy with another caller"), mk("greeted", "Greeted", "skipped", "Caller hung up before pickup"), mk("qualified", "Service identified", "skipped", "Not reached"), mk("captured", "Details captured", "skipped", "Number saved from caller ID"), mk("classified", "Call classified", "done", "Marked as a missed call"), mk("alerted", "Shop alerted", "done", "Callback task emailed")];
  const bad = issue === "poor_audio" || issue === "early_hangup";
  return [
    mk("answered", "Answered", "done", "Picked up on the first ring"),
    mk("greeted", "Greeted", bad && issue === "early_hangup" ? "flagged" : "done", issue === "early_hangup" ? "Caller left before the first question" : "Opened by asking how it can help"),
    mk("qualified", "Service identified", bad ? "skipped" : "done", bad ? "Not enough audio to tell" : "PPF, ceramic, correction, wrap, tint or detail"),
    mk("captured", "Details captured", bad || issue === "out_of_area" ? "skipped" : issue === "address_unclear" ? "flagged" : "done", issue === "address_unclear" ? "Make and model missing" : bad ? "Number saved for callback" : "Name, phone, email, vehicle, service"),
    mk("classified", "Call classified", "done", outcome === "spam" ? "Marked as spam" : outcome === "issue" ? `Flagged: ${ISSUES[issue!].short}` : "Estimate, question or booking set"),
    mk("alerted", transferred ? "Transferred" : "Shop alerted", outcome === "spam" ? "skipped" : "done", transferred ? "Live transfer to the owner" : outcome === "spam" ? "No alert for spam" : "Lead alert email sent"),
  ];
}

const HOUR = 3600000, MIN = 60000;

export function generate(now = Date.now()): Dataset {
  now = Math.floor(now / 3600000) * 3600000;
  const r = rng(240424);
  const DAY = 86400000;
  const calls: Call[] = [];
  const phone = () => `(${r() < 0.6 ? 240 : 301}) 555-01${String(Math.floor(r() * 90) + 10)}`;
  const nm = () => `${pick(r, FIRST)} ${pick(r, LAST)}`;
  let cid = 1000;

  const fixes: Fix[] = (Object.keys(FIX_DAYS) as IssueKey[])
    .sort((a, b) => FIX_DAYS[b] - FIX_DAYS[a])
    .map((k) => ({ issue: k, title: ISSUES[k].title, change: ISSUES[k].fix, daysAgo: FIX_DAYS[k], at: now - FIX_DAYS[k] * DAY }));

  const pool = Array.from({ length: 12 }, () => ({ name: nm(), phone: phone() }));
  const vehOf = new Map<string, string>();

  for (let d = 60; d >= 0; d--) {
    const dayStart = now - d * DAY;
    const dow = new Date(dayStart).getDay();
    let n = 3 + Math.floor(r() * 4) - (dow === 0 ? 2 : dow === 6 ? 1 : 0);
    if (d === 33 || d === 12 || d === 5) n += 3; // promo days
    for (let i = 0; i < n; i++) {
      const hour = wpick(r, HOUR_W);
      const at = new Date(dayStart); at.setUTCHours(hour + 5, Math.floor(r() * 60), Math.floor(r() * 60), 0);
      let ts = at.getTime(); while (ts > now) ts -= DAY;
      const ret = r() < 0.09 ? pool[Math.floor(r() * pool.length)] : null; const name = ret ? ret.name : nm(); const callerPhone = ret ? ret.phone : phone(); const service = wsvc(r);
      const vehicle = pick(r, CARS);
      const addr = `${100 + Math.floor(r() * 8800)} ${pick(r, STREETS)}`;
      const full = `${addr}, ${pick(r, CITIES)}, MD`;
      let issue: IssueKey | undefined;
      for (const k of Object.keys(ISSUE_RATE) as IssueKey[]) {
        const after = ts >= now - FIX_DAYS[k] * DAY;
        if (!issue && r() < ISSUE_RATE[k][after ? 1 : 0]) issue = k;
      }
      let outcome: Outcome;
      let transferred = false;
      if (issue) outcome = "issue";
      else if (r() < 0.012) outcome = "missed";
      else {
        const x = r();
        outcome = x < 0.1 ? "spam" : x < 0.5 ? "info" : x < 0.86 ? "quote_requested" : x < 0.89 ? "transferred" : "job_booked";
        if (outcome === "transferred") transferred = true;
      }
      const recovered = issue ? r() < (issue === "early_hangup" ? 0.1 : issue === "out_of_area" ? 0 : 0.55) : undefined;
      const dur = outcome === "missed" ? 0 : issue === "early_hangup" ? 3 + Math.floor(r() * 6) : outcome === "spam" ? 8 + Math.floor(r() * 12) : issue === "poor_audio" ? 25 + Math.floor(r() * 25) : 60 + Math.floor(r() * 220);
      const id = `c_${cid++}`; vehOf.set(id, vehicle);
      calls.push({
        id, at: ts, durationSec: dur, name: outcome === "spam" ? "Unknown caller" : outcome === "missed" ? "Missed call" : name, phone: callerPhone,
        afterHours: isAfterHours(ts), service, address: full, outcome, issue, recovered, transferred,
        summary: issue ? `${ISSUES[issue].title}.` : outcome === "missed" ? "Line was busy with another caller. Number saved and a callback task emailed." : outcome === "spam" ? "Recorded sales call, no alert sent." : outcome === "info" ? `Asked about ${service.toLowerCase()} for a ${vehicle}. Questions answered and options emailed.` : outcome === "transferred" ? `${service}, ${vehicle}. Caller frustrated, transferred live to the owner.` : outcome === "quote_requested" ? `${service} estimate request for a ${vehicle}.` : `${service} for a ${vehicle}. Estimate booked.`,
        steps: stepsFor(outcome, issue, transferred), transcript: transcript(outcome, issue, name, service, vehicle),
      });
    }
  }
  calls.sort((a, b) => b.at - a.at);

  // ---- leads, each with a 12-step follow-up plan and the real email text ----
  const leads: Lead[] = []; let lid = 500;
  type LeadBase = Pick<Lead, "name" | "service" | "vehicle" | "source" | "via">;
  const mkTouches = (lead: LeadBase, at: number, status: LeadStatus, replyMin: number): Touch[] => {
    const out: Touch[] = [];
    for (let i = 0; i < MAX_TOUCHES; i++) {
      const sentAt = i === 0 ? at + replyMin * MIN : touchTime(at, i);
      if (sentAt > now) break;
      if ((status === "booked" || status === "replied") && i > 0 && r() < 0.7) break;
      const opened = r() < (i === 0 ? 0.68 : 0.42);
      const e = emailFor(i + 1, lead);
      out.push({ n: i + 1, label: TOUCH_LABELS[i], channel: "email", subject: e.subject, body: e.body, sentAt, opened, replied: opened && r() < (i === 0 ? 0.24 : 0.1) });
    }
    return out;
  };
  const statusFor = (age: number): LeadStatus => { const x = r(); if (age < 2 * DAY) return x < 0.5 ? "new" : "contacted"; const v: LeadStatus = x < 0.14 ? "booked" : x < 0.26 ? "replied" : x < 0.62 ? "contacted" : "lost"; return v === "contacted" && age > 60 * DAY ? "lost" : v; };
  for (const c of calls) {
    if (c.outcome === "spam" || c.outcome === "missed" || c.outcome === "info" && r() < 0.5 || (c.issue && !c.recovered)) continue;
    const st: LeadStatus = c.outcome === "job_booked" ? "booked" : c.outcome === "transferred" ? (r() < 0.7 ? "booked" : "contacted") : statusFor(now - c.at);
    const first = c.name.split(" ")[0].toLowerCase();
    const vehicle = vehOf.get(c.id) ?? pick(r, CARS);
    const reply = 3 + Math.floor(r() * 7);
    const base: LeadBase = { name: c.name, service: c.service, vehicle, source: "call" };
    leads.push({ id: `l_${lid++}`, at: c.at, source: "call", name: c.name, phone: c.phone, email: `${first}${Math.floor(r() * 90)}@gmail.com`, service: c.service, vehicle, address: c.address, quote: st === "booked" || r() < 0.3 ? qv(r, c.service) : undefined, status: st, firstReplyMin: reply, callId: c.id, touches: mkTouches(base, c.at, st, reply) });
  }
  for (let d = 60; d >= 0; d--) {
    const nf = r() < 0.75 ? 1 : 0; const ng = r() < 0.55 ? 1 : 0; const ne = r() < 0.15 ? 1 : 0;
    const plan: LeadSource[] = [...Array<LeadSource>(nf).fill("form"), ...Array<LeadSource>(ng).fill("gbp"), ...Array<LeadSource>(ne).fill("email")];
    for (const src of plan) {
      const ts = now - d * DAY + (8 + Math.floor(r() * 12)) * HOUR - 5 * HOUR + Math.floor(r() * HOUR);
      if (ts > now) continue;
      const name = nm(); const st = statusFor(now - ts);
      const service = wsvc(r); const vehicle = pick(r, CARS);
      const via = src === "form" ? (() => { const f = pick(r, FORM_PAGES); return `${f[0]} · ${f[1]}`; })() : src === "gbp" ? "Google Business Profile · message" : undefined;
      const reply = src === "form" ? 6 + Math.floor(r() * 9) : src === "gbp" ? 7 + Math.floor(r() * 10) : 10 + Math.floor(r() * 15);
      leads.push({ id: `l_${lid++}`, at: ts, source: src, name, phone: phone(), email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@${pick(r, ["gmail.com", "outlook.com", "yahoo.com", "icloud.com"])}`, service, vehicle, address: `${100 + Math.floor(r() * 8800)} ${pick(r, STREETS)}, ${pick(r, CITIES)}, MD`, quote: r() < 0.18 ? qv(r, service) : undefined, via, status: st, firstReplyMin: reply, touches: mkTouches({ name, service, vehicle, source: src, via }, ts, st, reply) });
    }
  }
  leads.sort((a, b) => b.at - a.at);

  // quiet leads get a personalized win-back note
  for (const l of leads) {
    if ((l.status !== "lost" && l.status !== "contacted") || now - l.at < 15 * DAY) continue;
    if (r() > 0.6) continue;
    const first = l.name.split(" ")[0]; const sentAt = l.at + 14 * DAY + 10 * HOUR;
    const x = r();
    l.reactivation = { sentAt, message: `Hi ${first}, it's been a couple of weeks since you asked about ${l.service.toLowerCase()} for your ${l.vehicle ?? "car"}. If you'd still like it done, we have openings this week and I can send a fresh estimate. If it's already sorted, reply "done" and we'll close it out.`, result: x < 0.09 ? "won" : x < 0.28 ? "replied" : "none" };
    if (l.reactivation.result === "won") l.status = "booked";
  }

  // ---- showcase leads for the live demo (fixed, so the call can point at them) ----
  const ago = (min: number) => now - min * MIN;
  const show = (o: Omit<Lead, "id" | "touches" | "firstReplyMin"> & { replyMin: number; steps: number }): Lead => {
    const { replyMin, steps, ...rest } = o;
    const touches = mkTouches({ name: rest.name, service: rest.service, vehicle: rest.vehicle, source: rest.source, via: rest.via }, rest.at, rest.status, replyMin).slice(0, steps);
    return { ...rest, id: `l_${lid++}`, firstReplyMin: replyMin, touches };
  };
  const D = 24 * 60;
  const showcase: Lead[] = [
    show({ at: ago(34), source: "form", name: "Daniel Whitfield", phone: "(240) 555-0142", email: "daniel.whitfield@gmail.com", service: "Paint protection film", vehicle: "Porsche 911 Turbo S", address: "1840 Diamond Ave, Gaithersburg, MD", via: "Free quote form · /contact", status: "contacted", replyMin: 9, steps: 1 }),
    show({ at: ago(180), source: "call", name: "Priya Nair", phone: "(301) 555-0178", email: "priya.nair@outlook.com", service: "Ceramic coating", vehicle: "Tesla Model Y", address: "22 Orchard Way, Rockville, MD", status: "contacted", replyMin: 5, steps: 1, quote: 1450 }),
    show({ at: ago(6 * D), source: "form", name: "Marcus Hale", phone: "(240) 555-0163", email: "marcus.hale@gmail.com", service: "Paint protection film", vehicle: "BMW M4", address: "310 Clopper Rd, Gaithersburg, MD", via: "Paint protection film page · /paint-protection-film", status: "contacted", replyMin: 8, steps: 4, quote: 5200 }),
    show({ at: ago(12 * D), source: "gbp", name: "Alicia Brooks", phone: "(301) 555-0191", email: "alicia.brooks@icloud.com", service: "Vinyl wrap", vehicle: "Genesis G80", address: "75 Great Seneca Hwy, Germantown, MD", via: "Google Business Profile · message", status: "contacted", replyMin: 11, steps: 5, quote: 3900 }),
    show({ at: ago(21 * D), source: "call", name: "Tom Reyes", phone: "(240) 555-0117", email: "tom.reyes@gmail.com", service: "Ceramic coating", vehicle: "Corvette C8", address: "9 Quince Orchard Rd, Gaithersburg, MD", status: "contacted", replyMin: 6, steps: 7, quote: 2100 }),
    show({ at: ago(34 * D), source: "form", name: "Jasmine Okafor", phone: "(301) 555-0122", email: "jasmine.okafor@yahoo.com", service: "Paint correction", vehicle: "Lexus LC 500", address: "480 Darnestown Rd, Potomac, MD", via: "Free quote form · /contact", status: "contacted", replyMin: 7, steps: 8, quote: 1250 }),
  ];
  leads.unshift(...showcase);
  leads.sort((a, b) => b.at - a.at);

  // jobs from booked leads
  const jobs: Job[] = []; let jid = 300;
  for (const l of leads) {
    if (l.status !== "booked") continue;
    const age = now - l.at;
    const status = age < 3 * DAY ? "scheduled" : age < 9 * DAY ? "in_progress" : "completed";
    const value = l.quote != null && r() < 0.9 ? l.quote : l.quote == null && r() < 0.5 ? qv(r, l.service) : null;
    jobs.push({ id: `j_${jid++}`, leadId: l.id, customer: l.name, service: l.service, address: l.address, phone: l.phone, value, status: l.reactivation?.result === "won" ? (now - l.reactivation.sentAt < 3 * DAY ? "scheduled" : "completed") : status, at: l.reactivation?.result === "won" ? l.reactivation.sentAt + 5 * HOUR : l.at + HOUR * (2 + Math.floor(r() * 20)), source: l.source, reactivated: l.reactivation?.result === "won" || undefined });
  }

  // past customers, including ones whose coating is due for a maintenance visit
  const customers: Customer[] = [];
  const due = [
    ["Rosa Mercer", "Audi RS6", "Ceramic coating", 318], ["Kyle Grant", "Nissan GT-R", "Ceramic coating", 342], ["Hannah Ibarra", "Porsche 911", "Paint protection film", 356],
    ["Omar Patel", "Mercedes-AMG GT", "Ceramic coating", 301], ["Sandra Quinn", "Range Rover Sport", "Ceramic coating", 388], ["Greg Jensen", "Toyota Supra", "Paint protection film", 331],
    ["Leah Foster", "BMW X5", "Ceramic coating", 296], ["Ray Dawson", "Ford Bronco", "Ceramic coating", 365],
  ] as const;
  due.forEach(([name, vehicle, service, daysAgo], i) => {
    const value = qv(r, service);
    const email = `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@gmail.com`;
    const ph = phone();
    customers.push({ id: `cu_${i}`, name, phone: ph, email, vehicle, service, doneAt: now - daysAgo * DAY, value });
    jobs.push({ id: `j_${jid++}`, leadId: `l_hist${i}`, customer: name, service, address: `${100 + Math.floor(r() * 8800)} ${pick(r, STREETS)}, ${pick(r, CITIES)}, MD`, phone: ph, value, status: "completed", at: now - daysAgo * DAY, source: "call" });
  });
  pool.forEach((c, i) => { const svc = wsvc(r); jobs.push({ id: `j_${jid++}`, leadId: `l_pool${i}`, customer: c.name, service: svc, address: `${100 + Math.floor(r() * 8800)} ${pick(r, STREETS)}, ${pick(r, CITIES)}, MD`, phone: c.phone, value: qv(r, svc), status: "completed", at: now - (75 + Math.floor(r() * 220)) * DAY, source: "call" }); });
  jobs.sort((a, b) => b.at - a.at);

  // check-in calls: open estimates 3+ days old
  const checkins: CheckIn[] = []; let kid = 1;
  for (const l of leads) {
    if (l.status === "booked" || l.status === "new" || now - l.at < 3 * DAY || now - l.at > 30 * DAY) continue;
    if (r() > 0.4) continue;
    const x = r();
    checkins.push({ id: `k_${kid++}`, leadId: l.id, name: l.name, at: l.at + 3 * DAY + 11 * HOUR, result: x < 0.3 ? "got_help_elsewhere" : x < 0.5 ? "still_needs_help" : x < 0.68 ? "booked" : x < 0.86 ? "no_answer" : "voicemail_left" });
  }
  checkins.sort((a, b) => b.at - a.at);

  return { now, calls, leads, jobs, checkins, fixes, customers };
}
