"use client";
import Link from "next/link";
import { useData, useSettings } from "@/lib/store";
import { Loading } from "@/components/kit";
import type { Dataset, Settings } from "@/lib/types";

/** Waits for data; optionally requires a module to be switched on. */
export function Gate({ module, children }: { module?: keyof Settings["modules"]; children: (ds: Dataset) => React.ReactNode }) {
  const { data, error } = useData();
  const { settings } = useSettings();
  if (module && !settings.modules[module].active)
    return <div className="mx-auto mt-24 max-w-sm text-center"><h2 className="text-lg font-medium">Not switched on</h2><p className="mt-2 text-sm text-muted-foreground">This automation isn't running for your account yet. Ask your NorthCo contact to turn it on.</p><Link href="/dashboard" className="mt-5 inline-block text-sm underline underline-offset-4">Back to overview</Link></div>;
  if (error) return <p className="text-sm text-bad">Couldn't load your data. Refresh to try again.</p>;
  if (!data) return <Loading />;
  return <>{children(data)}</>;
}
