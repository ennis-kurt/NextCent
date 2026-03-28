import type { DebtStrategyRun } from "@contracts";

import { formatCurrency, formatDate } from "@/lib/format";

import { SectionCard } from "./section-card";
import { StatusPill } from "./status-pill";

export function DebtStrategyGrid({ debt }: { debt: DebtStrategyRun }) {
  return (
    <SectionCard
      eyebrow="Repayment Models"
      title="Debt strategy comparison"
      description="Compare payoff speed, interest cost, and liquidity impact before choosing a repayment posture."
    >
      <div className="grid gap-4 xl:grid-cols-4">
        {debt.strategies.map((strategy) => {
          const isRecommended = strategy.strategy === debt.recommended_strategy;
          return (
            <article
              key={strategy.strategy}
              className={`rounded-[24px] border p-5 ${
                isRecommended
                  ? "border-[var(--pa-primary)] bg-[var(--pa-primary-soft)]"
                  : "border-[var(--pa-border)] bg-[var(--pa-surface)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--pa-text-soft)]">{strategy.prioritizes}</p>
                  <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">{strategy.title}</h3>
                </div>
                {isRecommended ? <StatusPill tone="safe">Recommended</StatusPill> : null}
              </div>
              <p className="mt-3 text-sm text-[var(--pa-text-muted)]">{strategy.why_choose_it}</p>
              <dl className="mt-5 space-y-3 text-sm text-[var(--pa-text-muted)]">
                <div className="flex justify-between gap-3">
                  <dt>Payment pool</dt>
                  <dd className="font-semibold text-[var(--pa-text)]">{formatCurrency(strategy.monthly_payment_pool)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Projected payoff</dt>
                  <dd className="font-semibold text-[var(--pa-text)]">{strategy.projected_payoff_months} months</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Payoff date</dt>
                  <dd className="font-semibold text-[var(--pa-text)]">{formatDate(strategy.projected_payoff_date)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Interest cost</dt>
                  <dd className="font-semibold text-[var(--pa-text)]">{formatCurrency(strategy.projected_interest_cost)}</dd>
                </div>
              </dl>
              <div className="mt-5 rounded-2xl border border-[var(--pa-border)] bg-white/70 p-4 text-sm text-[var(--pa-text-muted)]">
                <p className="font-semibold text-[var(--pa-text)]">Tradeoff</p>
                <p className="mt-2">{strategy.tradeoffs}</p>
                <p className="mt-3 font-semibold text-[var(--pa-text)]">Liquidity impact</p>
                <p className="mt-2">{strategy.liquidity_impact}</p>
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}
