import Link from "next/link";
import { ArrowUpRight, WalletCards } from "lucide-react";

import { formatCurrency } from "@/lib/format";

import { ExpandableNote } from "./expandable-note";
import { StatusPill } from "./status-pill";
import type { DashboardCoachPresentation } from "@/lib/dashboard-presentation";

export function ActionSpotlight({
  badge,
  badgeTone,
  headline,
  summary,
  amountLabel,
  amountValue,
  amountDetail,
  contextLabel,
  contextValue,
  detailSummary,
  detail,
  plannerHref,
  plannerLabel
}: DashboardCoachPresentation) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[rgba(18,32,43,0.14)] bg-[linear-gradient(135deg,rgba(19,36,47,0.98),rgba(18,32,43,0.92)_58%,rgba(31,116,104,0.85))] px-5 py-5 text-white shadow-[0_28px_64px_rgba(8,15,22,0.22)] md:rounded-[32px] md:px-7 md:py-6">
      <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[rgba(183,139,66,0.22)] blur-3xl" />
      <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-[rgba(255,255,255,0.08)] blur-3xl" />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_320px] lg:items-start">
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Main action</p>
            <StatusPill tone={badgeTone}>{badge}</StatusPill>
          </div>
          <div className="space-y-2">
            <h2 className="max-w-3xl text-balance font-display text-[2rem] font-semibold leading-tight text-white md:text-[2.25rem]">
              {headline}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-white/74 md:text-[0.98rem] md:leading-7">{summary}</p>
          </div>
          <ExpandableNote
            className="max-w-3xl"
            detail={
              <div className="space-y-3">
                {detail.map((item, index) => (
                  <p key={`${index}-${item}`}>{item}</p>
                ))}
              </div>
            }
            label="Why this is first"
            summary={detailSummary}
          />
        </div>

        <div className="rounded-[24px] border border-white/12 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur md:rounded-[28px] md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">{amountLabel}</p>
              <p className="mt-3 font-display text-[2.75rem] font-semibold leading-none tabular-nums text-white md:text-4xl">
                {formatCurrency(amountValue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-black/10 p-3 text-[var(--pa-accent)]">
              {amountValue > contextValue ? <ArrowUpRight aria-hidden="true" className="h-5 w-5" /> : <WalletCards aria-hidden="true" className="h-5 w-5" />}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/68">{amountDetail}</p>
          <div className="mt-5 rounded-[20px] border border-white/10 bg-black/10 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/46">{contextLabel}</p>
            <p className="mt-2 text-sm text-white/74">{formatCurrency(contextValue)}</p>
          </div>
          <Link
            href={plannerHref}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {plannerLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
