import { ArrowDownCircle, ArrowUpCircle, CalendarCheck2, WalletCards } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getMonthlyReviews } from "@/lib/api";
import { formatCurrency, formatMonthYear } from "@/lib/format";
import { getPageFramePersonas } from "@/lib/page-data";

export default async function MonthlyReviewPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "recovering-after-cutting-expenses";
  const [personas, reviews] = await Promise.all([getPageFramePersonas(), getMonthlyReviews(personaId)]);
  const [review] = reviews;

  if (!review) {
    return (
      <PageFrame pathname="/app/monthly-review" personaId={personaId} personas={personas}>
        <SectionCard
          eyebrow="Monthly review"
          title="A month-end wrap-up will appear when there is enough finished cycle data."
          description="This page stays empty by design until the app has a full month worth summarizing."
        >
          <div className="rounded-[24px] border border-dashed border-[var(--pa-border)] bg-[var(--pa-surface)] p-8 text-center text-sm leading-7 text-[var(--pa-text-muted)]">
            There is not a finished month-end story for this persona yet, so the product is holding back a review instead of filling the page with weak guesses.
          </div>
        </SectionCard>
      </PageFrame>
    );
  }

  return (
    <PageFrame pathname="/app/monthly-review" personaId={personaId} personas={personas}>
      <section className="rounded-[28px] border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-md)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Month-end wrap-up</p>
              <StatusPill tone="safe">{formatMonthYear(review.month_start)}</StatusPill>
            </div>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-[var(--pa-text)] md:text-[2.2rem]">
              The short version of last month.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">{review.summary}</p>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-white/84 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Debt progress</p>
            <p className="mt-2 max-w-[16rem] text-sm font-semibold leading-6 text-[var(--pa-text)]">{review.debt_progress}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<ArrowUpCircle className="h-5 w-5" />} label="Money in" tone="success" value={formatCurrency(review.income)} />
          <MetricCard icon={<ArrowDownCircle className="h-5 w-5" />} label="Money out" tone="warning" value={formatCurrency(review.total_spending)} />
          <MetricCard
            detail="Fees and interest already paid during the month."
            icon={<WalletCards className="h-5 w-5" />}
            label="Avoidable drag"
            tone={review.fees_and_interest_paid > 50 ? "warning" : "default"}
            value={formatCurrency(review.fees_and_interest_paid)}
          />
          <MetricCard icon={<CalendarCheck2 className="h-5 w-5" />} label="Next month focus" tone="primary" value={review.next_month_actions[0] ?? "Stay steady"} />
        </div>
      </section>

      <SectionCard
        eyebrow="What changed"
        title="What got better and what still needs work"
        description="This is the simple scorecard from the last finished month."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[24px] border border-[rgba(31,138,92,0.16)] bg-[var(--pa-success-soft)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-[1.2rem] text-[var(--pa-text)]">What improved</h3>
              <StatusPill tone="safe">{review.improved.length > 0 ? "Keep" : "Steady"}</StatusPill>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              {review.improved.length > 0 ? review.improved.map((item) => <li key={item}>{item}</li>) : <li>No major improvements were recorded in the current summary.</li>}
            </ul>
          </div>

          <div className="rounded-[24px] border border-[rgba(183,139,66,0.18)] bg-[var(--pa-warning-soft)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-[1.2rem] text-[var(--pa-text)]">What needs attention</h3>
              <StatusPill tone={review.worsened.length > 0 ? "important" : "safe"}>{review.worsened.length > 0 ? "Watch" : "Calm"}</StatusPill>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              {review.worsened.length > 0 ? review.worsened.map((item) => <li key={item}>{item}</li>) : <li>No major problem areas were flagged in this month-end summary.</li>}
            </ul>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Next month"
        title="What to do next"
        description="Use this as the starting checklist for the next cycle."
      >
        <div className="space-y-3">
          {review.next_month_actions.map((action, index) => (
            <div key={action} className="rounded-[22px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Step {index + 1}</p>
              <p className="mt-2 text-sm leading-7 text-[var(--pa-text)]">{action}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
