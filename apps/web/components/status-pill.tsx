import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatusPill({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: "default" | "urgent" | "important" | "safe";
}) {
  const styles = {
    default: "border border-[var(--pa-border)] bg-white/70 text-[var(--pa-text-muted)]",
    urgent: "border border-[rgba(179,71,71,0.18)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]",
    important: "border border-[rgba(180,107,24,0.16)] bg-[var(--pa-warning-soft)] text-[var(--pa-warning)]",
    safe: "border border-[rgba(31,138,92,0.16)] bg-[var(--pa-success-soft)] text-[var(--pa-success)]"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[var(--pa-shadow-sm)]",
        styles[tone]
      )}
    >
      {children}
    </span>
  );
}
