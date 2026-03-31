"use client";

import type { CreditSummaryResponse, DebtStrategyRun } from "@contracts";
import { useState } from "react";

import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { SectionCard } from "./section-card";
import { StatusPill } from "./status-pill";

export function DebtStrategyGrid({
  debt,
  cards
}: {
  debt: DebtStrategyRun;
  cards: CreditSummaryResponse["cards"];
}) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const [selectedStrategyKey, setSelectedStrategyKey] = useState(debt.recommended_strategy);
  const selectedStrategy =
    debt.strategies.find((strategy) => strategy.strategy === selectedStrategyKey) ?? debt.strategies[0];
  const selectedAllocations = [...selectedStrategy.suggested_allocations].sort(
    (left, right) => Number(right.suggested_payment ?? 0) - Number(left.suggested_payment ?? 0)
  );
  const selectedIsRecommended = selectedStrategy.strategy === debt.recommended_strategy;

  return (
    <SectionCard
      eyebrow="Repayment Models"
      title="Debt strategy comparison"
      description="Compare payoff speed, interest cost, and liquidity impact before choosing a repayment posture."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {debt.strategies.map((strategy) => {
          const isSelected = strategy.strategy === selectedStrategy.strategy;
          const isRecommended = strategy.strategy === debt.recommended_strategy;

          return (
            <button
              key={strategy.strategy}
              aria-controls="selected-strategy-plan"
              aria-pressed={isSelected}
              className={cn(
                "group rounded-[24px] border p-5 text-left transition-[transform,box-shadow,border-color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-bg)]",
                "xl:p-4",
                isSelected
                  ? "border-[var(--pa-primary)] bg-[var(--pa-primary-soft)] shadow-[0_24px_40px_rgba(31,116,104,0.12)]"
                  : "border-[var(--pa-border)] bg-[var(--pa-surface)] hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)]",
                !isSelected && isRecommended
                  ? "border-[rgba(31,116,104,0.24)] bg-[linear-gradient(180deg,rgba(231,243,240,0.54),rgba(255,255,255,0.88))]"
                  : null
              )}
              type="button"
              onClick={() => setSelectedStrategyKey(strategy.strategy)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--pa-text-soft)] xl:text-[11px]">{strategy.prioritizes}</p>
                  <h3 className="mt-2 font-display text-xl text-[var(--pa-text)] xl:text-[1.8rem] xl:leading-none">{strategy.title}</h3>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {isSelected ? <StatusPill>Selected</StatusPill> : null}
                  {isRecommended ? <StatusPill tone="safe">Recommended</StatusPill> : null}
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--pa-text-muted)] xl:text-[13px] xl:leading-6">{strategy.why_choose_it}</p>
              <dl className="mt-5 space-y-3 text-sm text-[var(--pa-text-muted)] xl:space-y-2.5 xl:text-[13px]">
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
              <div className="mt-5 rounded-2xl border border-[var(--pa-border)] bg-white/70 p-4 text-sm text-[var(--pa-text-muted)] xl:p-3.5 xl:text-[13px] xl:leading-6">
                <p className="font-semibold text-[var(--pa-text)]">Tradeoff</p>
                <p className="mt-2">{strategy.tradeoffs}</p>
                <p className="mt-3 font-semibold text-[var(--pa-text)]">Liquidity impact</p>
                <p className="mt-2">{strategy.liquidity_impact}</p>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[rgba(15,23,32,0.08)] pt-4 text-sm xl:mt-4 xl:pt-3 xl:text-[13px]">
                <span className="text-[var(--pa-text-muted)]">{isSelected ? "Action plan shown below" : "Click to view plan"}</span>
                <span className="font-medium text-[var(--pa-text)]">{isSelected ? "Viewing" : "Preview"}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div
        id="selected-strategy-plan"
        className="mt-6 rounded-[28px] border border-[rgba(31,116,104,0.18)] bg-[linear-gradient(180deg,rgba(231,243,240,0.7),rgba(255,255,255,0.95))] p-5 shadow-[0_24px_44px_rgba(8,15,22,0.08)] sm:p-6"
      >
        <div className="flex flex-col gap-5 border-b border-[rgba(15,23,32,0.08)] pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--pa-text-soft)]">Selected strategy</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h3 className="font-display text-[1.75rem] leading-tight text-[var(--pa-text)]">{selectedStrategy.title}</h3>
              {selectedIsRecommended ? <StatusPill tone="safe">Recommended</StatusPill> : null}
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{selectedStrategy.prioritizes}</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--pa-text-muted)]">{selectedStrategy.why_choose_it}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[440px]">
            <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/85 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Payment pool</p>
              <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(selectedStrategy.monthly_payment_pool)}</p>
            </div>
            <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/85 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Projected payoff</p>
              <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{selectedStrategy.projected_payoff_months} months</p>
            </div>
            <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/85 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Interest cost</p>
              <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(selectedStrategy.projected_interest_cost)}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Actionable plan</p>
            <p className="mt-2 text-sm text-[var(--pa-text-muted)]">
              Minimums stay current on every card first. The totals below show where the extra payment should go next.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill>{selectedStrategy.title}</StatusPill>
            <StatusPill tone={selectedIsRecommended ? "safe" : "important"}>
              {selectedIsRecommended ? "Pay next" : "Compare option"}
            </StatusPill>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {selectedAllocations.length > 0 ? (
            selectedAllocations.map((allocation) => {
              const card = cardsById.get(String(allocation.account_id));
              const minimumPayment = Number(allocation.minimum_payment ?? card?.minimum_payment ?? 0);
              const suggestedPayment = Number(allocation.suggested_payment ?? 0);
              const extraAboveMinimum = Math.max(0, suggestedPayment - minimumPayment);
              const utilizationEstimate = allocation.utilization_estimate ?? card?.utilization_estimate;

              return (
                <article
                  key={`${selectedStrategy.strategy}-${String(allocation.account_id)}`}
                  className="rounded-[24px] border border-[var(--pa-border)] bg-white/88 p-5 shadow-[var(--pa-shadow-sm)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-xl">
                      <p className="font-display text-[1.35rem] leading-tight text-[var(--pa-text)]">
                        {card?.display_name ?? card?.sanitized_name ?? String(allocation.account_id)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">
                        {card?.sanitized_name ?? "Connected revolving account"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-[rgba(31,116,104,0.14)] bg-[var(--pa-primary-soft)]/55 px-5 py-4 lg:min-w-[220px]">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Total recommended payment</p>
                      <p className="mt-2 font-display text-3xl tabular-nums text-[var(--pa-text)]">
                        {formatCurrency(suggestedPayment)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Minimum payment</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">{formatCurrency(minimumPayment)}</p>
                    </div>
                    <div className="rounded-[18px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Extra above minimum</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">{formatCurrency(extraAboveMinimum)}</p>
                    </div>
                    <div className="rounded-[18px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Utilization estimate</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">
                        {typeof utilizationEstimate === "number" ? formatPercent(utilizationEstimate) : "Not available"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-[var(--pa-border)] bg-white/80 p-5 text-sm leading-7 text-[var(--pa-text-muted)]">
              No per-account allocation plan is available for this strategy yet.
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
