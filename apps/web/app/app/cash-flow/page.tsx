import { ArrowDownCircle, ArrowUpCircle, CalendarClock, Wallet } from "lucide-react";

import { BalanceHistoryChart, CashFlowTrendChart, SpendBreakdownChart } from "@/components/charts";
import { ExpandableNote } from "@/components/expandable-note";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getCashFlow, getSafeToSpend } from "@/lib/api";
import { buildCashFlowEvents, buildCashFlowStatus, buildLowPointSummary } from "@/lib/cash-flow-presentation";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";
import { getPageFramePersonas } from "@/lib/page-data";

function lowPointTone(value: number): "danger" | "warning" | "success" {
  if (value <= 0) return "danger";
  if (value < 500) return "warning";
  return "success";
}

export default async function CashFlowPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, cashFlow, safe] = await Promise.all([getPageFramePersonas(), getCashFlow(personaId), getSafeToSpend(personaId)]);

  const endingBalanceSeries = cashFlow.ending_balance_series ?? [];
  const upcomingEvents = cashFlow.upcoming_events ?? [];
  const status = buildCashFlowStatus(safe);
  const lowPoint = buildLowPointSummary({
    cashFlow: {
      ...cashFlow,
      ending_balance_series: endingBalanceSeries,
      upcoming_events: upcomingEvents
    },
    safe
  });
  const events = buildCashFlowEvents(upcomingEvents);
  const nextPayday = String(cashFlow.paycheck_to_paycheck_view.next_payday ?? "");
  const lowPointDate = String(cashFlow.paycheck_to_paycheck_view.lowest_projected_balance_date ?? "");
  const lowPointBalance = Number(cashFlow.paycheck_to_paycheck_view.lowest_projected_balance ?? 0);
  const totalUpcomingObligations = Number(cashFlow.paycheck_to_paycheck_view.total_upcoming_obligations ?? 0);
  const totalExpectedIncome = Number(cashFlow.paycheck_to_paycheck_view.total_expected_income ?? 0);
  const topCategories = cashFlow.category_breakdown.slice(0, 4);

  return (
    <PageFrame pathname="/app/cash-flow" personaId={personaId} personas={personas}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Next payday"
          value={formatDate(nextPayday)}
          tone="primary"
          detail="The next expected reset point based on recent income cadence."
          icon={<CalendarClock className="h-5 w-5" />}
        />
        <MetricCard
          label="Tightest day"
          value={formatDate(lowPointDate)}
          tone={status.tone === "urgent" ? "danger" : status.tone === "important" ? "warning" : "success"}
          detail={lowPoint.title}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          label="Lowest projected cash"
          value={formatCurrency(lowPointBalance)}
          tone={lowPointTone(lowPointBalance)}
          detail="This is the lowest projected checking point across the next scheduled inflows and obligations."
          icon={<ArrowDownCircle className="h-5 w-5" />}
        />
        <MetricCard
          label="Money left this week"
          value={formatCurrency(safe.safe_to_spend_this_week)}
          tone="success"
          detail={status.summary}
          icon={<ArrowUpCircle className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:gap-6">
        <SectionCard
          eyebrow="Before next payday"
          title="Where the squeeze actually shows up"
          description={lowPoint.summary}
          descriptionLabel="Why this matters"
          descriptionDetail="Monthly totals can look fine while one cluster of bills creates a short-term squeeze. This section shows the tightest point before the next pay reset."
        >
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Cycle status</p>
                <p className="mt-2 font-display text-[1.55rem] leading-tight text-[var(--pa-text)]">{lowPoint.title}</p>
                <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">{safe.guidance_summary}</p>
              </div>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Today" value={formatCurrency(safe.safe_to_spend_today)} tone="primary" />
              <MetricCard label="This week" value={formatCurrency(safe.safe_to_spend_this_week)} tone="primary" />
              <MetricCard label="Before payday" value={formatCurrency(safe.safe_to_spend_until_payday)} tone="primary" />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--pa-border)] bg-white/72 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Expected income before payday</p>
                <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(totalExpectedIncome)}</p>
              </div>
              <div className="rounded-[18px] border border-[var(--pa-border)] bg-white/72 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Scheduled outflows before payday</p>
                <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(totalUpcomingObligations)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-[rgba(15,23,32,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.85))] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Tightest point before the next reset</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">
                    {formatDate(lowPointDate)} is the lowest projected point in the upcoming schedule.
                  </p>
                </div>
                <p className="font-display text-[2rem] tabular-nums text-[var(--pa-text)]">{formatCurrency(lowPointBalance)}</p>
              </div>
            </div>

            <ExpandableNote
              className="mt-4"
              detail={
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: "Expected income before payday", value: formatCurrency(safe.expected_income_before_payday) },
                      { label: "Fixed bills before payday", value: formatCurrency(safe.fixed_obligations_before_payday) },
                      { label: "Risk buffer", value: formatCurrency(safe.risk_buffer) },
                      { label: "Savings floor", value: formatCurrency(safe.savings_floor) }
                    ].map((item) => (
                      <div key={item.label} className="rounded-[16px] border border-[rgba(15,23,32,0.08)] bg-white/72 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{item.label}</p>
                        <p className="mt-2 font-display text-xl text-[var(--pa-text)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm leading-7 text-[var(--pa-text-muted)]">
                    The weekly number is the paced version of what is left after expected income, scheduled obligations, a risk buffer, and your savings floor are all reserved first.
                  </p>
                </div>
              }
              label="Show math"
              summary="See the deterministic inputs behind this cycle’s pacing number."
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Next 30 days"
          title="Upcoming money calendar"
          description="Expected pay, bills, debt dues, and planned savings moves in date order."
        >
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={event.tone === "default" ? "default" : event.tone}>{event.kindLabel}</StatusPill>
                    <p className="text-sm text-[var(--pa-text-muted)]">{formatDate(event.date)}</p>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-[var(--pa-text)]">{titleCase(event.label)}</p>
                </div>
                <p className={`font-display text-[1.4rem] tabular-nums ${event.direction === "in" ? "text-[var(--pa-success)]" : "text-[var(--pa-text)]"}`}>
                  {event.direction === "in" ? "+" : "-"}
                  {formatCurrency(event.amount)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr] xl:gap-6">
        <SectionCard
          eyebrow="Cash path"
          title="Ending cash over the last 12 months"
          description="Checking and savings are combined here so seasonal pressure and recovery are easier to see."
        >
          <BalanceHistoryChart
            ariaLabel="Area chart showing combined checking and savings ending balances over the last 12 months."
                  data={endingBalanceSeries}
                />
              </SectionCard>

        <SectionCard
          eyebrow="Monthly pattern"
          title="Income and spending by month"
          description="Use this view to tell whether the issue is timing, total spending, or both."
        >
          <CashFlowTrendChart data={cashFlow.monthly_series} />
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Top spending categories"
        title="Where the month is going"
        description="Current category totals, with baseline drift where the seeded history supports it."
      >
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr] xl:gap-6">
          <SpendBreakdownChart data={cashFlow.category_breakdown} />
          <div className="space-y-3">
            {topCategories.map((item) => (
              <div key={item.category_key} className="rounded-[22px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--pa-text)]">{item.label}</p>
                    <p className="mt-1 text-sm text-[var(--pa-text-muted)]">
                      {item.trend_vs_baseline !== null
                        ? `${item.trend_vs_baseline.toFixed(0)}% vs your recent baseline`
                        : "Recent baseline not available yet"}
                    </p>
                  </div>
                  <p className="font-display text-xl text-[var(--pa-text)]">{formatCurrency(item.amount)}</p>
                </div>
                <div className="mt-4 h-2 rounded-full bg-[rgba(15,23,32,0.08)]">
                  <div
                    className="h-2 rounded-full bg-[var(--pa-primary)]"
                    style={{ width: `${Math.max(10, Math.min(100, item.share * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </PageFrame>
  );
}
