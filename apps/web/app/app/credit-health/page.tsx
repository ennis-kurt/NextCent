import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { getCreditSummary } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function CreditHealthPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "credit-score-pressure";
  const [personas, credit] = await Promise.all([getPageFramePersonas(), getCreditSummary(personaId)]);

  return (
    <PageFrame pathname="/app/credit-health" personaId={personaId} personas={personas}>
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Current score" value={credit.score_available ? `${credit.current_score}` : "Unavailable"} tone="primary" />
        <MetricCard label="Utilization pressure" value={formatPercent(credit.utilization_pressure)} tone={credit.utilization_pressure > 0.7 ? "warning" : "success"} />
        <MetricCard label="Trend" value={credit.trend_label} />
        <MetricCard label="Payment behavior" value="Current" detail={credit.payment_behavior} />
      </section>
      <SectionCard eyebrow="Drivers" title="What is pressuring credit health right now">
        <div className="grid gap-4 xl:grid-cols-3">
          {credit.actionable_suggestions.map((suggestion) => (
            <div key={suggestion} className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 text-sm leading-7 text-[var(--pa-text-muted)]">
              {suggestion}
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard eyebrow="Card detail" title="Utilization and payment context by card">
        <div className="space-y-4">
          {credit.cards.map((card) => (
            <div key={card.id} className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Card" value={card.sanitized_name} detail={card.display_name} />
                <MetricCard label="Balance" value={formatCurrency(card.current_balance)} />
                <MetricCard label="Limit" value={formatCurrency(card.credit_limit ?? 0)} />
                <MetricCard label="Utilization" value={formatPercent(card.utilization_estimate ?? 0)} tone={(card.utilization_estimate ?? 0) > 0.75 ? "warning" : "success"} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
