import { CalendarClock, CircleDollarSign, Repeat, Scissors } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { SubscriptionsPanel } from "@/components/subscriptions-panel";
import { getSubscriptions } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { getPageFramePersonas } from "@/lib/page-data";

export default async function SubscriptionsPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "subscription-heavy";
  const [personas, subscriptions] = await Promise.all([getPageFramePersonas(), getSubscriptions(personaId)]);

  const totalMonthly = subscriptions.reduce((sum, item) => sum + item.monthly_amount, 0);
  const reviewFirst = [...subscriptions]
    .sort((left, right) => riskRank(right.waste_risk) - riskRank(left.waste_risk) || right.monthly_amount - left.monthly_amount)[0];
  const nextCharge = [...subscriptions]
    .sort((left, right) => new Date(left.next_expected_at).getTime() - new Date(right.next_expected_at).getTime())[0];
  const highRiskCount = subscriptions.filter((item) => item.waste_risk === "high").length;

  return (
    <PageFrame pathname="/app/subscriptions" personaId={personaId} personas={personas}>
      <section className="rounded-[28px] border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-md)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Recurring services</p>
              <StatusPill tone={highRiskCount > 0 ? "important" : "safe"}>
                {highRiskCount > 0 ? `${highRiskCount} to review first` : "Nothing urgent"}
              </StatusPill>
            </div>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-[var(--pa-text)] md:text-[2.2rem]">
              Turn subscription clutter into a short review list.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              This page ranks recurring charges by likely waste and shows the verified merchant path only when you ask for it.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-white/84 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Review first</p>
            <p className="mt-2 max-w-[16rem] text-sm font-semibold leading-6 text-[var(--pa-text)]">
              {reviewFirst ? `${reviewFirst.label} at ${formatCurrency(reviewFirst.monthly_amount)} a month` : "No recurring services found"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            detail="Combined monthly subscription cost across the current seeded profile."
            icon={<CircleDollarSign className="h-5 w-5" />}
            label="Monthly total"
            tone="warning"
            value={formatCurrency(totalMonthly)}
          />
          <MetricCard
            detail="Useful when deciding whether a service is worth keeping."
            icon={<Repeat className="h-5 w-5" />}
            label="Annualized cost"
            tone="primary"
            value={formatCurrency(totalMonthly * 12)}
          />
          <MetricCard
            detail="The number of recurring services currently detected."
            icon={<Scissors className="h-5 w-5" />}
            label="Services found"
            tone="default"
            value={formatNumber(subscriptions.length)}
          />
          <MetricCard
            detail="The next recurring charge expected from the current list."
            icon={<CalendarClock className="h-5 w-5" />}
            label="Next charge"
            tone="success"
            value={nextCharge ? formatDate(nextCharge.next_expected_at) : "Unavailable"}
          />
        </div>
      </section>

      <SectionCard
        eyebrow="Review queue"
        title="What to review first"
        description="High-risk services appear first, then lower-risk recurring charges by cost."
        descriptionDetail="The app does not assume every recurring charge should be canceled. It first helps you review the cost, timing, and current action status, then loads a verified merchant help path only when requested."
      >
        <SubscriptionsPanel personaId={personaId} subscriptions={subscriptions} />
      </SectionCard>
    </PageFrame>
  );
}

function riskRank(value: string) {
  if (value === "high") return 3;
  if (value === "review") return 2;
  return 1;
}
