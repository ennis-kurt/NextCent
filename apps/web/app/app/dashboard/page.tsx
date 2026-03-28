import { AlertTriangle, ArrowDownCircle, ArrowUpRight, BadgeDollarSign, Shield } from "lucide-react";

import { InsightCard } from "@/components/insight-card";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { SpendBreakdownChart } from "@/components/charts";
import { getDashboard } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, dashboard] = await Promise.all([getPageFramePersonas(), getDashboard(personaId)]);

  return (
    <PageFrame pathname="/app/dashboard" personaId={personaId} personas={personas}>
      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total cash"
          value={formatCurrency(dashboard.balance_summary.total_cash)}
          tone="success"
          detail="Checking and savings modeled as liquid cash."
          icon={<BadgeDollarSign className="h-5 w-5" />}
        />
        <MetricCard
          label="Total debt"
          value={formatCurrency(dashboard.balance_summary.total_debt)}
          tone="warning"
          detail="Revolving credit balances currently modeled."
          icon={<ArrowDownCircle className="h-5 w-5" />}
        />
        <MetricCard
          label="Net monthly cash flow"
          value={formatCurrency(dashboard.net_monthly_cash_flow)}
          tone={dashboard.net_monthly_cash_flow >= 0 ? "primary" : "danger"}
          detail="Trailing monthly inflow minus tracked spending."
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <MetricCard
          label="Financial health score"
          value={`${formatNumber(dashboard.financial_health.overall_score)}/100`}
          tone="primary"
          detail="Internal product score. Not a regulated credit score."
          icon={<Shield className="h-5 w-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          eyebrow="Safe To Spend"
          title="Living guidance, not a rigid budget number"
          description="This number changes with balances, pending debits, upcoming bills, debt minimums, and your recent discretionary pace."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Today" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_today)} tone="primary" />
            <MetricCard label="This week" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)} tone="primary" />
            <MetricCard label="Until payday" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_until_payday)} tone="primary" />
          </div>
          <div className="mt-5 rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
            <p className="text-sm leading-7 text-[var(--pa-text-muted)]">{dashboard.safe_to_spend.guidance_summary}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--pa-text-muted)]">
              <span>Projected depletion: {formatDate(dashboard.safe_to_spend.projected_zero_date)}</span>
              <span>Risk buffer: {formatCurrency(dashboard.safe_to_spend.risk_buffer)}</span>
              <span>Savings floor: {formatCurrency(dashboard.safe_to_spend.savings_floor)}</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard
          eyebrow="What Is Affecting Your Score"
          title="Health score drivers"
          description="Transparent component scores help separate debt pressure from buffer strength and spending behavior."
        >
          <div className="space-y-4">
            {dashboard.financial_health.drivers.map((driver) => (
              <div key={driver} className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm text-[var(--pa-text-muted)]">
                {driver}
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Spending Trend"
          title="Where the month is going"
          description="Recommendations are shown separately from raw category totals so the dashboard stays calm."
        >
          <SpendBreakdownChart data={dashboard.spend_by_category} />
        </SectionCard>
        <SectionCard
          eyebrow="Leakage"
          title="Fee and subscription drag"
          description="Waste and interest should be visible because they are often the fastest sources of cash-flow relief."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              label="Subscriptions"
              value={formatCurrency(dashboard.subscriptions_total)}
              detail="Detected recurring discretionary services."
            />
            <MetricCard
              label="Fees + interest"
              value={formatCurrency(dashboard.fee_and_interest_leakage)}
              tone={dashboard.fee_and_interest_leakage > 80 ? "warning" : "default"}
              detail="Trailing 30-day leakage from fees and revolving interest."
            />
          </div>
          <div className="mt-5 rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 text-sm text-[var(--pa-text-muted)]">
            The dashboard emphasizes what matters now: cash flexibility, debt stress, and the actions most likely to improve your next cycle.
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard eyebrow="Top 3 Actions" title="Recommended next moves">
          <div className="space-y-4">
            {dashboard.top_recommendations.map((recommendation) => (
              <InsightCard key={recommendation.id} item={recommendation} variant="recommendation" />
            ))}
          </div>
        </SectionCard>
        <SectionCard eyebrow="Upcoming Risks" title="Signals that need attention soon">
          <div className="space-y-4">
            {dashboard.risks.map((risk) => (
              <InsightCard key={risk.id} item={risk} variant="risk" />
            ))}
            {dashboard.risks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[var(--pa-border)] bg-[var(--pa-surface)] p-8 text-center">
                <AlertTriangle className="mx-auto h-5 w-5 text-[var(--pa-text-soft)]" />
                <p className="mt-3 text-sm text-[var(--pa-text-muted)]">No urgent risk signals are active in this seeded scenario.</p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </section>
    </PageFrame>
  );
}
