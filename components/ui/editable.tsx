"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Click the text to rename it. No pencil, no border: it only turns into an input while you're typing. */
export function Editable({ value, onSave, className, placeholder = "Click to add", multiline = false }: {
  value: string; onSave: (v: string) => void; className?: string; placeholder?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select(); } }, [editing]);

  function commit() { setEditing(false); const v = draft.trim(); if (v && v !== value) onSave(v); else setDraft(value); }
  if (!editing)
    return <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setEditing(true); }} onKeyDown={(e) => { if (e.key === "Enter") setEditing(true); }} className={cn("cursor-text rounded-sm outline-none focus-visible:ring-1 focus-visible:ring-ring", !value && "text-muted-foreground/60", className)}>{value || placeholder}</span>;
  const common = {
    ref, value: draft, onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => setDraft(e.target.value), onBlur: commit, onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" && !(multiline && e.shiftKey)) { e.preventDefault(); commit(); } if (e.key === "Escape") { setDraft(value); setEditing(false); } },
    className: cn("w-full rounded-sm bg-foreground/[0.06] px-1 -mx-1 outline-none ring-1 ring-foreground/20", className),
  };
  return multiline ? <textarea rows={2} {...common} /> : <input {...common} />;
}
