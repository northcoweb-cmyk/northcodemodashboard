# NorthCo Owner Dashboard

Next.js 15 + Tailwind 4 + TypeScript, shadcn structure (`components/ui`).

## Run
`npm install && npm run dev`

## PIN
Everything uses PIN 3725 (welcome screen and Admin). To change it, set `DASHBOARD_PIN` / `ADMIN_PIN` in Vercel. No AI key is needed: every agent answer is built from the dashboard data.

## Where the data comes from
`lib/seed.ts` generates a 60-day business. `/api/data` serves it in the shape the live backend will return (phone-system call-ended events, form webhooks, email events, owner-entered job values). Swap that one route for the real source.
`lib/agents.ts` routes a question to the right agent and answers from the same data.

## Admin
Hidden: tap the logo square at the top of the sidebar 5 times, or press Ctrl/Cmd+Shift+A, then enter 3725. Includes the event simulator. Toggle modules (follow-up, website forms, check-in calls), show/hide them in the sidebar, edit business details and agent names. Settings persist in the browser (localStorage) until a real backend store exists.
