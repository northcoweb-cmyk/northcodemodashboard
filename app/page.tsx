"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Delete } from "lucide-react";
import { AIMascot } from "@/components/ui/ask-ai";

const LEN = 4;

export default function Welcome() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  async function submit(p: string) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: p }) });
    if (res.ok) { router.push("/dashboard"); return; }
    setBad(true); setTimeout(() => { setBad(false); setPin(""); }, 450);
    busyRef.current = false; setBusy(false);
  }
  function press(d: string) { if (busy || pin.length >= LEN) return; const n = pin + d; setPin(n); if (n.length === LEN) void submit(n); }
  function back() { if (!busy) setPin((p) => p.slice(0, -1)); }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") back(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6">
      <div className="grid-fade pointer-events-none absolute inset-0" />
      <div className="relative flex w-full max-w-[340px] flex-col items-center text-center">
        <div className="rise mb-8 flex items-center gap-2.5 text-[13px] font-medium tracking-wide text-muted-foreground">
          <AIMascot brand /> NorthCo
        </div>
        <h1 className="rise text-[34px] font-medium leading-tight tracking-tight" style={{ animationDelay: "60ms" }}>Welcome back</h1>
        <p className="rise mt-2 text-sm text-muted-foreground" style={{ animationDelay: "120ms" }}>Enter your PIN to open your dashboard.</p>

        <div className={`rise mt-9 flex gap-3 ${bad ? "shake" : ""}`} style={{ animationDelay: "180ms" }} aria-label="PIN entry">
          {Array.from({ length: LEN }).map((_, i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full border transition-all duration-200 ${i < pin.length ? (bad ? "border-bad bg-bad" : "scale-110 border-foreground bg-foreground") : "border-white/25"}`} />
          ))}
        </div>

        <div className="rise mt-10 grid w-full grid-cols-3 gap-2.5" style={{ animationDelay: "240ms" }}>
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <button key={d} onClick={() => press(d)} className="h-14 rounded-xl border border-border bg-card text-xl font-light tnum transition hover:bg-secondary active:scale-95">{d}</button>
          ))}
          <span />
          <button onClick={() => press("0")} className="h-14 rounded-xl border border-border bg-card text-xl font-light tnum transition hover:bg-secondary active:scale-95">0</button>
          <button onClick={back} aria-label="Delete" className="flex h-14 items-center justify-center rounded-xl text-muted-foreground transition hover:text-foreground active:scale-95"><Delete className="size-5" strokeWidth={1.5} /></button>
        </div>

        <p className="rise mt-8 flex items-center gap-1.5 text-xs text-muted-foreground" style={{ animationDelay: "300ms" }}>
          Need a PIN? Ask your NorthCo contact. <ArrowRight className="size-3" />
        </p>
      </div>
    </main>
  );
}
