"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { AgentIcon } from "@/components/agent-icon";
import { agentById, type AgentId } from "@/lib/agents";
import { useChat } from "@/components/agent-chat";

/** The right agent for whatever you're looking at. Ask a question without leaving the popup flow. */
export function AskAgent({ agent, prompts = [], onAsk }: { agent: AgentId; prompts?: string[]; onAsk?: () => void }) {
  const chat = useChat();
  const def = agentById(agent);
  const [q, setQ] = useState("");
  const go = (text: string) => { if (!text.trim()) return; onAsk?.(); chat.askAgent(agent, text.trim()); setQ(""); };
  return (
    <div className="rounded-2xl border border-border bg-foreground/[0.03] p-3.5">
      <div className="flex items-center gap-3">
        <AgentIcon color={def.color} size={30} bob={false} />
        <div className="min-w-0"><div className="text-[13px] font-medium">Ask {chat.nameOf(agent)}</div><div className="text-[11px] text-muted-foreground">{def.role}</div></div>
      </div>
      {prompts.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{prompts.map((p) => <button key={p} onClick={() => go(p)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/25 hover:text-foreground">{p}</button>)}</div>}
      <form className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 focus-within:border-foreground/25" onSubmit={(e) => { e.preventDefault(); go(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this…" className="min-w-0 flex-1 bg-transparent py-1 text-[13px] outline-none placeholder:text-muted-foreground/60" />
        <button disabled={!q.trim()} className="flex size-6 items-center justify-center rounded-md bg-foreground text-background transition disabled:opacity-30" aria-label="Ask"><ArrowUp className="size-3.5" strokeWidth={2} /></button>
      </form>
    </div>
  );
}
