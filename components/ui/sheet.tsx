"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({ open, onOpenChange, title, description, children, width = "max-w-md", side = "right" }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode; width?: string; side?: "right" | "center";
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col border border-border bg-popover shadow-2xl outline-none",
            side === "right"
              ? cn("inset-y-0 right-0 w-full border-y-0 border-r-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300", width)
              : cn("left-1/2 top-1/2 max-h-[88dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", width)
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-[15px] font-medium tracking-tight">{title}</Dialog.Title>
              <Dialog.Description className={cn("mt-0.5 text-xs text-muted-foreground", !description && "sr-only")}>{description || title}</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1.5 text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground" aria-label="Close"><X className="size-4" strokeWidth={1.5} /></Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
