"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { AgentIcon } from "@/components/agent-icon";
import { AGENTS, agentById, type AgentId } from "@/lib/agents";
import { useData, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "agent"; text: string; agent?: AgentId; routed?: boolean; facts?: string[] }
interface Chat {
  openAgent: (id: AgentId) => void;
  ask: (q: string) => void;
  visibleAgents: typeof AGENTS;
  nameOf: (id: AgentId) => string;
}
const Ctx = createContext<Chat | null>(null);
export const useChat = () => { const c = useContext(Ctx); if (!c) throw new Error("AgentChatProvider missing"); return c; };

export function AgentChatProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { sim } = useData();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<AgentId>("dispatch");
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const visibleAgents = AGENTS;
  const nameOf = useCallback((id: AgentId) => settings.agentNames[id] || agentById(id).name, [settings.agentNames]);

  const send = useCallback(async (q: string, to: AgentId) => {
    const question = q.trim(); if (!question) return;
    setThreads((t) => ({ ...t, [to]: [...(t[to] || []), { role: "user", text: question }] }));
    setBusy(true);
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: question, agent: to === "dispatch" ? "auto" : to, businessName: settings.businessName, followup: settings.modules.followup.active, checkins: settings.modules.checkins.active, crewOn: settings.modules.crew.active, crew: settings.crew, sim }) });
      const j = await res.json();
      setThreads((t) => ({ ...t, [to]: [...(t[to] || []), { role: "agent", text: j.text || "I couldn't answer that.", agent: j.agent as AgentId, routed: to === "dispatch" && j.agent !== "dispatch", facts: j.facts }] }));
    } catch {
      setThreads((t) => ({ ...t, [to]: [...(t[to] || []), { role: "agent", text: "Something went wrong reaching the agents. Try again in a moment.", agent: to }] }));
    } finally { setBusy(false); }
  }, [settings.businessName, settings.modules.followup.active, settings.modules.checkins.active, settings.modules.crew.active, settings.crew, sim]);

  const value: Chat = {
    visibleAgents, nameOf,
    openAgent: (id) => { setActive(id); setOpen(true); },
    ask: (q) => { setActive("dispatch"); setOpen(true); void send(q, "dispatch"); },
  };

  const msgs = threads[active] || [];
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, busy, open]);
  const def = agentById(active);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen} title={nameOf(active)} description={def.role} width="max-w-[460px]">
        <div className="-mx-5 -my-4 flex h-full min-h-[70dvh] flex-col">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-border px-5 py-2.5">
            {visibleAgents.map((a) => (
              <button key={a.id} onClick={() => setActive(a.id)} className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition", a.id === active ? "border-foreground/25 bg-foreground/[0.08] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <i className="size-2 rounded-full" style={{ background: a.color }} />{nameOf(a.id)}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto no-scrollbar px-5 py-5">
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <AgentIcon key={active} color={def.color} size={96} />
              <div><div className="text-sm font-medium">{nameOf(active)}</div><p className="mx-auto mt-1 max-w-[300px] text-xs leading-relaxed text-muted-foreground">{def.blurb}</p></div>
            </div>
            {!msgs.length && (
              <div className="flex flex-wrap justify-center gap-2">
                {def.prompts.map((p) => <button key={p} onClick={() => send(p, active)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/25 hover:text-foreground">{p}</button>)}
              </div>
            )}
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="ml-10 self-end rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-[13px] text-background">{m.text}</div>
            ) : (
              <div key={i} className="flex flex-col gap-1.5 self-start">
                {m.routed && m.agent && <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"><Sparkles className="size-3" />Routed to <i className="size-1.5 rounded-full" style={{ background: agentById(m.agent).color }} />{nameOf(m.agent)}</span>}
                <div className="mr-8 rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-[13px] leading-relaxed">
                  {m.text}
                  {m.facts && <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-xs text-muted-foreground">{m.facts.map((f) => <li key={f} className="tnum">{f}</li>)}</ul>}
                </div>
              </div>
            ))}
            {busy && <div className="flex gap-1 self-start rounded-2xl border border-border bg-card px-3.5 py-3">{[0, 1, 2].map((i) => <i key={i} className="size-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} />)}</div>}
            <div ref={endRef} />
          </div>
          <form className="border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); const q = text; setText(""); void send(q, active); }}>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 focus-within:border-foreground/25">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={active === "dispatch" ? "Ask anything. I'll pick the right agent." : `Ask ${nameOf(active)}…`} className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none placeholder:text-muted-foreground/60" />
              <button disabled={!text.trim() || busy} className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background transition disabled:opacity-30" aria-label="Send"><ArrowUp className="size-4" strokeWidth={2} /></button>
            </div>
          </form>
        </div>
      </Sheet>
    </Ctx.Provider>
  );
}
