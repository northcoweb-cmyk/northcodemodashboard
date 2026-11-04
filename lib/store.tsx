"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Dataset, Settings } from "./types";

export const DEFAULTS: Settings = {
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

const DataCtx = createContext<{ data: Dataset | null; error: boolean }>({ data: null, error: false });
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { fetch("/api/data").then((r) => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setError(true)); }, []);
  return <DataCtx.Provider value={{ data, error }}>{children}</DataCtx.Provider>;
}
export const useData = () => useContext(DataCtx);
