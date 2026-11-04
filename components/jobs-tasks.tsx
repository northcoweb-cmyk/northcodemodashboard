"use client";

import { useEffect, useState } from "react";
import TaskLists, { type TaskItem } from "@/components/ui/task-list";
import { crewFor } from "@/lib/dispatch";
import { useSettings } from "@/lib/store";
import { money } from "@/lib/stats";
import type { Dataset } from "@/lib/types";

const KEY = "nc_tasks_done_v1";
const DAY = 86400000;

/** Booked jobs as a checklist: badge = how soon, avatars = the crew that was dispatched. */
export function JobsTaskList({ ds, title = "Booked jobs", count = 6, className }: { ds: Dataset; title?: string; count?: number; className?: string }) {
  const { settings } = useSettings();
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {} }, []);
  const toggle = (id: string, v: boolean) => { const n = { ...done, [id]: v }; setDone(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {} };

  const tasks: TaskItem[] = ds.jobs.slice(0, count).map((j) => {
    const age = Math.floor((ds.now - j.at) / DAY);
    const badge = age < 1 ? { text: "Today", color: "bg-error text-white" } : age < 2 ? { text: "Yesterday", color: "bg-foreground text-background" } : { text: `${age} days ago`, color: "bg-secondary text-secondary-foreground" };
    return {
      id: j.id, title: `${j.service} · ${j.address.split(",")[0]}`, badge, done: j.status === "completed" || !!done[j.id],
      date: `${new Date(j.at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Los_Angeles" })}${j.value != null ? ` · ${money(j.value)}` : ""}`,
      avatars: settings.modules.crew.active ? crewFor(j, settings.crew).map((c) => ({ name: c.name, color: c.color })) : undefined,
    };
  });
  return <TaskLists title={title} tasks={tasks} onToggle={toggle} className={className} />;
}
