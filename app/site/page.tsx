"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EMPTY_SIM, mergeSim, simulateForm, type SimStore } from "@/lib/sim";

const RED = "#ed1c24";
const SERVICES = ["Paint protection film", "Ceramic coating", "Paint correction", "Vinyl wrap", "Window tint", "Detailing"];
const SVC_BLURB: Record<string, string> = {
  "Paint protection film": "Clear film that helps protect your paint from rock chips, scratches and road debris. Some films self-heal light scratches with heat.",
  "Ceramic coating": "A liquid layer that adds gloss and makes the car far easier to keep clean.",
  "Paint correction": "Removes swirl marks and light scratches so the paint looks the way it should.",
  "Vinyl wrap": "Change the color or finish, or wrap just the details. Satin, gloss, matte.",
  "Window tint": "Privacy, less heat and a cleaner look, installed by certified technicians.",
  "Detailing": "A full interior and exterior reset, and the best starting point before coating or film.",
};
const REVIEWS = [
  { n: "Giles Pinto", t: "I got a full detail, paint correction, and ceramic coating done on my car. VJ and the guys are truly experts when it comes to making your car look like it’s coming off the show room floor once again. I truly appreciated the real time updates throughout the process." },
  { n: "Jason C", t: "Honestly one of the best shops in the area. I had multiple cars here for personal and business and I really appreciate the attention detail they take with every car. They do top quality work." },
  { n: "Kelly Hernandez-Salas", t: "I’m so in love with my new tints! The work came out super clean and exactly how I wanted. Their customer service was amazing so friendly, professional, and made the whole process feel easy and stress-free. You can tell they really care about their customers. Highly recommend!" },
  { n: "Chris", t: "Brought in my 24 wagoneer S to have the emblems wrapped in a very difficult vinyl . vjay and Coby gave all the recommendations and we're very professional. I'm very happy and recommend them on any project no matter how big or small." },
];
const FAQ = [
  ["PPF or ceramic coating, which do I need?", "Paint protection film is a physical layer that helps stop rock chips and scratches. Ceramic coating adds gloss and makes washing easier but does not stop chips. Many owners put film on the front of the car and ceramic over the rest. We’ll recommend what fits your car at the free estimate."],
  ["How much does it cost?", "It depends on the car and what you want covered, so every estimate is done in person with clear, upfront pricing. Tell us the car and we’ll get you a number."],
  ["Do you work on Teslas and exotics?", "Yes. We work on everything from daily drivers to high-end and exotic cars, including Tesla paint protection film."],
  ["How fast will I hear back?", "You get a message within minutes of sending the form, and a person from the shop follows up to schedule your estimate."],
];
const AREAS = ["Gaithersburg", "Rockville", "Germantown", "Potomac", "Bethesda", "Olney", "Silver Spring", "Washington, D.C."];

function Note({ n, children, show }: { n: number; children: React.ReactNode; show: boolean }) {
  if (!show) return null;
  return (
    <div className="my-3 flex gap-3 rounded-xl border border-dashed p-3 text-[13px] leading-snug" style={{ borderColor: "#f5b942", background: "rgba(245,185,66,0.08)", color: "#f7d58a" }}>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-black" style={{ background: "#f5b942" }}>{n}</span>
      <div><b className="text-[#f5b942]">Why this converts better. </b>{children}</div>
    </div>
  );
}

function Stars() { return <span style={{ color: "#f5b942" }} aria-label="5 stars">★★★★★</span>; }

export default function Site() {
  const [notes, setNotes] = useState(true);
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ car: "", service: "Paint protection film", name: "", phone: "", email: "" });
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [quiz, setQuiz] = useState<{ a?: string; b?: string }>({});
  const [chat, setChat] = useState(false);
  const [msgs, setMsgs] = useState<{ who: "ai" | "me"; t: string }[]>([{ who: "ai", t: "Hi, I’m the My Paint Doctor assistant (an AI). Ask me about PPF, ceramic, tint, wraps, hours or getting a quote." }]);
  const [q, setQ] = useState("");

  const goForm = (service?: string) => { if (service) setF((x) => ({ ...x, service })); setStep(1); setDone(false); formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); };

  const submit = () => {
    const sim = simulateForm({ name: f.name || "Website visitor", phone: f.phone, email: f.email || "visitor@example.com", service: f.service, vehicle: f.car, source: "form", via: "Free quote form · /", address: "Gaithersburg, MD" });
    try {
      const raw = localStorage.getItem("nc_sim_v1"); const cur: SimStore = raw ? { ...EMPTY_SIM, ...JSON.parse(raw) } : EMPTY_SIM;
      localStorage.setItem("nc_sim_v1", JSON.stringify(mergeSim(cur, sim)));
    } catch {}
    setDone(true);
  };

  const rec = useMemo(() => {
    if (!quiz.a || !quiz.b) return null;
    if (quiz.b === "chips") return { s: "Paint protection film", why: quiz.a === "new" ? "On a new car, film on the front end is the most common way to keep the factory paint clean from day one." : "Film is the only option here that physically helps against rock chips and scratches." };
    if (quiz.b === "shine") return { s: quiz.a === "used" ? "Paint correction" : "Ceramic coating", why: quiz.a === "used" ? "Used paint usually has swirls. Correcting first, then coating, gives the best finish." : "A ceramic coating on new paint adds gloss and makes the car easy to keep clean." };
    if (quiz.b === "color") return { s: "Vinyl wrap", why: "A wrap changes the color or finish, and can be done on the whole car or just the details." };
    return { s: "Window tint", why: "Tint adds privacy and helps cut heat." };
  }, [quiz]);

  const ask = (text: string) => {
    const t = text.toLowerCase(); let a = "";
    if (/ppf|film|ceramic|differ|vs/.test(t)) a = "PPF is a clear film that helps stop rock chips and scratches. Ceramic coating adds gloss and makes cleaning easier but does not stop chips. Many people do film on the front and ceramic over the rest. Want a free estimate?";
    else if (/tint|window/.test(t)) a = "Yes, we do window tint. Tell me the car and I’ll get you a free estimate.";
    else if (/hour|open|when/.test(t)) a = "We’re open Monday to Friday 9am to 6pm and Saturday 11am to 4pm. Closed Sunday. You can send a quote request any time.";
    else if (/where|address|locat/.test(t)) a = "7905 Cessna Ave, Suite K, Gaithersburg, MD 20879. We serve Gaithersburg, Rockville, Potomac, Bethesda, Germantown and the surrounding area.";
    else if (/price|cost|how much|quote|estimate/.test(t)) a = "Pricing depends on the car and what you want, so we do a free in-person estimate with clear upfront pricing. Send the car and service and the team will get back to you in minutes.";
    else a = "I can help with that, or I can have the team reach you. Want to send a quick quote request?";
    setMsgs((m) => [...m, { who: "me", t: text }, { who: "ai", t: a }]); setQ("");
  };

  const input = "w-full rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-white/40 focus:border-white/50";
  const btn = "rounded-lg px-5 py-3 text-[15px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40";

  useEffect(() => { document.documentElement.style.scrollBehavior = "smooth"; }, []);

  return (
    <div className="min-h-dvh bg-[#08090b] text-white" style={{ fontFamily: "Geist, system-ui, sans-serif" }}>
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08090b]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-5 py-3">
          <img src="/mpd/MPD-Logo.png" alt="My Paint Doctor" className="h-10 w-auto" />
          <nav className="ml-6 hidden gap-6 text-sm text-white/70 md:flex"><a href="#services">Services</a><a href="#work">Our work</a><a href="#reviews">Reviews</a><a href="#faq">FAQ</a></nav>
          <a href="tel:+12404242554" className="ml-auto hidden text-sm font-medium text-white/80 sm:block">(240) 424-2554</a>
          <button onClick={() => goForm()} className={btn} style={{ background: RED, padding: "9px 16px" }}>Get my free quote</button>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <img src="/mpd/MPD-Supra.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090b] via-[#08090b]/85 to-[#08090b]/30" />
        <div className="relative mx-auto grid max-w-[1180px] gap-10 px-5 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm"><span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5"><Stars /> <b>5.0</b> on Google · 100+ reviews</span><span className="text-white/60">Gaithersburg, MD</span></div>
            <h1 className="text-[44px] font-semibold leading-[1.02] tracking-tight sm:text-[60px]">The best protection your paint can get.</h1>
            <p className="mt-5 max-w-[520px] text-lg text-white/70">Certified PPF and ceramic coating installers for daily drivers, Teslas and exotics. Tell us your car and get a free estimate. You’ll hear back in minutes.</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75"><li>✓ Feynlab Tier 1 &amp; STEK certified technicians</li><li>✓ Clear, upfront pricing</li><li>✓ Updates throughout your service</li></ul>
            <Note n={1} show={notes}>On your current site the “Get A Free Quote” button takes visitors to a separate Contact page, and the full form (8 fields) sits further down the homepage. Here the first question is in the first screen, one tap each, so the visitor has already started before they decide whether to leave.</Note>
            <Note n={2} show={notes}>Your 5.0 rating and 100+ reviews are your strongest asset. Here they sit right next to the headline, and the real reviews repeat again right before a second quote button.</Note>
          </div>

          <div ref={formRef} className="rounded-2xl border border-white/15 bg-black/55 p-6 backdrop-blur-xl">
            {done ? (
              <div className="py-6 text-center"><div className="text-4xl">✓</div><h2 className="mt-3 text-2xl font-semibold">Got it, {f.name.split(" ")[0] || "thanks"}.</h2><p className="mt-2 text-white/70">We’re putting together your {f.service.toLowerCase()} estimate{f.car ? ` for the ${f.car}` : ""}. Check your email in a few minutes, and a person from the shop will follow up to set up your free in-person estimate.</p><p className="mt-4 text-xs text-white/50">Demo: this lead was sent to the dashboard. Open Dashboard → Website forms to see it and its follow-up timeline.</p></div>
            ) : step === 1 ? (
              <>
                <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Step 1 of 2 · takes 20 seconds</div>
                <h2 className="text-2xl font-semibold">What are we protecting?</h2>
                <input className={`${input} mt-4`} placeholder="Year, make, model (e.g. 2024 Porsche 911)" value={f.car} onChange={(e) => setF({ ...f, car: e.target.value })} />
                <div className="mt-3 flex flex-wrap gap-2">{SERVICES.map((s) => <button key={s} onClick={() => setF({ ...f, service: s })} className="rounded-full border px-3.5 py-2 text-sm transition" style={f.service === s ? { background: RED, borderColor: RED } : { borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.8)" }}>{s}</button>)}</div>
                <button disabled={!f.car.trim()} onClick={() => setStep(2)} className={`${btn} mt-5 w-full`} style={{ background: RED }}>Continue →</button>
                <Note n={3} show={notes}>A two-step form gets a commitment on step 1 (car and service) before asking for any contact details. Fewer fields at a time means fewer people quit halfway.</Note>
              </>
            ) : (
              <>
                <div className="mb-1 text-xs uppercase tracking-wider text-white/50">Step 2 of 2 · where should we send it?</div>
                <h2 className="text-2xl font-semibold">Your free estimate for the {f.car || "car"}</h2>
                <input className={`${input} mt-4`} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <input className={`${input} mt-3`} placeholder="Mobile number" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                <input className={`${input} mt-3`} placeholder="Email" inputMode="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <button disabled={!f.name.trim() || !f.phone.trim()} onClick={submit} className={`${btn} mt-5 w-full`} style={{ background: RED }}>Send my request</button>
                <p className="mt-3 text-xs text-white/45">We’ll email you about this request and may follow up by phone. No spam, no pressure.</p>
                <button onClick={() => setStep(1)} className="mt-2 text-xs text-white/60 underline">← Back</button>
                <Note n={4} show={notes}>Phone and name come right after the car and service. The moment a visitor submits, the dashboard creates the lead, alerts you, and a personal email goes out within minutes. Every missed or half-finished request still has a way to be followed up.</Note>
              </>
            )}
          </div>
        </div>
      </section>

      {/* trust strip */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-5 py-6 text-center sm:grid-cols-4">
          {[["5.0", "Google rating"], ["100+", "Five-star reviews"], ["Tier 1 & STEK", "Certified installers"], ["Gaithersburg", "Serving the DC metro"]].map(([a, b]) => <div key={b}><div className="text-2xl font-semibold">{a}</div><div className="text-sm text-white/55">{b}</div></div>)}
        </div>
      </section>

      {/* services */}
      <section id="services" className="mx-auto max-w-[1180px] px-5 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">Pick what you want. We’ll handle the rest.</h2>
        <p className="mt-2 max-w-[560px] text-white/60">Each button starts your quote with that service already selected.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="text-lg font-semibold">{s}</h3><p className="mt-2 flex-1 text-sm text-white/60">{SVC_BLURB[s]}</p>
              <button onClick={() => goForm(s)} className="mt-4 self-start rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10">Get a {s.toLowerCase()} quote →</button>
            </div>
          ))}
        </div>
        <Note n={5} show={notes}>Every service card has its own quote button that pre-selects the service, so the form is already half filled when it opens. Today a visitor has to leave the page and start from a blank form.</Note>
      </section>

      {/* AI picker */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-[900px] px-5 py-14">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: RED }}>✦ AI assist</div>
          <h2 className="text-3xl font-semibold tracking-tight">Not sure if you need PPF, ceramic or something else?</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><div className="mb-2 text-sm text-white/60">Is the car new or used?</div><div className="flex gap-2">{[["new", "New"], ["used", "Used"]].map(([k, l]) => <button key={k} onClick={() => setQuiz({ ...quiz, a: k })} className="rounded-full border px-4 py-2 text-sm" style={quiz.a === k ? { background: RED, borderColor: RED } : { borderColor: "rgba(255,255,255,0.18)" }}>{l}</button>)}</div></div>
            <div><div className="mb-2 text-sm text-white/60">What matters most?</div><div className="flex flex-wrap gap-2">{[["chips", "Rock chips & scratches"], ["shine", "Gloss & easy cleaning"], ["color", "Change the look"], ["heat", "Privacy & heat"]].map(([k, l]) => <button key={k} onClick={() => setQuiz({ ...quiz, b: k })} className="rounded-full border px-4 py-2 text-sm" style={quiz.b === k ? { background: RED, borderColor: RED } : { borderColor: "rgba(255,255,255,0.18)" }}>{l}</button>)}</div></div>
          </div>
          {rec && <div className="mt-6 rounded-xl border border-white/15 bg-black/40 p-5"><div className="text-sm text-white/50">We’d look at</div><div className="text-2xl font-semibold">{rec.s}</div><p className="mt-1 text-white/70">{rec.why}</p><button onClick={() => goForm(rec.s)} className={`${btn} mt-4`} style={{ background: RED }}>Get my free {rec.s.toLowerCase()} quote</button></div>}
          <Note n={6} show={notes}>Visitors who don’t know the difference between PPF and ceramic usually leave to Google it and don’t come back. This keeps them on your site and ends on a quote request. The live version is an AI assistant trained on your services and answers any question, any hour (the floating chat button does the same).</Note>
        </div>
      </section>

      {/* work */}
      <section id="work" className="mx-auto max-w-[1180px] px-5 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">The work speaks for itself.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["MPD-Supra.png", "MPD-Maybach.png", "MPD-Corvette.png", "MPD-GTR.png"].map((i) => <img key={i} src={`/mpd/${i}`} alt="Finished car at My Paint Doctor" className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />)}</div>
      </section>

      {/* reviews */}
      <section id="reviews" className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-[1180px] px-5 py-16">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-3xl font-semibold tracking-tight">Rated 5.0 by 100+ owners.</h2><div className="text-lg"><Stars /> <span className="text-white/70">on Google</span></div></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">{REVIEWS.map((r) => <figure key={r.n} className="rounded-2xl border border-white/10 bg-black/30 p-5"><Stars /><blockquote className="mt-2 text-[15px] leading-relaxed text-white/80">“{r.t}”</blockquote><figcaption className="mt-3 text-sm text-white/50">{r.n} · Google review</figcaption></figure>)}</div>
          <div className="mt-8 text-center"><button onClick={() => goForm()} className={btn} style={{ background: RED }}>Join them. Get my free quote</button></div>
          <Note n={7} show={notes}>Reviews sit right before a second quote button, so the proof and the ask are on the same screen. Every section on this page ends on a way to start a quote.</Note>
        </div>
      </section>

      {/* process */}
      <section className="mx-auto max-w-[1180px] px-5 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">{[["Tell us the car", "Two quick steps, about 20 seconds."], ["Hear back in minutes", "You get a message right away and a person follows up."], ["Free in-person estimate", "Clear, upfront pricing. No surprises."], ["Drop off, get updates", "We keep you posted through the whole service."]].map(([a, b], i) => <div key={a} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm font-semibold" style={{ color: RED }}>Step {i + 1}</div><div className="mt-1 text-lg font-semibold">{a}</div><p className="mt-1 text-sm text-white/60">{b}</p></div>)}</div>
        <Note n={8} show={notes}>This sets the expectation of a fast reply, and the system behind it actually delivers it: the lead is created instantly, a personal email goes out within minutes, and follow-ups continue if they go quiet. See Dashboard → Website forms to watch it happen.</Note>
      </section>

      {/* faq */}
      <section id="faq" className="border-y border-white/10 bg-white/[0.03]"><div className="mx-auto max-w-[800px] px-5 py-16"><h2 className="text-3xl font-semibold tracking-tight">Questions people ask before booking</h2><div className="mt-6 divide-y divide-white/10">{FAQ.map(([a, b]) => <details key={a} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between text-[17px] font-medium">{a}<span className="text-white/40 group-open:rotate-45">+</span></summary><p className="mt-2 text-white/65">{b}</p></details>)}</div>
        <Note n={9} show={notes}>Answering the questions that stop people (price, PPF vs ceramic, “do you do my car”) removes the reasons to leave and Google it. Each one ends with the next step.</Note></div></section>

      {/* final CTA */}
      <section className="mx-auto max-w-[900px] px-5 py-20 text-center">
        <h2 className="text-4xl font-semibold tracking-tight">Ready to protect your paint?</h2>
        <p className="mx-auto mt-3 max-w-[520px] text-white/65">Send us your car. You’ll hear back in minutes, and the estimate is free.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><button onClick={() => goForm()} className={btn} style={{ background: RED }}>Get my free quote</button><a href="tel:+12404242554" className="rounded-lg border border-white/25 px-5 py-3 text-[15px] font-semibold">Call (240) 424-2554</a></div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 text-sm text-white/50"><div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-6"><div><img src="/mpd/MPD-Logo.png" alt="" className="mb-3 h-10" />7905 Cessna Ave, Suite K, Gaithersburg, MD 20879<br />Mon–Fri 9am–6pm · Sat 11am–4pm · Sun closed</div><div>Serving {AREAS.join(", ")}</div></div><p className="mx-auto mt-6 max-w-[1180px] text-xs text-white/35">Concept website built by NorthCo AI to show how a faster, higher-converting site could work. Not live.</p></footer>

      {/* mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-white/10 bg-[#08090b]/95 p-3 backdrop-blur sm:hidden"><a href="tel:+12404242554" className="flex-1 rounded-lg border border-white/25 py-3 text-center text-sm font-semibold">Call</a><button onClick={() => goForm()} className="flex-[2] rounded-lg py-3 text-sm font-semibold" style={{ background: RED }}>Free quote</button></div>
      {notes && <div className="hidden" />}

      {/* notes toggle */}
      <button onClick={() => setNotes(!notes)} className="fixed bottom-20 left-4 z-50 rounded-full border border-[#f5b942]/50 bg-black/80 px-4 py-2 text-xs font-semibold text-[#f5b942] backdrop-blur sm:bottom-5">{notes ? "Hide" : "Show"} conversion notes</button>
      <a href="/dashboard/forms" className="fixed bottom-5 left-52 z-50 hidden rounded-full border border-white/20 bg-black/80 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur sm:block">See it in the dashboard →</a>

      {/* chat */}
      <button onClick={() => setChat(!chat)} className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold shadow-xl sm:bottom-5" style={{ background: RED }}>✦ Ask the Paint Doctor</button>
      {chat && (
        <div className="fixed bottom-36 right-4 z-50 flex h-[420px] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0d0e11] shadow-2xl sm:bottom-20">
          <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold">My Paint Doctor assistant <span className="font-normal text-white/50">· AI</span></div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-[13px]">{msgs.map((m, i) => <div key={i} className={m.who === "me" ? "ml-8 rounded-xl bg-white/10 p-2.5" : "mr-8 rounded-xl bg-white/[0.05] p-2.5 text-white/85"}>{m.t}</div>)}</div>
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">{["PPF vs ceramic?", "What are your hours?", "How do I get a quote?"].map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70">{s}</button>)}</div>
          <form className="flex gap-2 border-t border-white/10 p-2.5" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…" className="min-w-0 flex-1 rounded-lg bg-white/[0.06] px-3 py-2 text-[13px] outline-none" /><button className="rounded-lg px-3 text-[13px] font-semibold" style={{ background: RED }}>Send</button></form>
        </div>
      )}
    </div>
  );
}
