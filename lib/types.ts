export type IssueKey =
  | "poor_audio"
  | "early_hangup"
  | "out_of_area"
  | "needs_pricing"
  | "address_unclear";

export type Outcome =
  | "job_booked"
  | "quote_requested"
  | "transferred"
  | "info"
  | "spam"
  | "missed"
  | "issue";

export type StepState = "done" | "flagged" | "skipped";

export interface CallStep {
  key: "answered" | "greeted" | "qualified" | "captured" | "classified" | "alerted";
  label: string;
  state: StepState;
  note: string;
}

export interface Turn {
  who: "ai" | "caller";
  text: string;
}

export interface Call {
  id: string;
  at: number;
  durationSec: number;
  name: string;
  phone: string;
  afterHours: boolean;
  service: string;
  address: string;
  outcome: Outcome;
  issue?: IssueKey;
  recovered?: boolean;
  transferred: boolean;
  summary: string;
  steps: CallStep[];
  transcript: Turn[];
}

export type LeadSource = "call" | "form" | "email" | "gbp";
export type LeadStatus = "new" | "contacted" | "replied" | "booked" | "lost";

export interface Touch {
  n: number;
  label: string;
  channel?: "email" | "text" | "call";
  subject?: string;
  body?: string;
  sentAt: number;
  opened: boolean;
  replied: boolean;
}

export interface Lead {
  id: string;
  at: number;
  source: LeadSource;
  name: string;
  phone: string;
  email: string;
  service: string;
  address: string;
  vehicle?: string;
  /** What we quoted, in dollars, when a quote went out. */
  quote?: number;
  /** For form leads: which form or page they reached out from. */
  via?: string;
  status: LeadStatus;
  firstReplyMin: number;
  callId?: string;
  touches: Touch[];
  /** A personalized message sent to a lead that went quiet, and how it ended. */
  reactivation?: { sentAt: number; message: string; result: "won" | "replied" | "none" };
}

export interface Job {
  id: string;
  leadId: string;
  customer: string;
  service: string;
  address: string;
  phone: string;
  value: number | null;
  status: "scheduled" | "in_progress" | "completed";
  at: number;
  source: LeadSource;
  reactivated?: boolean;
}

export interface CheckIn {
  id: string;
  leadId: string;
  name: string;
  at: number;
  result: "got_help_elsewhere" | "still_needs_help" | "no_answer" | "voicemail_left" | "booked";
}

export interface Fix {
  issue: IssueKey;
  title: string;
  change: string;
  daysAgo: number;
  at: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  service: string;
  doneAt: number;
  value: number;
}

export interface Dataset {
  now: number;
  customers?: Customer[];
  calls: Call[];
  leads: Lead[];
  jobs: Job[];
  checkins: CheckIn[];
  fixes: Fix[];
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  skills: string[];
  color: string;
  status: "available" | "on_job" | "off";
}

export interface Settings {
  crew: CrewMember[];
  autoDispatch: boolean;
  /** Monthly marketing spend in dollars, entered by the owner. Needed for ROI. */
  adSpend: number;
  /** 'all' or the name of one location. */
  location: string;
  businessName: string;
  plan: string;
  ownerName: string;
  phone: string;
  alertEmail: string;
  hours: string;
  serviceArea: string;
  greeting: string;
  agentNames: Record<string, string>;
  modules: Record<"followup" | "forms" | "checkins" | "crew", { active: boolean; sidebar: boolean }>;
  bubbles: boolean;
}
