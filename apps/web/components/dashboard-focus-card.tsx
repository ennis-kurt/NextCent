import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { DashboardFocusCardPresentation } from "@/lib/dashboard-presentation";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const toneStyles = {
  default: {
    surface: "bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.92))]",
    border: "border-[var(--pa-border)]",
    accent: "bg-[rgba(18,32,43,0.7)]"
  },
  primary: {
    surface: "bg-[linear-gradient(180deg,rgba(223,241,235,0.88),rgba(255,255,255,0.96))]",
    border: "border-[rgba(31,116,104,0.18)]",
    accent: "bg-[var(--pa-primary)]"
  },
  warning: {
    surface: "bg-[linear-gradient(180deg,rgba(248,234,215,0.95),rgba(255,255,255,0.96))]",
    border: "border-[rgba(183,139,66,0.22)]",
    accent: "bg-[var(--pa-warning)]"
  },
  success: {
    surface: "bg-[linear-gradient(180deg,rgba(223,244,234,0.95),rgba(255,255,255,0.96))]",
    border: "border-[rgba(31,138,92,0.18)]",
    accent: "bg-[var(--pa-success)]"
  }
};

function formatMetricValue(value: DashboardFocusCardPresentation["metricValue"]) {
  return typeof value === "number" ? formatCurrency(value) : value;
}

export function DashboardFocusCard({ card }: { card: DashboardFocusCardPresentation }) {
  return (
    <Link
      href={card.href}
      className={cn(
        "group relative block overflow-hidden rounded-[24px] border p-4 shadow-[var(--pa-shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] md:rounded-[26px] md:p-5",
        toneStyles[card.tone].surface,
        toneStyles[card.tone].border
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1.5", toneStyles[card.tone].accent)} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">{card.label}</p>
          <h3 className="mt-3 text-balance font-display text-[1.15rem] font-semibold leading-snug text-[var(--pa-text)] md:text-[1.25rem]">
            {card.title}
          </h3>
        </div>
        <div className="rounded-2xl border border-[var(--pa-border)] bg-white/80 p-2.5 text-[var(--pa-text)] shadow-[var(--pa-shadow-sm)] transition-transform duration-200 group-hover:-translate-y-0.5">
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{card.metricLabel}</p>
          <p className="mt-2 font-display text-[1.8rem] font-semibold leading-none tabular-nums text-[var(--pa-text)] md:text-[2rem]">
            {formatMetricValue(card.metricValue)}
          </p>
        </div>
        <p className="text-sm font-medium text-[var(--pa-text)]">{card.cta}</p>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--pa-text-muted)]">{card.summary}</p>

      {card.bars?.length ? (
        <div className="mt-5 space-y-3">
          {card.bars.map((bar) => (
            <div key={bar.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[var(--pa-text)]">{bar.label}</span>
                <span className="shrink-0 tabular-nums text-[var(--pa-text-muted)]">{formatCurrency(bar.amount)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/6">
                <div
                  className={cn("h-full rounded-full", toneStyles[card.tone].accent)}
                  style={{ width: `${Math.max(bar.share * 100, 8)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
