import { CashFlowTrendChart, SpendBreakdownChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { getCashFlow, getSafeToSpend } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default async function CashFlowPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [cashFlow, safe] = await Promise.all([getCashFlow(personaId), getSafeToSpend(personaId)]);

  return (
    <PageFrame pathname="/app/cash-flow" personaId={personaId}>
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Monthly income" value={formatCurrency(cashFlow.monthly_income)} tone="success" />
        <MetricCard label="Monthly spending" value={formatCurrency(cashFlow.monthly_spending)} tone="warning" />
        <MetricCard label="Fixed expenses" value={formatCurrency(cashFlow.monthly_fixed_expenses)} />
        <MetricCard label="Forecasted month-end balance" value={formatCurrency(cashFlow.forecasted_month_end_balance)} tone="primary" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard eyebrow="Trend" title="Income vs spending over time" description="The goal is to make month-end direction obvious at a glance.">
          <CashFlowTrendChart data={cashFlow.monthly_series} />
        </SectionCard>
        <SectionCard eyebrow="Velocity" title="Spending pace" description="Current discretionary pace is compared against remaining room before payday.">
          <div className="space-y-4">
            <MetricCard label="Discretionary spending" value={formatCurrency(cashFlow.discretionary_spending)} />
            <MetricCard label="Safe to Spend this week" value={formatCurrency(safe.safe_to_spend_this_week)} tone="primary" />
            <div className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm leading-7 text-[var(--pa-text-muted)]">
              {safe.guidance_summary}
            </div>
          </div>
        </SectionCard>
      </section>
      <SectionCard eyebrow="Breakdown" title="Fixed vs variable expense mix">
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
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
