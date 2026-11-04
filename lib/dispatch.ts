import type { CrewMember, Dataset, Job } from "./types";

export const DEFAULT_CREW: CrewMember[] = [
  { id: "cr1", name: "Tony Reyes", role: "Crew lead", phone: "(253) 555-0171", skills: ["Water damage", "Burst pipe", "Storm damage"], color: "#2a62e8", status: "on_job" },
  { id: "cr2", name: "Jess Alvarez", role: "Technician", phone: "(253) 555-0172", skills: ["Water damage", "Sewage backup", "Burst pipe"], color: "#12935f", status: "available" },
  { id: "cr3", name: "Sam Okafor", role: "Technician", phone: "(253) 555-0173", skills: ["Fire & smoke", "Storm damage"], color: "#b9770e", status: "available" },
  { id: "cr4", name: "Luis Ortega", role: "Mold specialist", phone: "(253) 555-0174", skills: ["Mold", "Water damage"], color: "#8a4fe0", status: "available" },
  { id: "cr5", name: "Priya Nair", role: "Project manager", phone: "(253) 555-0175", skills: ["Fire & smoke", "Mold", "Sewage backup"], color: "#d6457a", status: "off" },
];

export interface Dispatch {
  id: string;
  job: Job;
  crew: CrewMember[];
  sentAt: number;
  message: string;
  replies: { who: string; text: string; at: number }[];
}

export function dispatchMessage(job: Job, business: string) {
  return `${business}: new job booked. ${job.service} at ${job.address}. Customer: ${job.customer}, ${job.phone}. Reply Y to accept.`;
}

/** Crew for a job: everyone whose skills match, lead first, capped at 2. Falls back to anyone who isn't off. */
export function crewFor(job: Job, crew: CrewMember[], salt = 0): CrewMember[] {
  const match = crew.filter((c) => c.skills.includes(job.service));
  const pool = (match.length ? match : crew.filter((c) => c.status !== "off")).filter((c) => c.status !== "off" || match.length === 0);
  if (!pool.length) return [];
  const start = (parseInt(job.id.slice(2), 10) + salt) % pool.length;
  return [pool[start], pool[(start + 1) % pool.length]].filter((c, i, a) => a.indexOf(c) === i).slice(0, job.service === "Fire & smoke" || job.service === "Storm damage" ? 2 : 1 + (parseInt(job.id.slice(2), 10) % 2));
}

export function dispatches(ds: Dataset, crew: CrewMember[], business: string, limit = 40): Dispatch[] {
  return ds.jobs.slice(0, limit).map((job) => {
    const team = crewFor(job, crew);
    const sentAt = job.at + 45000;
    return {
      id: `d_${job.id}`, job, crew: team, sentAt, message: dispatchMessage(job, business),
      replies: team.map((c, i) => ({ who: c.name, text: i === 0 ? "Y" : "Y, on my way", at: sentAt + (40 + i * 70) * 1000 })),
    };
  });
}
