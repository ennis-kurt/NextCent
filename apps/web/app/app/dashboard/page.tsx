import Link from "next/link";
import { AlertTriangle, ArrowDownCircle, ArrowUpRight, BadgeDollarSign, Shield } from "lucide-react";

import { ActionSpotlight } from "@/components/action-spotlight";
import { DashboardFocusCard } from "@/components/dashboard-focus-card";
import { ExpandableNote } from "@/components/expandable-note";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getCreditSummary, getDashboard, getDebtStrategies } from "@/lib/api";
import {
  buildDashboardCoachPresentation,
  buildDashboardFocusCards,
  buildDashboardRunwayPresentation,
  buildDashboardWatchList
} from "@/lib/dashboard-presentation";
import { resolveInvestmentGuidance } from "@/lib/investment";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

const watchToneStyles = {
  safe: "border-[rgba(31,138,92,0.16)] bg-[var(--pa-success-soft)] text-[var(--pa-success)]",
  important: "border-[rgba(180,107,24,0.16)] bg-[var(--pa-warning-soft)] text-[var(--pa-warning)]",
  urgent: "border-[rgba(179,71,71,0.18)] bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]"
};

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, dashboard, debt, credit] = await Promise.all([
    getPageFramePersonas(),
    getDashboard(personaId),
    getDebtStrategies(personaId),
    getCreditSummary(personaId)
  ]);
  const { guidance: investment } = resolveInvestmentGuidance({
    dashboard,
    debt
  });

  const coach = buildDashboardCoachPresentation({
    personaId,
    dashboard,
    debt,
    credit,
    investment
  });
  const runway = buildDashboardRunwayPresentation(dashboard.safe_to_spend);
  const focusCards = buildDashboardFocusCards({
    personaId,
    dashboard,
    debt,
    credit,
    investment
  });
  const watchList = buildDashboardWatchList({
    personaId,
    risks: dashboard.risks
  });

  return (
    <PageFrame pathname="/app/dashboard" personaId={personaId} personas={personas}>
      <ActionSpotlight {...coach} />

      <SectionCard
        eyebrow="Money left to use"
        title="Money left this week"
        description={runway.summary}
        descriptionLabel="How this works"
        descriptionDetail="This number changes with bills, debt minimums, incoming pay, and how quickly you are spending. It is a pacing tool, not a permanent budget."
      >
        <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--pa-text-soft)]">Weekly pace</p>
            <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">{dashboard.safe_to_spend.guidance_summary}</p>
          </div>
          <StatusPill tone={runway.tone}>{runway.status}</StatusPill>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
          <MetricCard label="Today" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_today)} tone="primary" />
          <MetricCard label="This week" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)} tone="primary" />
          <MetricCard label="Before payday" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_until_payday)} tone="primary" />
        </div>

        <div className="mt-5 rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,239,226,0.86))] p-5">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--pa-text-muted)]">
            <span>Projected low date: {formatDate(dashboard.safe_to_spend.projected_zero_date)}</span>
            <span>Risk buffer: {formatCurrency(dashboard.safe_to_spend.risk_buffer)}</span>
            <span>Savings floor: {formatCurrency(dashboard.safe_to_spend.savings_floor)}</span>
          </div>
          <ExpandableNote
            className="mt-4"
            detail={
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      label: "Expected income before payday",
                      value: formatCurrency(dashboard.safe_to_spend.expected_income_before_payday)
                    },
                    {
                      label: "Fixed bills before payday",
                      value: formatCurrency(dashboard.safe_to_spend.fixed_obligations_before_payday)
                    },
                    {
                      label: "Risk buffer",
                      value: formatCurrency(dashboard.safe_to_spend.risk_buffer)
                    },
                    {
                      label: "Savings floor",
                      value: formatCurrency(dashboard.safe_to_spend.savings_floor)
                    }
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[16px] border border-[rgba(15,23,32,0.08)] bg-white/72 px-4 py-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{item.label}</p>
                      <p className="mt-2 font-display text-xl tabular-nums text-[var(--pa-text)]">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[18px] border border-[rgba(15,23,32,0.1)] bg-[var(--pa-primary-soft)]/45 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Money left before payday</p>
                    <p className="font-display text-2xl tabular-nums text-[var(--pa-text)]">
                      {formatCurrency(dashboard.safe_to_spend.safe_to_spend_until_payday)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">
                    The weekly number is the paced version of this remaining room.
                  </p>
                </div>
              </div>
            }
            label="Show math"
            summary={runway.mathSummary}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="At a glance"
        title="Your money picture today"
        description="The four numbers that tell you how much room you have, what you owe, and how healthy the overall picture looks."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Cash on hand"
            value={formatCurrency(dashboard.balance_summary.total_cash)}
            tone="success"
            detail="Checking and savings modeled as liquid cash."
            icon={<BadgeDollarSign className="h-5 w-5" />}
          />
          <MetricCard
            label="Debt balance"
            value={formatCurrency(dashboard.balance_summary.total_debt)}
            tone="warning"
            detail="Revolving credit balances currently modeled."
            icon={<ArrowDownCircle className="h-5 w-5" />}
          />
          <MetricCard
            label="Left over each month"
            value={formatCurrency(dashboard.net_monthly_cash_flow)}
            tone={dashboard.net_monthly_cash_flow >= 0 ? "primary" : "danger"}
            detail="Trailing monthly inflow minus tracked spending."
            icon={<ArrowUpRight className="h-5 w-5" />}
          />
          <MetricCard
            label="Overall money health"
            value={`${formatNumber(dashboard.financial_health.overall_score)}/100`}
            tone="primary"
            detail="Internal product score. Not a regulated credit score."
            icon={<Shield className="h-5 w-5" />}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Where to focus next"
        title="The next areas worth a closer look"
        description="Start with the main action above, then use these cards to see which part of your money picture deserves attention next."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {focusCards.map((card) => (
            <DashboardFocusCard key={card.key} card={card} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Watch next"
        title="What can wait, and what should not"
        description={
          watchList.length > 0
            ? "Only the next few signals that could create pressure soon."
            : "No urgent watch items are active in this seeded scenario."
        }
      >
        {watchList.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {watchList.map((risk) => (
              <Link
                key={risk.id}
                href={risk.href}
                className="group rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-3">
                    <StatusPill tone={risk.tone}>{risk.tone === "safe" ? "Keep an eye on this" : risk.tone === "important" ? "Watch soon" : "Needs attention"}</StatusPill>
                    <h3 className="font-display text-[1.2rem] font-semibold text-[var(--pa-text)]">{risk.title}</h3>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${watchToneStyles[risk.tone]}`}>
                    {risk.cta.replace("Open ", "")}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--pa-text-muted)]">{risk.summary}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--pa-border)] bg-[var(--pa-surface)] p-8 text-center">
            <AlertTriangle className="mx-auto h-5 w-5 text-[var(--pa-text-soft)]" />
            <p className="mt-3 text-sm text-[var(--pa-text-muted)]">Nothing urgent stands out right now. You can keep following the main action and weekly pace.</p>
          </div>
        )}
      </SectionCard>
    </PageFrame>
  );
}
