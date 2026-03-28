import { DebtStrategyGrid } from "@/components/debt-strategy-grid";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { getCreditSummary, getDebtStrategies } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function DebtOptimizerPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, debt, credit] = await Promise.all([getPageFramePersonas(), getDebtStrategies(personaId), getCreditSummary(personaId)]);

  return (
    <PageFrame pathname="/app/debt-optimizer" personaId={personaId} personas={personas}>
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Recommended strategy" value={debt.recommended_strategy.replaceAll("_", " ")} tone="primary" detail={debt.rationale} />
        <MetricCard label="Utilization pressure" value={formatPercent(credit.utilization_pressure)} tone={credit.utilization_pressure > 0.7 ? "warning" : "success"} />
        <MetricCard label="Credit trend" value={credit.trend_label} detail={credit.payment_behavior} />
      </section>
      <DebtStrategyGrid debt={debt} />
      <SectionCard eyebrow="Accounts" title="Connected revolving accounts">
        <div className="grid gap-4 xl:grid-cols-2">
          {credit.cards.map((card) => (
            <div key={card.id} className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">{card.sanitized_name}</p>
                  <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">{card.display_name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--pa-text-muted)]">Current balance</p>
                  <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(card.current_balance)}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MetricCard label="Minimum" value={formatCurrency(card.minimum_payment ?? 0)} />
                <MetricCard label="Limit" value={formatCurrency(card.credit_limit ?? 0)} />
                <MetricCard label="Utilization" value={formatPercent(card.utilization_estimate ?? 0)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
