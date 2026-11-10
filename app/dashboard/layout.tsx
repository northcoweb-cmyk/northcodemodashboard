"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Activity, ArrowUp, BarChart3, CalendarDays, HardHat, Moon, Sun, FileInput, Hammer, LayoutDashboard, LogOut, MailCheck, RefreshCw, Menu, PhoneCall, PhoneOutgoing, Settings as Cog, Users } from "lucide-react";
import { SidebarNav, type NavGroupData } from "@/components/ui/dashboard-sidebar";
import { AgentIcon } from "@/components/agent-icon";
import { agentById } from "@/lib/agents";
import { Editable } from "@/components/ui/editable";
import { AgentChatProvider, useChat } from "@/components/agent-chat";
import { AdminDialog } from "@/components/admin-dialog";
import { LOCATIONS } from "@/lib/lead";
import { ExplainProvider } from "@/components/explain-provider";
import { DataProvider, SettingsProvider, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

const TITLES: Record<string, string> = { "/dashboard": "Overview", "/dashboard/calls": "Calls", "/dashboard/leads": "Leads", "/dashboard/follow-ups": "Follow-ups", "/dashboard/jobs": "Estimates & jobs", "/dashboard/reactivation": "Old estimates", "/dashboard/crew": "Crew", "/dashboard/activity": "Activity", "/dashboard/schedule": "Schedule", "/dashboard/reports": "Reports", "/dashboard/forms": "Website forms", "/dashboard/check-ins": "Check-in calls", "/dashboard/settings": "Settings" };

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const { settings, update } = useSettings();
  const chat = useChat();
  const [mobile, setMobile] = useState(false);
  const [admin, setAdmin] = useState(false);
  const taps = useRef<number[]>([]);
  const tapLogo = () => { const n = Date.now(); taps.current = [...taps.current.filter((t) => n - t < 2000), n]; if (taps.current.length >= 5) { taps.current = []; setAdmin(true); } };
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") { e.preventDefault(); setAdmin(true); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const [q, setQ] = useState("");
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.getAttribute("data-theme") === "dark"); }, []);
  const flip = () => { const n = !dark; setDark(n); document.documentElement.setAttribute("data-theme", n ? "dark" : "light"); try { localStorage.setItem("nc_theme", n ? "dark" : "light"); } catch {} };
  const m = settings.modules;

  const groups: NavGroupData[] = [
    { items: [
      { id: "/dashboard", title: "Overview", icon: LayoutDashboard, href: "/dashboard" },
      { id: "/dashboard/activity", title: "Activity", icon: Activity, href: "/dashboard/activity" },
    ] },
    { heading: "Phone", items: [
      { id: "/dashboard/calls", title: "Calls", icon: PhoneCall, href: "/dashboard/calls" },
    ] },
    { heading: "Customers", items: [
      { id: "/dashboard/leads", title: "Leads", icon: Users, href: "/dashboard/leads" },
      ...(m.followup.sidebar ? [{ id: "/dashboard/follow-ups", title: "Follow-ups", icon: MailCheck, href: "/dashboard/follow-ups" }] : []),
      ...(m.forms.sidebar ? [{ id: "/dashboard/forms", title: "Website forms", icon: FileInput, href: "/dashboard/forms" }] : []),
      { id: "/dashboard/reactivation", title: "Old estimates", icon: RefreshCw, href: "/dashboard/reactivation" },
      ...(m.checkins.sidebar ? [{ id: "/dashboard/check-ins", title: "Check-in calls", icon: PhoneOutgoing, href: "/dashboard/check-ins" }] : []),
    ] },
    { heading: "Work", items: [
      { id: "/dashboard/jobs", title: "Estimates & jobs", icon: Hammer, href: "/dashboard/jobs" },
      { id: "/dashboard/schedule", title: "Schedule", icon: CalendarDays, href: "/dashboard/schedule" },
      ...(m.crew.sidebar ? [{ id: "/dashboard/crew", title: "Crew", icon: HardHat, href: "/dashboard/crew" }] : []),
      { id: "/dashboard/reports", title: "Reports", icon: BarChart3, href: "/dashboard/reports" },
    ] },
    { heading: "Your agents", items: chat.visibleAgents.filter((a) => a.id !== "dispatch").map((a) => ({ id: `agent-${a.id}`, title: chat.nameOf(a.id), orb: a.color, onClick: () => { setMobile(false); chat.openAgent(a.id); } })) },
  ];
  const bottom = [
    { id: "/dashboard/settings", title: "Settings", icon: Cog, href: "/dashboard/settings" },
    { id: "lock", title: "Lock", icon: LogOut, onClick: async () => { await fetch("/api/auth", { method: "DELETE" }); router.push("/"); } },
  ];
  const side = (cls?: string) => <SidebarNav className={cls} groups={groups} bottom={bottom} activeId={path} businessName={settings.businessName} plan={settings.plan} onBusinessName={(v) => update({ businessName: v })} onPlan={(v) => update({ plan: v })} onLogoTap={tapLogo} />;

  return (
    <div className="flex h-dvh overflow-hidden bg-background print:block print:h-auto print:overflow-visible">
      <div className="hidden md:block print:hidden">{side()}</div>
      {mobile && (<><div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobile(false)} /><div className="fixed inset-y-0 left-0 z-50 md:hidden">{side("bg-card")}</div></>)}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex print:hidden h-14 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5 md:hidden" onClick={() => setMobile(true)} aria-label="Menu"><Menu className="size-5" strokeWidth={1.5} /></button>
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"><span className="truncate">{settings.businessName}</span><span>/</span><span className="truncate font-medium text-foreground">{TITLES[path] || "Dashboard"}</span></div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">{LOCATIONS.length > 1 && <select value={settings.location} onChange={(e) => update({ location: e.target.value })} aria-label="Location" className="hidden rounded-md border border-border bg-transparent px-2 py-1 text-xs text-foreground outline-none sm:block"><option value="all">All locations</option>{LOCATIONS.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}</select>}<button onClick={flip} aria-label="Toggle theme" className="rounded-md p-1.5 transition hover:bg-foreground/5 hover:text-foreground">{dark ? <Sun className="size-4" strokeWidth={1.5} /> : <Moon className="size-4" strokeWidth={1.5} />}</button><span className="size-1.5 animate-pulse rounded-full bg-good" /><span className="hidden sm:inline">Receptionist online</span></div>
        </header>
        <main className="no-scrollbar flex-1 overflow-y-auto print:overflow-visible px-4 pb-32 pt-6 sm:px-6 lg:px-8"><div className="mx-auto w-full max-w-[1180px]">{children}</div></main>
        <form className="print:hidden pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 md:left-[260px]" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { chat.ask(q); setQ(""); } }}>
          <div className="pointer-events-auto flex w-full max-w-[560px] items-center gap-2.5 rounded-full border border-foreground/[0.12] bg-background/80 py-1.5 pl-2 pr-2 shadow-2xl backdrop-blur-xl">
            <button type="button" onClick={() => chat.openAgent("dispatch")} className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/[0.05]" aria-label="Open agents"><AgentIcon color={agentById("dispatch").color} size={24} bob={false} /></button>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask your agents anything…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70" />
            <button disabled={!q.trim()} className={cn("flex size-8 items-center justify-center rounded-full bg-foreground text-background transition", !q.trim() && "opacity-30")} aria-label="Send"><ArrowUp className="size-4" strokeWidth={2} /></button>
          </div>
        </form>
      </div>
      <AdminDialog open={admin} onOpenChange={setAdmin} />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider><DataProvider><AgentChatProvider><ExplainProvider><Shell>{children}</Shell></ExplainProvider></AgentChatProvider></DataProvider></SettingsProvider>
  );
}
