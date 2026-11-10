import type { Lead } from "./types";

/** Day offsets for the 12-step follow-up plan. Step 1 goes out minutes after the lead arrives. */
export const TOUCH_DAYS = [0, 1, 3, 6, 10, 14, 21, 30, 45, 60, 75, 90];
export const MAX_TOUCHES = TOUCH_DAYS.length;
export const TOUCH_LABELS = ["First reply", "Next-day check-in", "Day-3 follow-up", "Day-6 nudge", "Day-10 recent work", "Two-week check-in", "Three-week check-in", "One-month check-in", "6-week check-in", "2-month check-in", "10-week check-in", "Last note"];

export const SHOP = { name: "My Paint Doctor", owner: "VJ", site: "mypaintdoctor.com", gallery: "mypaintdoctor.com/gallery" };

const ASK: Record<string, { want: string; q: string; tip: string }> = {
  "Paint protection film": { want: "paint protection film", q: "Are you looking at a full front end, or the whole car?", tip: "Most people with a newer car start with the full front end (bumper, hood, fenders, mirrors) since that's where the rock chips happen." },
  "Ceramic coating": { want: "a ceramic coating", q: "Is the car new, or has the paint already seen some wear?", tip: "If the paint has swirls, we usually do a light correction first so the coating locks in a clean finish." },
  "Paint correction": { want: "paint correction", q: "Are the swirls mostly visible in direct sun, or all the time?", tip: "That tells us whether it's a one-step polish or something deeper." },
  "Vinyl wrap": { want: "a wrap", q: "Do you have a color or finish in mind, like satin, gloss or matte?", tip: "If you're torn between two colors, send me both and I'll tell you how each one reads on that body style." },
  "Window tint": { want: "window tint", q: "Is this the whole car or just the front windows?", tip: "Maryland has limits on how dark the front windows can go, so I'll go over what's legal when you come by." },
  "Detailing": { want: "a detail", q: "Is this a one-time reset or something you'd like on a regular schedule?", tip: "A good detail is also the best starting point if you're thinking about ceramic or PPF later." },
};
export const SERVICES = Object.keys(ASK);

const first = (n: string) => n.split(" ")[0];
const sign = `\n\n${SHOP.owner}\n${SHOP.name}`;

export interface Draft { subject: string; body: string }

/** The personalized email for step n (1-12). Written to read like a note from the shop, never a blast. */
export function emailFor(n: number, l: Pick<Lead, "name" | "service" | "vehicle" | "source" | "via">): Draft {
  const a = ASK[l.service] ?? ASK["Detailing"];
  const car = l.vehicle ? `your ${l.vehicle}` : "your car";
  const f = first(l.name);
  const opener = l.source === "call" ? `Thanks for calling earlier about ${a.want} for ${car}.` : l.source === "gbp" ? `Thanks for messaging us from our Google listing about ${a.want} for ${car}.` : l.source === "email" ? `Thanks for emailing us about ${a.want} for ${car}.` : `Got your quote request for ${a.want} on ${car}.`;
  switch (n) {
    case 1: return { subject: `${l.vehicle ?? "Your car"}: ${a.want}`, body: `Hi ${f},\n\n${opener} I'd like to get you an accurate estimate. ${a.q}\n\nIf it's easier to talk, call or text this number and we'll pick it up.${sign}` };
    case 2: return { subject: `Quick follow-up on ${car}`, body: `Hi ${f},\n\nFollowing up on ${a.want} for ${car}. ${a.tip}\n\nWe're open Mon to Fri 9 to 6 and Saturday 11 to 4. If you tell me a day that works, I'll set aside time to look at it in person and give you a firm number.${sign}` };
    case 3: return { subject: `Do you have a date in mind?`, body: `Hi ${f},\n\nOne thing that helps us plan: do you have a date in mind for ${car}? If you do, reply with it and I'll check what we have open around then.\n\nIf you're still comparing shops, that's fine. Ask me anything about the film, the coating or how we do the prep and I'll give you a straight answer.${sign}` };
    case 4: return { subject: `Still want that estimate?`, body: `Hi ${f},\n\nI don't want your request for ${a.want} to slip through. If you'd still like an estimate on ${car}, just reply "yes" and I'll send over the options and a time to stop by.\n\nIf you went another direction, no problem, just let me know.${sign}` };
    case 5: return { subject: `A recent one we finished`, body: `Hi ${f},\n\nWe've been busy with ${a.want} lately. If you want to see how a finished car looks, our gallery is here: ${SHOP.gallery}\n\nIf something catches your eye for ${car}, send it over and I'll tell you what it would take.${sign}` };
    case 6: return { subject: `Is ${a.want} still on your list?`, body: `Hi ${f},\n\nChecking in once more on ${car}. Is ${a.want} still something you want to do? If the timing changed, tell me when to check back and I'll leave you alone until then.${sign}` };
    case 7: return { subject: `Anything holding you back?`, body: `Hi ${f},\n\nSometimes people hold off because of price, timing or not being sure which option is right for the car. If any of those is you with ${car}, tell me which one and I'll help work through it.${sign}` };
    case 8: return { subject: `Checking in on ${car}`, body: `Hi ${f},\n\nIt's been about a month since you asked about ${a.want}. If your plans changed, no worries. If you're ready, reply and I'll get you on the schedule.${sign}` };
    case 9: return { subject: `Quick question`, body: `Hi ${f},\n\nQuick question: did you end up getting ${a.want} done on ${car}? If not, I'm happy to put together a fresh estimate.${sign}` };
    case 10: return { subject: `Still here if you need us`, body: `Hi ${f},\n\nJust letting you know we're still here for ${car} whenever you're ready. Reply any time, even if it's just a question.${sign}` };
    case 11: return { subject: `Something new for ${car}?`, body: `Hi ${f},\n\nWe do more than ${a.want}: PPF, ceramic, correction, tint, wraps and detailing. If there's anything else you've been thinking about for ${car}, send it over.${sign}` };
    default: return { subject: `Closing out your request`, body: `Hi ${f},\n\nI'm going to close out your request for ${a.want}. If you ever want to pick it back up, reply to this email and it will come straight to us.${sign}` };
  }
}

/** Past customers due for a coating maintenance visit. */
export function maintenanceEmail(c: { name: string; vehicle: string; service: string; doneAt: number }, now: number): Draft {
  const months = Math.max(1, Math.round((now - c.doneAt) / (30.4 * 86400000)));
  const what = c.service === "Ceramic coating" ? "ceramic coating" : "paint protection film";
  return { subject: `Time for a check on your ${c.vehicle}?`, body: `Hi ${first(c.name)},\n\nIt's been about ${months} months since we did the ${what} on your ${c.vehicle}. This is usually when we recommend a quick inspection and a maintenance wash so it keeps looking and performing the way it should.\n\nWould a weekday or a Saturday work better for you? Reply with a day and I'll set it up.${sign}` };
}

/** The timestamp for hour:minute Eastern on the same Eastern calendar day as ts. */
export function etAt(ts: number, hour: number, minute = 0): number {
  const wall = new Date(new Date(ts).toLocaleString("en-US", { timeZone: "America/New_York" }));
  const lag = ts - wall.getTime();
  wall.setHours(hour, minute, 0, 0);
  return wall.getTime() + lag;
}
/** When follow-up step i (0-based, i >= 1) goes out: a normal morning hour on its planned day. */
export const touchTime = (leadAt: number, i: number) => etAt(leadAt + TOUCH_DAYS[i] * 86400000, 9 + (i % 3), 5 + ((i * 11) % 45));
