import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { getMonthlyReviews } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency } from "@/lib/format";

export default async function MonthlyReviewPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "recovering-after-cutting-expenses";
  const [personas, reviews] = await Promise.all([getPageFramePersonas(), getMonthlyReviews(personaId)]);
  const [review] = reviews;

  return (
    <PageFrame pathname="/app/monthly-review" personaId={personaId} personas={personas}>
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Income" value={formatCurrency(review.income)} tone="success" />
        <MetricCard label="Spending" value={formatCurrency(review.total_spending)} tone="warning" />
        <MetricCard label="Fees + interest" value={formatCurrency(review.fees_and_interest_paid)} tone={review.fees_and_interest_paid > 50 ? "warning" : "default"} />
        <MetricCard label="Debt progress" value={review.debt_progress} />
      </section>
      <SectionCard eyebrow="Reflection" title="What improved and what still needs work">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-success-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Improved</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              {review.improved.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-warning-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Worsened</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              {review.worsened.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>
      <SectionCard eyebrow="Next Month" title="Action plan">
        <div className="space-y-3">
          {review.next_month_actions.map((action) => (
            <div key={action} className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm text-[var(--pa-text-muted)]">
              {action}
            </div>
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
