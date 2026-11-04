import type {
  Call, CallStep, CheckIn, Dataset, Fix, IssueKey, Job, Lead, LeadSource, LeadStatus, Outcome, Touch, Turn,
} from "./types";

export const ISSUES: Record<IssueKey, { title: string; short: string; fix: string }> = {
  poor_audio: {
    title: "Couldn't hear the caller",
    short: "Bad audio",
    fix: "Receptionist asks the caller to repeat or move somewhere quieter, then logs a callback task and emails the owner the number.",
  },
  early_hangup: {
    title: "Caller hung up in the first seconds",
    short: "Early hang-up",
    fix: "Shorter greeting. The first question is now \"what's going on?\" so the caller is talking within 4 seconds.",
  },
  out_of_area: {
    title: "Outside the service area",
    short: "Out of area",
    fix: "Service-area ZIP list added to the receptionist. Out-of-area callers get a polite answer and the owner gets an FYI.",
  },
  needs_pricing: {
    title: "Asked about price or insurance",
    short: "Price / insurance",
    fix: "Insurance and billing answers added. Receptionist explains the process and only transfers if the caller is frustrated.",
  },
  address_unclear: {
    title: "Address not confirmed",
    short: "Address unclear",
    fix: "Read-back step added: the receptionist repeats the address and asks the caller to confirm before sending the job alert.",
  },
};

const FIX_DAYS: Record<IssueKey, number> = {
  out_of_area: 41, poor_audio: 34, address_unclear: 27, early_hangup: 21, needs_pricing: 14,
};
const ISSUE_RATE: Record<IssueKey, [number, number]> = {
  poor_audio: [0.075, 0.03],
  early_hangup: [0.07, 0.025],
  out_of_area: [0.05, 0.02],
  needs_pricing: [0.07, 0.03],
  address_unclear: [0.06, 0.015],
};

const FIRST = ["Marcus","Dana","Priya","Tom","Elena","Chris","Jordan","Nate","Alicia","Ben","Rosa","Kyle","Megan","Omar","Sandra","Luis","Hannah","Greg","Tasha","Victor","Monica","Dennis","Leah","Ray"];
const LAST = ["Alvarez","Brooks","Chen","Dawson","Ellis","Foster","Grant","Hughes","Ibarra","Jensen","Kim","Lopez","Mercer","Nguyen","Ortiz","Patel","Quinn","Reyes","Stone","Tran","Vance","Walsh","Young"];
const STREETS = ["Pine St","Harbor Ave","Cedar Ln","Ridge Rd","Lakeview Dr","Maple Ct","Union Ave","6th Ave","Sound View Dr","Orchard St"];
const CITIES = ["Tacoma","Gig Harbor","Puyallup","Federal Way","Lakewood"];
export const FORM_PAGES = [["Emergency request form", "/emergency"], ["Free estimate form", "/contact"], ["Water damage page", "/water-damage"], ["Mold inspection page", "/mold-removal"], ["Fire & smoke page", "/fire-damage"]] as const;
const SERVICES = ["Water damage","Burst pipe","Fire & smoke","Mold","Sewage backup","Storm damage"];

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR_W = [3,2,2,2,2,3,5,8,10,11,10,9,8,8,8,8,8,9,9,8,7,6,5,4];

function pick<T>(r: () => number, arr: readonly T[]): T { return arr[Math.floor(r() * arr.length)]; }
function wpick(r: () => number, w: number[]) {
  const sum = w.reduce((a, b) => a + b, 0); let x = r() * sum;
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; }
  return w.length - 1;
}

export function isAfterHours(ts: number) {
  const d = new Date(ts);
  const local = new Date(d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const h = local.getHours(), dow = local.getDay();
  return dow === 0 || dow === 6 || h < 8 || h >= 18;
}

export function transcript(outcome: Outcome, issue: IssueKey | undefined, name: string, service: string, addr: string): Turn[] {
  const a = (text: string): Turn => ({ who: "ai", text });
  const c = (text: string): Turn => ({ who: "caller", text });
  const open = a("Thanks for calling. This is the front desk. What's going on?");
  if (issue === "poor_audio")
    return [open, c("[unclear] ...water... kitchen..."), a("I'm having trouble hearing you. Could you say that again, maybe from somewhere quieter?"), c("[unclear]"), a("I still can't make it out. I've saved your number and the team will call you back right away."), c("[line drops]")];
  if (issue === "early_hangup") return [open, c("[hangs up]")];
  if (issue === "out_of_area")
    return [open, c(`Hi, I have a ${service.toLowerCase()} problem at my place in Spokane.`), a("Thanks for calling. That address is outside the area the team covers. I've passed your details along in case they can point you somewhere."), c("Okay, thanks anyway.")];
  if (issue === "needs_pricing")
    return [open, c(`I've got ${service.toLowerCase()}. Before anything, what does this cost and will insurance cover it?`), a("The team works directly with most insurance companies and the estimate is done on site. I can get someone out to you. What's the address?"), c(`${addr}.`), a("Let me read that back to confirm. Is that right?"), c("Yes, that's right.")];
  if (issue === "address_unclear")
    return [open, c(`${service} in the basement.`), a("What's the address?"), c("Uh, off Union, near the school."), a("I need the street number to send someone. Can you give me the full address?"), c("I'll have to check, I'm not home.")];
  if (outcome === "spam") return [open, c("This is a recorded message about your vehicle warranty..."), a("This number is for service requests only. Goodbye.")];
  if (outcome === "info")
    return [open, c("Do you guys do commercial properties?"), a("Yes, the team handles residential and commercial. Is there an active problem right now?"), c("No, just planning."), a("Understood. I'll send your question to the team and they'll reply by email.")];
  if (outcome === "transferred")
    return [open, c(`${service} and nobody is helping me, I need a person right now!`), a("I'm sorry, I'm connecting you to the owner right now."), c("Thank you."), a("Transferring now.")];
  if (outcome === "quote_requested")
    return [open, c(`I need someone to look at ${service.toLowerCase()} and give me an estimate.`), a("Happy to set that up. Is there standing water or active damage?"), c("Not active, it's from last week."), a("What's the address?"), c(`${addr}.`), a(`Got it, ${name.split(" ")[0]}. I've sent your request to the team and you'll get an email shortly.`)];
  return [open, c(`${service} at my house, it's getting worse.`), a("Is anyone in danger, and is the water still running?"), c("Water's shut off. About an inch on the floor."), a("What's the address?"), c(`${addr}.`), a("Read back to confirm. Is that right?"), c("Yes."), a("A technician is being alerted now. You'll also get an email with the details.")];
}

export function stepsFor(outcome: Outcome, issue: IssueKey | undefined, transferred: boolean): CallStep[] {
  const mk = (key: CallStep["key"], label: string, state: CallStep["state"], note: string): CallStep => ({ key, label, state, note });
  const bad = issue === "poor_audio" || issue === "early_hangup";
  return [
    mk("answered", "Answered", "done", "Picked up on the first ring"),
    mk("greeted", "Greeted", bad && issue === "early_hangup" ? "flagged" : "done", issue === "early_hangup" ? "Caller left before the first question" : "Opened with what's going on"),
    mk("qualified", "Urgency checked", bad ? "skipped" : "done", bad ? "Not enough audio to qualify" : "Asked about active damage and safety"),
    mk("captured", "Details captured", bad || issue === "out_of_area" ? "skipped" : issue === "address_unclear" ? "flagged" : "done", issue === "address_unclear" ? "Street number missing" : bad ? "Number saved for callback" : "Name, phone, address, service"),
    mk("classified", "Call classified", outcome === "spam" ? "done" : "done", outcome === "spam" ? "Marked as spam" : outcome === "issue" ? `Flagged: ${ISSUES[issue!].short}` : "Job or lead type set"),
    mk("alerted", transferred ? "Transferred" : "Owner alerted", outcome === "spam" ? "skipped" : "done", transferred ? "Live transfer to the owner" : outcome === "spam" ? "No alert for spam" : "Job alert email sent"),
  ];
}

export function generate(now = Date.now()): Dataset {
  now = Math.floor(now / 3600000) * 3600000;
  const r = rng(90210);
  const DAY = 86400000;
  const calls: Call[] = [];
  const phone = () => `(253) 555-01${String(Math.floor(r() * 90) + 10)}`;
  const nm = () => `${pick(r, FIRST)} ${pick(r, LAST)}`;
  let cid = 1000;

  const fixes: Fix[] = (Object.keys(FIX_DAYS) as IssueKey[])
    .sort((a, b) => FIX_DAYS[b] - FIX_DAYS[a])
    .map((k) => ({ issue: k, title: ISSUES[k].title, change: ISSUES[k].fix, daysAgo: FIX_DAYS[k], at: now - FIX_DAYS[k] * DAY }));

  for (let d = 60; d >= 0; d--) {
    const dayStart = now - d * DAY;
    const dow = new Date(dayStart).getDay();
    let n = 2 + Math.floor(r() * 3) + (dow === 0 || dow === 6 ? 1 : 0);
    if (d === 38 || d === 12 || d === 5) n += 5; // storm days
    for (let i = 0; i < n; i++) {
      const hour = wpick(r, HOUR_W);
      const at = new Date(dayStart); at.setUTCHours(hour + 8, Math.floor(r() * 60), Math.floor(r() * 60), 0);
      let ts = at.getTime(); while (ts > now) ts -= DAY;
      const name = nm(); const service = pick(r, SERVICES);
      const addr = `${100 + Math.floor(r() * 8800)} ${pick(r, STREETS)}`;
      const full = `${addr}, ${pick(r, CITIES)}, WA`;
      // issue roll
      let issue: IssueKey | undefined;
      for (const k of Object.keys(ISSUE_RATE) as IssueKey[]) {
        const after = ts >= now - FIX_DAYS[k] * DAY;
        if (!issue && r() < ISSUE_RATE[k][after ? 1 : 0]) issue = k;
      }
      let outcome: Outcome;
      let transferred = false;
      if (issue) outcome = "issue";
      else {
        const x = r();
        outcome = x < 0.07 ? "spam" : x < 0.17 ? "info" : x < 0.4 ? "quote_requested" : x < 0.5 ? "transferred" : "job_booked";
        if (outcome === "transferred") transferred = true;
      }
      const recovered = issue ? r() < (issue === "early_hangup" ? 0.1 : issue === "out_of_area" ? 0 : 0.55) : undefined;
      const dur = issue === "early_hangup" ? 3 + Math.floor(r() * 6) : outcome === "spam" ? 8 + Math.floor(r() * 12) : issue === "poor_audio" ? 25 + Math.floor(r() * 25) : 55 + Math.floor(r() * 230);
      calls.push({
        id: `c_${cid++}`, at: ts, durationSec: dur, name: outcome === "spam" ? "Unknown caller" : name, phone: phone(),
        afterHours: isAfterHours(ts), service, address: full, outcome, issue, recovered, transferred,
        summary: issue ? `${ISSUES[issue].title}.` : outcome === "spam" ? "Recorded sales call, no alert sent." : outcome === "info" ? `Question about services, answered. Follow-up sent by email.` : outcome === "transferred" ? `${service}. Caller frustrated, transferred live to the owner.` : outcome === "quote_requested" ? `${service} estimate request at ${addr}.` : `${service} at ${addr}. Job alert sent.`,
        steps: stepsFor(outcome, issue, transferred), transcript: transcript(outcome, issue, name, service, addr),
      });
    }
  }
  calls.sort((a, b) => b.at - a.at);

  // leads
  const leads: Lead[] = []; let lid = 500;
  const touchLabels = ["Instant reply", "Next-day check-in", "Day-4 follow-up"];
  const mkTouches = (at: number, status: LeadStatus): Touch[] => {
    const offs = [3 * 60000, DAY + 9 * 3600000, 4 * DAY + 10 * 3600000];
    const out: Touch[] = [];
    for (let i = 0; i < 3; i++) {
      const sentAt = at + offs[i];
      if (sentAt > now) break;
      if ((status === "booked" || status === "replied") && i > 0 && r() < 0.6) break;
      const opened = r() < (i === 0 ? 0.62 : 0.45);
      out.push({ n: i + 1, label: touchLabels[i], sentAt, opened, replied: opened && r() < (i === 0 ? 0.22 : 0.12) });
    }
    return out;
  };
  const statusFor = (age: number): LeadStatus => { const x = r(); return age < 2 * DAY ? (x < 0.5 ? "new" : "contacted") : x < 0.38 ? "booked" : x < 0.55 ? "replied" : x < 0.8 ? "contacted" : "lost"; };
  for (const c of calls) {
    if (c.outcome === "spam" || c.outcome === "info" && r() < 0.5 || (c.issue && !c.recovered)) continue;
    const st: LeadStatus = c.outcome === "job_booked" ? "booked" : c.outcome === "transferred" ? (r() < 0.7 ? "booked" : "contacted") : statusFor(now - c.at);
    const first = c.name.split(" ")[0].toLowerCase();
    leads.push({ id: `l_${lid++}`, at: c.at, source: "call", name: c.name, phone: c.phone, email: `${first}${Math.floor(r() * 90)}@gmail.com`, service: c.service, address: c.address, status: st, firstReplyMin: 1 + Math.floor(r() * 4), callId: c.id, touches: mkTouches(c.at, st) });
  }
  for (let d = 60; d >= 0; d--) {
    const nf = r() < 0.75 ? 1 : 0; const ne = r() < 0.25 ? 1 : 0;
    for (let i = 0; i < nf + ne; i++) {
      const src: LeadSource = i < nf ? "form" : "email";
      const ts = now - d * DAY + (8 + Math.floor(r() * 12)) * 3600000 - 8 * 3600000 + Math.floor(r() * 3600000);
      if (ts > now) continue;
      const name = nm(); const st = statusFor(now - ts);
      leads.push({ id: `l_${lid++}`, at: ts, source: src, name, phone: phone(), email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@${pick(r, ["gmail.com", "outlook.com", "yahoo.com"])}`, service: pick(r, SERVICES), address: `${100 + Math.floor(r() * 8800)} ${pick(r, STREETS)}, ${pick(r, CITIES)}, WA`, via: src === "form" ? (() => { const f = pick(r, FORM_PAGES); return `${f[0]} · ${f[1]}`; })() : undefined, status: st, firstReplyMin: src === "form" ? 1 + Math.floor(r() * 5) : 4 + Math.floor(r() * 22), touches: mkTouches(ts, st) });
    }
  }
  leads.sort((a, b) => b.at - a.at);

  // jobs from booked leads
  const jobs: Job[] = []; let jid = 300;
  for (const l of leads) {
    if (l.status !== "booked") continue;
    const age = now - l.at;
    const status = age < 3 * DAY ? "scheduled" : age < 9 * DAY ? "in_progress" : "completed";
    const value = r() < 0.8 ? Math.round((1800 + r() * 14000) / 50) * 50 : null;
    jobs.push({ id: `j_${jid++}`, leadId: l.id, customer: l.name, service: l.service, address: l.address, phone: l.phone, value, status, at: l.at + 3600000 * (2 + Math.floor(r() * 20)), source: l.source });
  }
  jobs.sort((a, b) => b.at - a.at);

  // check-in calls: quote/info leads still open after 3 days
  const checkins: CheckIn[] = []; let kid = 1;
  for (const l of leads) {
    if (l.status === "booked" || l.status === "new" || now - l.at < 3 * DAY || now - l.at > 30 * DAY) continue;
    if (r() > 0.45) continue;
    const x = r();
    checkins.push({ id: `k_${kid++}`, leadId: l.id, name: l.name, at: l.at + 3 * DAY + 11 * 3600000, result: x < 0.3 ? "got_help_elsewhere" : x < 0.5 ? "still_needs_help" : x < 0.68 ? "booked" : x < 0.86 ? "no_answer" : "voicemail_left" });
  }
  checkins.sort((a, b) => b.at - a.at);

  return { now, calls, leads, jobs, checkins, fixes };
}
