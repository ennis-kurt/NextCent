import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { getCreditSummary } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export default async function CreditHealthPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "credit-score-pressure";
  const [personas, credit] = await Promise.all([getPageFramePersonas(), getCreditSummary(personaId)]);
  const nextDueCard = [...credit.cards]
    .filter((card) => card.due_date)
    .sort((left, right) => new Date(left.due_date ?? "").getTime() - new Date(right.due_date ?? "").getTime())[0];

  return (
    <PageFrame pathname="/app/credit-health" personaId={personaId} personas={personas}>
      <SectionCard
        eyebrow="Next Due"
        title={nextDueCard ? `${nextDueCard.display_name} is the next payment to watch.` : "Payment timing data is limited."}
        description={
          nextDueCard
            ? `Minimum due ${formatCurrency(nextDueCard.minimum_payment ?? 0)} on ${formatDate(nextDueCard.due_date)}.`
            : "Use the per-card details below to review due dates and minimums when they become available."
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Due date"
            value={nextDueCard?.due_date ? formatDate(nextDueCard.due_date) : "Unavailable"}
            tone={nextDueCard ? "warning" : "default"}
          />
          <MetricCard
            label="Minimum due"
            value={formatCurrency(nextDueCard?.minimum_payment ?? 0)}
            tone={nextDueCard && (nextDueCard.minimum_payment ?? 0) > 0 ? "primary" : "default"}
          />
          <MetricCard label="Payment posture" value={credit.payment_behavior} detail="This uses seeded recent-history behavior, not live bureau reporting." />
        </div>
      </SectionCard>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Current score" value={credit.score_available ? `${credit.current_score}` : "Unavailable"} tone="primary" />
        <MetricCard label="Utilization pressure" value={formatPercent(credit.utilization_pressure)} tone={credit.utilization_pressure > 0.7 ? "warning" : "success"} />
        <MetricCard label="Trend" value={credit.trend_label} />
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
              <div className="grid gap-4 xl:grid-cols-6">
                <div className="rounded-[24px] border border-[var(--pa-border)] bg-white/82 p-5 xl:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{card.sanitized_name}</p>
                  <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">{card.display_name}</h3>
                  <p className="mt-3 text-sm text-[var(--pa-text-muted)]">
                    Due {card.due_date ? formatDate(card.due_date) : "date unavailable"}
                  </p>
                </div>
                <MetricCard label="Balance" value={formatCurrency(card.current_balance)} />
                <MetricCard label="Limit" value={formatCurrency(card.credit_limit ?? 0)} />
                <MetricCard label="Utilization" value={formatPercent(card.utilization_estimate ?? 0)} tone={(card.utilization_estimate ?? 0) > 0.75 ? "warning" : "success"} />
                <MetricCard label="Minimum due" value={formatCurrency(card.minimum_payment ?? 0)} tone={(card.minimum_payment ?? 0) > 0 ? "primary" : "default"} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
