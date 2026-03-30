import { AlertTriangle, ArrowDownCircle, ArrowUpRight, BadgeDollarSign, Shield, TrendingUp, WalletCards } from "lucide-react";

import { ActionSpotlight } from "@/components/action-spotlight";
import { InsightCard } from "@/components/insight-card";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { ExpandableNote } from "@/components/expandable-note";
import { SpendBreakdownChart } from "@/components/charts";
import { getCreditSummary, getDashboard, getDebtStrategies } from "@/lib/api";
import { resolveInvestmentGuidance } from "@/lib/investment";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, dashboard, debt, credit] = await Promise.all([
    getPageFramePersonas(),
    getDashboard(personaId),
    getDebtStrategies(personaId),
    getCreditSummary(personaId)
  ]);
  const recommendedDebtStrategy = debt.strategies.find((strategy) => strategy.strategy === debt.recommended_strategy);
  const debtTarget = recommendedDebtStrategy?.suggested_allocations[0];
  const debtTargetCard = credit.cards.find((card) => card.id === String(debtTarget?.account_id));
  const { guidance: investment, isFallback: investmentFallback } = resolveInvestmentGuidance({
    dashboard,
    debt
  });

  return (
    <PageFrame pathname="/app/dashboard" personaId={personaId} personas={personas}>
      <ActionSpotlight
        archetype={dashboard.archetype}
        personaName={dashboard.persona_name}
        recommendation={dashboard.top_recommendations[0]}
        safeToSpendThisWeek={dashboard.safe_to_spend.safe_to_spend_this_week}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:gap-6">
        <SectionCard
          eyebrow="Safe To Spend"
          title="Current runway"
          description="Updates with bills, debt minimums, and recent pace."
          descriptionDetail="This is not a fixed budget cap. The number moves with upcoming obligations, pending debits, and how fast discretionary spending is tracking."
        >
          <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
            <MetricCard label="Today" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_today)} tone="primary" />
            <MetricCard label="This week" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)} tone="primary" />
            <MetricCard label="Until payday" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_until_payday)} tone="primary" />
          </div>
          <div className="mt-5 rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
            <p className="text-sm leading-7 text-[var(--pa-text-muted)]">{dashboard.safe_to_spend.guidance_summary}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--pa-text-muted)]">
              <span>Projected depletion: {formatDate(dashboard.safe_to_spend.projected_zero_date)}</span>
              <span>Risk buffer: {formatCurrency(dashboard.safe_to_spend.risk_buffer)}</span>
              <span>Savings floor: {formatCurrency(dashboard.safe_to_spend.savings_floor)}</span>
            </div>
            <ExpandableNote
              className="mt-4"
              detail={
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        label: "Expected income before payday",
                        value: formatCurrency(dashboard.safe_to_spend.expected_income_before_payday)
                      },
                      {
                        label: "Fixed obligations before payday",
                        value: formatCurrency(dashboard.safe_to_spend.fixed_obligations_before_payday)
                      },
                      {
                        label: "Risk buffer",
                        value: formatCurrency(dashboard.safe_to_spend.risk_buffer)
                      },
                      {
                        label: "Savings floor",
                        value: formatCurrency(dashboard.safe_to_spend.savings_floor)
                      }
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[16px] border border-[rgba(15,23,32,0.08)] bg-white/72 px-4 py-3"
                      >
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{item.label}</p>
                        <p className="mt-2 font-display text-xl tabular-nums text-[var(--pa-text)]">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[18px] border border-[rgba(15,23,32,0.1)] bg-[var(--pa-primary-soft)]/45 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Resulting runway to payday</p>
                      <p className="font-display text-2xl tabular-nums text-[var(--pa-text)]">
                        {formatCurrency(dashboard.safe_to_spend.safe_to_spend_until_payday)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">
                      The weekly Safe to Spend number is the paced view of this remaining runway for the current cycle.
                    </p>
                  </div>
                </div>
              }
              label="Show math"
              summary="Review the deterministic inputs behind this runway before pacing the weekly number."
            />
          </div>
        </SectionCard>
        <SectionCard
          eyebrow="What Is Affecting Your Score"
          title="Score drivers"
          description="Separate debt pressure, buffer strength, and spending behavior."
          descriptionDetail="The goal is to show what is moving the score instead of hiding everything inside one number."
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

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:gap-6">
        <SectionCard
          eyebrow="Spending Trend"
          title="Where the month is going"
          description="Category totals for the current cycle."
          descriptionDetail="Recommendations stay separate from raw category totals so you can first see what happened before the product suggests what to do."
        >
          <SpendBreakdownChart data={dashboard.spend_by_category} />
        </SectionCard>
        <SectionCard
          eyebrow="Leakage"
          title="Fee and subscription drag"
          description="Fast sources of cash-flow relief."
          descriptionDetail="Recurring charges, fees, and revolving interest are often the quickest ways to recover near-term flexibility."
        >
          <div className="grid gap-4 sm:grid-cols-2">
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

      <SectionCard
        eyebrow="Capital Allocation"
        title="Debt vs investing right now"
        description="Decide whether the next surplus dollars should attack APR, stay liquid, or start compounding."
        descriptionDetail="This keeps the card-payment target and the investment recommendation in the same frame so the app can explain why the next dollar should go to debt, cash, or a diversified investment channel."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Credit card payment suggestion</p>
                <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">
                  {debtTargetCard?.display_name ?? recommendedDebtStrategy?.title ?? "Debt priority"}
                </h3>
              </div>
              <div className="rounded-2xl border border-[var(--pa-border)] bg-white/80 p-3 text-[var(--pa-warning)]">
                <ArrowDownCircle aria-hidden="true" className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Suggested payment"
                value={formatCurrency(Number(debtTarget?.suggested_payment ?? 0))}
                tone="warning"
                detail={recommendedDebtStrategy ? `${recommendedDebtStrategy.title} is the current best-fit repayment posture.` : "No repayment target is active."}
              />
              <MetricCard
                label="Target account"
                value={debtTargetCard?.sanitized_name ?? "Highest-impact card"}
                detail={debt.rationale}
              />
            </div>
            <p className="mt-5 text-sm leading-7 text-[var(--pa-text-muted)]">
              {debtTarget
                ? `Move about ${formatCurrency(Number(debtTarget.suggested_payment ?? 0))} toward this card before splitting extra dollars elsewhere.`
                : "No extra debt payment target is active in this seeded scenario."}
            </p>
          </div>

          <div className="rounded-[24px] border border-[rgba(31,116,104,0.18)] bg-[linear-gradient(180deg,rgba(231,243,240,0.64),rgba(255,255,255,0.94))] p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Investment suggestion</p>
                <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">{investment.title}</h3>
              </div>
              <div className="rounded-2xl border border-[rgba(31,116,104,0.18)] bg-white/82 p-3 text-[var(--pa-primary)]">
                {investment.posture === "invest_now" ? (
                  <TrendingUp aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <WalletCards aria-hidden="true" className="h-5 w-5" />
                )}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="Invest now"
                value={formatCurrency(investment.recommended_investment_amount)}
                tone={investment.posture === "invest_now" ? "success" : "default"}
                detail={investment.posture === "invest_now" ? `${investment.investment_channel} is the suggested channel.` : "New investing should wait for the current priorities below."}
              />
              <MetricCard
                label="Best current destination"
                value={investment.priority_destination}
                tone={investment.posture === "debt_first" ? "warning" : investment.posture === "buffer_first" ? "primary" : "success"}
                detail={`${formatCurrency(investment.priority_action_amount)} ${investment.cadence === "monthly" ? "per month" : "this cycle"}.`}
              />
            </div>
            <p className="mt-5 text-sm leading-7 text-[var(--pa-text-muted)]">{investment.summary}</p>
            {investmentFallback ? (
              <p className="mt-4 rounded-[18px] border border-[rgba(31,116,104,0.16)] bg-white/72 px-4 py-3 text-xs leading-6 text-[var(--pa-text-muted)]">
                The dedicated investment service was unavailable for this request, so this guidance is being estimated from the dashboard signals already loaded for this persona.
              </p>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-5 xl:grid-cols-2 xl:gap-6">
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
