"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Dataset, Settings } from "./types";
import { DEFAULT_CREW } from "./dispatch";
import { EMPTY_SIM, mergeSim, withSim, type SimStore } from "./sim";
import { locationOf } from "./lead";

export const DEFAULTS: Settings = {
  crew: DEFAULT_CREW,
  autoDispatch: true,
  adSpend: 0,
  location: "all",
  businessName: "Harborline Restoration",
  plan: "Growth",
  ownerName: "Mike Harlan",
  phone: "(253) 555-0142",
  alertEmail: "mike@harborlinerestoration.com",
  hours: "Mon to Fri, 8am to 6pm",
  serviceArea: "Tacoma, Gig Harbor, Puyallup, Federal Way, Lakewood",
  greeting: "Thanks for calling Harborline Restoration. What's going on?",
  agentNames: {},
  modules: {
    followup: { active: true, sidebar: true },
    forms: { active: true, sidebar: true },
    checkins: { active: false, sidebar: false },
    crew: { active: true, sidebar: true },
  },
  bubbles: true,
};

const KEY = "nc_dash_settings_v1";

interface Ctx { settings: Settings; update: (p: Partial<Settings>) => void; setModule: (k: keyof Settings["modules"], p: Partial<{ active: boolean; sidebar: boolean }>) => void; reset: () => void }
const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw) as Partial<Settings>; setSettings({ ...DEFAULTS, ...p, modules: { ...DEFAULTS.modules, ...(p.modules || {}) } }); } } catch {}
  }, []);
  const save = useCallback((next: Settings) => { setSettings(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} }, []);
  const value = useMemo<Ctx>(() => ({
    settings,
    update: (p) => save({ ...settings, ...p }),
    setModule: (k, p) => save({ ...settings, modules: { ...settings.modules, [k]: { ...settings.modules[k], ...p } } }),
    reset: () => save(DEFAULTS),
  }), [settings, save]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}
export function useSettings() { const c = useContext(SettingsCtx); if (!c) throw new Error("SettingsProvider missing"); return c; }

interface DataValue { data: Dataset | null; error: boolean; sim: SimStore; simulate: (s: SimStore) => void; clearSim: () => void }
const DataCtx = createContext<DataValue>({ data: null, error: false, sim: EMPTY_SIM, simulate: () => {}, clearSim: () => {} });
const SIM_KEY = "nc_sim_v1";
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [base, setBase] = useState<Dataset | null>(null);
  const [error, setError] = useState(false);
  const [sim, setSim] = useState<SimStore>(EMPTY_SIM);
  useEffect(() => { fetch("/api/data").then((r) => (r.ok ? r.json() : Promise.reject())).then(setBase).catch(() => setError(true)); }, []);
  useEffect(() => { try { const raw = localStorage.getItem(SIM_KEY); if (raw) setSim({ ...EMPTY_SIM, ...JSON.parse(raw) }); } catch {} }, []);
  const persist = (n: SimStore) => { setSim(n); try { localStorage.setItem(SIM_KEY, JSON.stringify(n)); } catch {} };
  const { settings } = useSettings();
  const data = useMemo(() => {
    if (!base) return null;
    const all = withSim(base, sim);
    if (settings.location === "all") return all;
    const keep = (a: string) => locationOf(a) === settings.location;
    return { ...all, calls: all.calls.filter((c) => keep(c.address)), leads: all.leads.filter((l) => keep(l.address)), jobs: all.jobs.filter((j) => keep(j.address)) };
  }, [base, sim, settings.location]);
  const value = useMemo<DataValue>(() => ({ data, error, sim, simulate: (s) => persist(mergeSim(sim, s)), clearSim: () => persist(EMPTY_SIM) }), [data, error, sim]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
export const useData = () => useContext(DataCtx);
