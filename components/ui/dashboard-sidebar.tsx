"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Editable } from "@/components/ui/editable";
import { AgentIcon } from "@/components/agent-icon";
import { cn } from "@/lib/utils";

export type NavItemData = {
  id: string;
  title: string;
  icon?: React.ElementType;
  href?: string;
  badge?: number | string;
  orb?: string; // agent color: renders a live orb instead of an icon
  onClick?: () => void;
};
export type NavGroupData = { heading?: string; items: NavItemData[] };

function NavItem({ item, activeId }: { item: NavItemData; activeId: string }) {
  const active = activeId === item.id;
  const inner = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        {item.orb ? (
          <span className="flex h-4 w-4 items-center justify-center overflow-visible"><AgentIcon color={item.orb} size={20} bob={false} /></span>
        ) : item.icon ? (
          <item.icon className={cn("size-4 shrink-0 transition-colors", active ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground/70")} strokeWidth={1.5} />
        ) : null}
        <span className="truncate text-[13px] tracking-wide">{item.title}</span>
      </div>
      {item.badge != null && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 text-[10px] font-medium tnum">{item.badge}</span>}
    </>
  );
  const cls = cn("group flex w-full select-none items-center justify-between rounded-md px-2.5 py-[7px] text-left transition-all duration-200", active ? "bg-foreground/10 font-medium text-foreground" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground/90");
  return item.href ? <Link href={item.href} className={cls}>{inner}</Link> : <button onClick={item.onClick} className={cls}>{inner}</button>;
}

export function SidebarNav({ className = "", groups, bottom, activeId, businessName, plan, onBusinessName, onPlan, onAdminHint }: {
  className?: string; groups: NavGroupData[]; bottom: NavItemData[]; activeId: string;
  businessName: string; plan: string; onBusinessName: (v: string) => void; onPlan: (v: string) => void; onAdminHint?: () => void;
}) {
  return (
    <div className={cn("flex h-full w-[260px] flex-col border-r border-border bg-card/50 p-3", className)}>
      <div className="mb-4 flex items-center gap-3 px-2 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground shadow-sm">{businessName.charAt(0)}</div>
        <div className="flex min-w-0 flex-col">
          <Editable value={businessName} onSave={onBusinessName} className="mb-1 block truncate text-[13px] font-medium leading-none" />
          <Editable value={plan} onSave={onPlan} className="block truncate text-[11px] leading-none text-muted-foreground" />
        </div>
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground/30" strokeWidth={1.5} onClick={onAdminHint} />
      </div>
      <div className="no-scrollbar mt-1 flex flex-1 flex-col gap-4 overflow-y-auto">
        {groups.map((g, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {g.heading && <span className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">{g.heading}</span>}
            {g.items.map((it) => <NavItem key={it.id} item={it} activeId={activeId} />)}
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">{bottom.map((it) => <NavItem key={it.id} item={it} activeId={activeId} />)}</div>
    </div>
  );
}
