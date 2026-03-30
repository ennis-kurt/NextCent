import type { CreditSummaryResponse } from "@contracts";

import { MiniBalanceTrendChart } from "@/components/charts";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { StatusPill } from "./status-pill";

type CreditCard = CreditSummaryResponse["cards"][number];

export function DebtAccountCard({
  card,
  isPriority = false
}: {
  card: CreditCard;
  isPriority?: boolean;
}) {
  const activeOffer = [...card.deferred_interest_offers]
    .filter((offer) => offer.status !== "expired")
    .sort((left, right) => left.days_remaining - right.days_remaining)[0];

  return (
    <article
      className={cn(
        "rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)]",
        isPriority ? "border-[rgba(31,116,104,0.28)] shadow-[0_22px_36px_rgba(31,116,104,0.08)]" : "border-[var(--pa-border)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{card.sanitized_name}</p>
          <h3 className="font-display text-[1.3rem] leading-tight text-[var(--pa-text)]">{card.display_name}</h3>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isPriority ? <StatusPill tone="safe">Priority now</StatusPill> : null}
          {activeOffer ? (
            <StatusPill tone={activeOffer.days_remaining <= 45 ? "urgent" : "important"}>
              Promo {activeOffer.days_remaining <= 45 ? "expiring" : "active"}
            </StatusPill>
          ) : card.utilization_estimate && card.utilization_estimate >= 0.7 ? (
            <StatusPill tone="important">High utilization</StatusPill>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
        <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/72 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Balance trend, 12 months</p>
            <p className="text-sm font-medium text-[var(--pa-text)]">{formatCurrency(card.current_balance)}</p>
          </div>
          <div className="mt-3">
            <MiniBalanceTrendChart data={card.balance_history} color={activeOffer ? "#b46b18" : "#1f7468"} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Minimum due" value={formatCurrency(card.minimum_payment ?? 0)} />
          <Metric label="Due date" value={formatDate(card.due_date)} />
          <Metric label="Statement close" value={card.statement_close_date ? formatDate(card.statement_close_date) : "Unavailable"} />
          <Metric label="Utilization" value={formatPercent(card.utilization_estimate ?? 0)} />
          <Metric label="Interest this month" value={formatCurrency(card.interest_charged_this_month)} />
          <Metric label="Interest, 6 months" value={formatCurrency(card.interest_charged_last_six_months)} />
        </div>
      </div>

      {activeOffer ? (
        <div className="mt-4 rounded-[20px] border border-[rgba(180,107,24,0.16)] bg-[rgba(248,234,215,0.68)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Deferred interest balance</p>
              <p className="mt-2 font-medium text-[var(--pa-text)]">{activeOffer.label}</p>
            </div>
            <StatusPill tone={activeOffer.days_remaining <= 45 ? "urgent" : "important"}>
              {activeOffer.days_remaining} days left
            </StatusPill>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Remaining promo balance" value={formatCurrency(activeOffer.remaining_deferred_amount)} soft />
            <Metric
              label="Needed each month"
              value={formatCurrency(card.minimum_monthly_payment_to_avoid_deferred_interest ?? activeOffer.required_monthly_payment_to_avoid_deferred_interest)}
              soft
            />
            <Metric
              label="Promo deadline"
              value={formatDate(activeOffer.expires_on)}
              soft
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--pa-text-muted)]">
            {activeOffer.estimated_deferred_interest_if_missed
              ? `Missing that deadline could add about ${formatCurrency(activeOffer.estimated_deferred_interest_if_missed)} in deferred interest.`
              : "Missing that deadline could add deferred interest to the remaining promo balance."}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function Metric({
  label,
  value,
  soft = false
}: {
  label: string;
  value: string;
  soft?: boolean;
}) {
  return (
    <div className={cn("rounded-[18px] border px-4 py-3", soft ? "border-[rgba(180,107,24,0.12)] bg-white/72" : "border-[var(--pa-border)] bg-[var(--pa-surface)]")}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">{value}</p>
    </div>
  );
}
