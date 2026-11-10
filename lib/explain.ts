import type { AgentId } from "./agents";

export interface Explain {
  title: string;
  agent: AgentId;
  source: string;
  steps: { label: string; detail: string }[];
  note?: string;
}

const call = (title: string, note?: string): Explain => ({
  title, agent: "receptionist", source: "Phone system call-ended event",
  steps: [
    { label: "Call comes in", detail: "Your business number forwards to the receptionist. It picks up on the first ring, any hour." },
    { label: "Conversation", detail: "It asks how it can help, finds out the service and the car, and collects name, phone and email." },
    { label: "Call ends", detail: "The phone system sends us the end-of-call event: time, duration, transcript and recording." },
    { label: "Classified", detail: "The call is labeled: booked estimate, quote request, question, spam, or needs attention." },
    { label: "This card", detail: "We count the labeled calls. Nothing is estimated." },
  ], note,
});

export const EXPLAIN: Record<string, Explain> = {
  calls: call("Calls answered"),
  afterhours: call("After-hours calls", "After hours means weekends, and weekdays before 9am or after 6pm, and Saturdays before 11am or after 4pm in your time zone."),
  duration: call("Average call length", "Spam calls are left out so the average reflects real conversations."),
  leads: {
    title: "Leads captured", agent: "leads", source: "Calls, website forms and email",
    steps: [
      { label: "Contact arrives", detail: "A caller, a website form, a Google Business Profile message, or an email request." },
      { label: "Lead created", detail: "Name, phone, email, car and service are saved with where it came from." },
      { label: "Instant reply", detail: "An email goes out within minutes with the next step." },
      { label: "Counted here", detail: "Each lead is counted once, by the date it first reached you." },
    ],
  },
  reply: {
    title: "Time to first reply", agent: "leads", source: "Lead created time vs. first email sent time",
    steps: [
      { label: "Lead created", detail: "The timestamp when the call ended or the form was submitted." },
      { label: "First email sent", detail: "The timestamp of the instant reply from the email provider." },
      { label: "Difference", detail: "The gap in minutes, averaged across all leads in the period." },
    ],
  },
  jobs: {
    title: "Jobs booked", agent: "jobs", source: "Booked leads + values you enter",
    steps: [
      { label: "Lead books", detail: "The receptionist books it on the call, or the lead replies and you confirm." },
      { label: "Job created", detail: "It shows up under Jobs as scheduled." },
      { label: "You add the value", detail: "Job value is typed in by you after the estimate. We never guess revenue." },
    ],
  },
  followup: {
    title: "Follow-up performance", agent: "leads", source: "Email delivery events (sent, opened, replied)",
    steps: [
      { label: "Instant reply", detail: "Sent within minutes of the lead arriving." },
      { label: "Follow-ups", detail: "Next morning, day 3, day 6, day 10 and so on, up to 12 emails over about three months, each written around their car and service." },
      { label: "It stops itself", detail: "The sequence ends the moment they reply or book." },
      { label: "Events", detail: "The email provider reports opens and replies back to us. Those become these rates." },
    ],
    note: "Opens are approximate: some email apps block the tracking pixel.",
  },
  handling: call("How every call is handled"),
  wonback: {
    title: "Won back from quiet leads", agent: "leads", source: "Lead status + follow-up events",
    steps: [
      { label: "Lead goes quiet", detail: "No reply to the first follow-ups, and no booking, for about two weeks." },
      { label: "Personal message", detail: "A short message goes out that names their car and service, with an easy way to say it's already sorted." },
      { label: "They answer", detail: "A reply or a booking restarts the conversation and notifies the shop." },
      { label: "Counted here", detail: "Jobs booked after a win-back message are counted with their value, which you enter." },
    ],
  },
  sources: {
    title: "Where leads come from", agent: "leads", source: "Lead source field",
    steps: [{ label: "Tagged on arrival", detail: "Every lead is tagged as phone, website form, Google Business Profile or email the moment it's created." }, { label: "Counted", detail: "Totals for the selected period." }],
  },
  heatmap: call("When calls come in", "Every call is grouped by day of week and hour in your time zone."),
};

export const EXPLAIN_PROMPTS: Record<string, string[]> = {
  calls: ["How many calls came in after hours?", "When is my busiest hour?"],
  afterhours: ["How many after-hours calls turned into jobs?", "When is my busiest hour?"],
  duration: ["What's my latest call?"],
  handling: ["How is every call handled?"],
  heatmap: ["When is my busiest hour?"],
  leads: ["What's my conversion rate by source?", "How fast do we reply to new leads?"],
  reply: ["How fast do we reply to new leads?", "What's my conversion rate by source?"],
  sources: ["What's my conversion rate by source?", "Which form converts best?"],
  jobs: ["What jobs are scheduled?", "What's my biggest job?"],
  followup: ["How are the follow-up emails doing?", "What's my conversion rate by source?"],
  wonback: ["How are the follow-up emails doing?"],
};
