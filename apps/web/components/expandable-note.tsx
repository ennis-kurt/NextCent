import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function ExpandableNote({
  summary,
  detail,
  label = "Key idea",
  tone = "default",
  className
}: {
  summary: ReactNode;
  detail: ReactNode;
  label?: string;
  tone?: "default" | "inverted";
  className?: string;
}) {
  const inverted = tone === "inverted";

  return (
    <details
      className={cn(
        "group overflow-hidden rounded-[22px] border transition-[border-color,background-color,box-shadow] duration-200",
        inverted
          ? "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] group-open:border-white/16 group-open:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]"
          : "border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,239,226,0.82))] shadow-[var(--pa-shadow-sm)] group-open:border-[rgba(31,116,104,0.18)] group-open:shadow-[0_14px_26px_rgba(8,15,22,0.06)]",
        className
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3.5 text-left transition-[color,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-inset [&::-webkit-details-marker]:hidden",
          inverted
            ? "text-white/78 hover:bg-white/[0.04]"
            : "text-[var(--pa-text-muted)] hover:bg-white/55"
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                inverted ? "bg-[var(--pa-accent)]" : "bg-[var(--pa-primary)]"
              )}
            />
            <span
              className={cn(
                "text-[11px] font-medium uppercase tracking-[0.18em]",
                inverted ? "text-white/46" : "text-[var(--pa-text-soft)]"
              )}
            >
              {label}
            </span>
          </div>
          <p
            className={cn(
              "mt-2 text-sm leading-6",
              inverted ? "text-white/82" : "text-[var(--pa-text)]"
            )}
          >
            {summary}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]",
            inverted ? "bg-white/8 text-white/58" : "bg-white text-[var(--pa-text-soft)]"
          )}
        >
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Close</span>
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="px-4 pb-4">
        <div
          className={cn(
            "rounded-[18px] border px-4 py-3 text-sm leading-6",
            inverted
              ? "border-white/8 bg-black/10 text-white/62"
              : "border-[rgba(15,23,32,0.08)] bg-white/72 text-[var(--pa-text-muted)]"
          )}
        >
          {detail}
        </div>
      </div>
    </details>
  );
}
