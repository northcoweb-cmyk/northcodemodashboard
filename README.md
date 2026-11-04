# NorthCo Owner Dashboard

Next.js 15 + Tailwind 4 + TypeScript, shadcn structure (`components/ui`).

## Run
`npm install && npm run dev`

## Vercel env vars (set these, the defaults are for local use only)
- `DASHBOARD_PIN` : PIN on the welcome screen (4 digits)
- `ADMIN_PIN` : PIN for the hidden Admin panel (Settings page, click "NorthCo · v1.0")
- `AUTH_SECRET` : any long random string
- `ANTHROPIC_API_KEY` (optional) : lets a model phrase agent answers. Without it, answers are rule-based from the data. Never commit keys.

## Where the data comes from
`lib/seed.ts` generates a 60-day business. `/api/data` serves it in the shape the live backend will return (phone-system call-ended events, form webhooks, email events, owner-entered job values). Swap that one route for the real source.
`lib/agents.ts` routes a question to the right agent and answers from the same data.

## Admin
Settings page, bottom: click the small "NorthCo · v1.0" text, enter the admin PIN. Toggle modules (follow-up, website forms, check-in calls), show/hide them in the sidebar, edit business details and agent names. Settings persist in the browser (localStorage) until a real backend store exists.
