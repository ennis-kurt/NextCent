import { CashFlowTrendChart, SpendBreakdownChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getCashFlow, getSafeToSpend } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatDate, titleCase } from "@/lib/format";

function velocityTone(status: string) {
  if (status === "likely_overspend") return "urgent";
  if (status === "caution") return "important";
  return "safe";
}

export default async function CashFlowPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, cashFlow, safe] = await Promise.all([getPageFramePersonas(), getCashFlow(personaId), getSafeToSpend(personaId)]);

  return (
    <PageFrame pathname="/app/cash-flow" personaId={personaId} personas={personas}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Monthly income" value={formatCurrency(cashFlow.monthly_income)} tone="success" />
        <MetricCard label="Monthly spending" value={formatCurrency(cashFlow.monthly_spending)} tone="warning" />
        <MetricCard label="Fixed expenses" value={formatCurrency(cashFlow.monthly_fixed_expenses)} />
        <MetricCard label="Forecasted month-end balance" value={formatCurrency(cashFlow.forecasted_month_end_balance)} tone="primary" />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:gap-6">
        <SectionCard eyebrow="Trend" title="Income vs spending over time" description="The goal is to make month-end direction obvious at a glance.">
          <CashFlowTrendChart data={cashFlow.monthly_series} />
        </SectionCard>
        <SectionCard eyebrow="Before Next Payday" title="Buffer and pace before the next check" description={String(cashFlow.paycheck_to_paycheck_view.commentary ?? safe.guidance_summary)}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Next payday"
                value={cashFlow.paycheck_to_paycheck_view.next_payday ? formatDate(String(cashFlow.paycheck_to_paycheck_view.next_payday)) : "Unavailable"}
                tone="primary"
              />
              <MetricCard
                label="Buffer before payday"
                value={formatCurrency(Number(cashFlow.paycheck_to_paycheck_view.cash_buffer_before_payday ?? safe.safe_to_spend_until_payday))}
                tone="success"
              />
            </div>
            <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Spending velocity</p>
                  <p className="mt-2 font-display text-xl text-[var(--pa-text)]">
                    {titleCase(String(cashFlow.spending_velocity.status ?? safe.spending_velocity_status))}
                  </p>
                </div>
                <StatusPill tone={velocityTone(String(cashFlow.spending_velocity.status ?? safe.spending_velocity_status))}>
                  {String(cashFlow.spending_velocity.status ?? safe.spending_velocity_status).replaceAll("_", " ")}
                </StatusPill>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-[var(--pa-border)] bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Daily discretionary pace</p>
                  <p className="mt-2 font-semibold text-[var(--pa-text)]">
                    {formatCurrency(Number(cashFlow.spending_velocity.daily_discretionary_pace ?? 0))}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[var(--pa-border)] bg-white px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Projected zero date</p>
                  <p className="mt-2 font-semibold text-[var(--pa-text)]">
                    {cashFlow.spending_velocity.projected_zero_date
                      ? formatDate(String(cashFlow.spending_velocity.projected_zero_date))
                      : "Not projected"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm leading-7 text-[var(--pa-text-muted)]">
              {safe.guidance_summary}
            </div>
          </div>
        </SectionCard>
      </section>
      <SectionCard eyebrow="Categories" title="Category spend breakdown" description="Current category totals with baseline drift where available.">
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr] xl:gap-6">
          <SpendBreakdownChart data={cashFlow.category_breakdown} />
          <div className="space-y-3">
            {cashFlow.category_breakdown.map((item) => (
              <div key={item.category_key} className="flex items-center justify-between rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3">
                <div>
                  <p className="font-medium text-[var(--pa-text)]">{item.label}</p>
                  <p className="text-sm text-[var(--pa-text-muted)]">
                    {item.trend_vs_baseline !== null ? `${item.trend_vs_baseline.toFixed(0)}% vs recent baseline` : "Baseline not available"}
                  </p>
                </div>
                <p className="font-display text-xl text-[var(--pa-text)]">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </PageFrame>
  );
}
