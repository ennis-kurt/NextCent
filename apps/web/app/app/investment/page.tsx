import { ArrowDownCircle, Shield, TrendingUp, WalletCards } from "lucide-react";

import { ExpandableNote } from "@/components/expandable-note";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { getCreditSummary, getDashboard, getDebtStrategies, getInvestmentGuidance } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { resolveInvestmentGuidance } from "@/lib/investment";
import { getPageFramePersonas } from "@/lib/page-data";

export default async function InvestmentPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "healthy-cashflow";
  const [personas, dashboard, directInvestment, debt, credit] = await Promise.all([
    getPageFramePersonas(),
    getDashboard(personaId),
    getInvestmentGuidance(personaId).catch(() => null),
    getDebtStrategies(personaId),
    getCreditSummary(personaId)
  ]);

  const recommendedDebtStrategy = debt.strategies.find((strategy) => strategy.strategy === debt.recommended_strategy);
  const debtTarget = recommendedDebtStrategy?.suggested_allocations[0];
  const debtTargetCard = credit.cards.find((card) => card.id === String(debtTarget?.account_id));
  const { guidance: investment, isFallback: investmentFallback } = resolveInvestmentGuidance({
    dashboard,
    debt,
    directGuidance: directInvestment
  });
  const investNow = investment.posture === "invest_now";

  return (
    <PageFrame pathname="/app/investment" personaId={personaId} personas={personas}>
      <SectionCard
        eyebrow="Investment Readiness"
        title={investment.title}
        description={investment.summary}
        descriptionDetail={investment.rationale}
      >
        {investmentFallback ? (
          <div className="mb-5 rounded-[22px] border border-[rgba(31,116,104,0.16)] bg-[var(--pa-primary-soft)]/35 px-4 py-4 text-sm leading-7 text-[var(--pa-text-muted)]">
            The detailed investment endpoint was unavailable for this request, so this page is using a compatibility estimate derived from the dashboard and debt signals already loaded for this persona.
          </div>
        ) : null}
        <div className="grid gap-4 xl:grid-cols-4">
          <MetricCard
            label="Invest now"
            value={formatCurrency(investment.recommended_investment_amount)}
            tone={investNow ? "success" : "default"}
            detail={investNow ? `${investment.investment_channel} is the suggested channel.` : "New investing stays paused until the current priority changes."}
            icon={investNow ? <TrendingUp className="h-5 w-5" /> : <WalletCards className="h-5 w-5" />}
          />
          <MetricCard
            label="Best current destination"
            value={investment.priority_destination}
            tone={investment.posture === "debt_first" ? "warning" : investment.posture === "buffer_first" ? "primary" : "success"}
            detail={`${formatCurrency(investment.priority_action_amount)} ${investment.cadence === "monthly" ? "per month" : "this cycle"}.`}
            icon={investment.posture === "debt_first" ? <ArrowDownCircle className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
          />
          <MetricCard
            label="Monthly surplus"
            value={formatCurrency(investment.monthly_surplus)}
            tone={investment.monthly_surplus > 0 ? "primary" : "danger"}
            detail="Trailing monthly inflow minus tracked spending."
          />
          <MetricCard
            label="Liquid buffer"
            value={`${formatNumber(investment.liquid_buffer_months)} mo`}
            tone={investment.liquid_buffer_months >= 1.5 ? "success" : "warning"}
            detail="Approximate months of fixed expenses covered by liquid cash."
          />
        </div>
      </SectionCard>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Current Allocation"
          title="Where the next dollars should go"
          description="This recommendation compares debt drag, runway, and current surplus before green-lighting new investing."
        >
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Priority destination</p>
                <h3 className="mt-2 font-display text-[1.85rem] leading-tight text-[var(--pa-text)]">{investment.priority_destination}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">{investment.why_now}</p>
              </div>
              <div className="rounded-[24px] border border-[rgba(31,116,104,0.14)] bg-white/85 px-5 py-4 xl:min-w-[240px]">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">
                  {investment.cadence === "monthly" ? "Suggested monthly amount" : "Suggested current-cycle amount"}
                </p>
                <p className="mt-2 font-display text-3xl tabular-nums text-[var(--pa-text)]">
                  {formatCurrency(investment.priority_action_amount)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/82 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Suggested channel</p>
                <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">{investment.investment_channel}</p>
              </div>
              <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/82 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Current investing amount</p>
                <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">
                  {formatCurrency(investment.recommended_investment_amount)}
                </p>
              </div>
            </div>

            {investment.posture === "debt_first" && debtTarget ? (
              <div className="mt-5 rounded-[22px] border border-[rgba(180,107,24,0.18)] bg-[var(--pa-warning-soft)] px-4 py-4 text-sm leading-7 text-[var(--pa-text-muted)]">
                The strongest current guaranteed return is still debt reduction.
                {debtTargetCard ? ` The top target is ${debtTargetCard.display_name}` : ""} at about{" "}
                <span className="font-semibold text-[var(--pa-text)]">{formatCurrency(Number(debtTarget.suggested_payment ?? 0))}</span>{" "}
                this cycle under the {recommendedDebtStrategy?.title ?? "recommended"} plan.
              </div>
            ) : null}

            {investment.posture === "buffer_first" ? (
              <div className="mt-5 rounded-[22px] border border-[rgba(31,116,104,0.18)] bg-[var(--pa-primary-soft)]/45 px-4 py-4 text-sm leading-7 text-[var(--pa-text-muted)]">
                The app is holding investing at <span className="font-semibold text-[var(--pa-text)]">{formatCurrency(0)}</span> until
                the liquid cushion improves. Use the suggested amount to strengthen the reserve first.
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Readiness Checks"
          title="What is shaping the recommendation"
          description="The app uses interest drag, cash cushion, and near-term flexibility to decide whether investing is ready."
        >
          <div className="space-y-4">
            <MetricCard
              label="Fees + interest leakage"
              value={formatCurrency(investment.fee_and_interest_leakage)}
              tone={investment.fee_and_interest_leakage > 40 ? "warning" : "default"}
              detail="Trailing 30-day fees and revolving interest."
            />
            <MetricCard
              label="Highest APR"
              value={investment.max_apr ? `${formatNumber(investment.max_apr)}%` : "None"}
              tone={investment.max_apr && investment.max_apr >= 18 ? "warning" : "success"}
              detail="A high APR usually outranks new investing as the better next-dollar use."
            />
            <MetricCard
              label="Safe to Spend this week"
              value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)}
              tone="primary"
              detail="Weekly runway after bills, minimums, and recent spending pace."
            />
            <MetricCard
              label="Financial health score"
              value={`${formatNumber(dashboard.financial_health.overall_score)}/100`}
              tone="primary"
              detail="Internal product score for overall financial stability."
            />
          </div>
          <ExpandableNote
            className="mt-5"
            detail={
              <ul className="space-y-2">
                {investment.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            }
            label="Assumptions"
            summary="Review the assumptions behind this investing recommendation."
          />
        </SectionCard>
      </section>
    </PageFrame>
  );
}
