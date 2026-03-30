import type { CreditSummaryResponse } from "@contracts";

import { MiniBalanceTrendChart } from "@/components/charts";
import type { CreditCardPresentation } from "@/lib/credit-health-presentation";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { StatusPill } from "./status-pill";

type CreditCard = CreditSummaryResponse["cards"][number];

export function CreditHealthCard({
  card,
  presentation
}: {
  card: CreditCard;
  presentation: CreditCardPresentation;
}) {
  const activeOffer = [...card.deferred_interest_offers]
    .filter((offer) => offer.status !== "expired")
    .sort((left, right) => left.days_remaining - right.days_remaining)[0];

  return (
    <article
      className={cn(
        "rounded-[24px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)]",
        presentation.isPriority ? "border-[rgba(31,116,104,0.24)] shadow-[0_22px_36px_rgba(31,116,104,0.08)]" : "border-[var(--pa-border)]"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{card.sanitized_name}</p>
          <h3 className="font-display text-[1.28rem] leading-tight text-[var(--pa-text)]">{card.display_name}</h3>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {presentation.badge ? <StatusPill tone={presentation.badgeTone}>{presentation.badge}</StatusPill> : null}
          {presentation.isPriority && !presentation.badge ? <StatusPill tone="important">Pay attention</StatusPill> : null}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--pa-text-muted)]">{presentation.summary}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/76 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Balance trend, 12 months</p>
              <p className="mt-2 text-sm text-[var(--pa-text-muted)]">{presentation.interestSummary}</p>
            </div>
            <p className="font-display text-xl text-[var(--pa-text)]">{formatCurrency(card.current_balance)}</p>
          </div>
          <div className="mt-3">
            <MiniBalanceTrendChart data={card.balance_history} color={presentation.hasOffer ? "#b46b18" : "#1f7468"} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            detail={presentation.utilizationLabel}
            label="Card use"
            tone={presentation.utilizationTone}
            value={formatPercent(card.utilization_estimate ?? 0)}
          />
          <Metric label="Minimum due" value={formatCurrency(card.minimum_payment ?? 0)} />
          <Metric label="Due date" value={formatDate(card.due_date)} />
          <Metric label="Statement close" value={card.statement_close_date ? formatDate(card.statement_close_date) : "Unavailable"} />
          <Metric label="Interest this month" tone={card.interest_charged_this_month > 0 ? "warning" : "default"} value={formatCurrency(card.interest_charged_this_month)} />
          <Metric
            detail={presentation.targetDetail}
            label={presentation.targetLabel}
            tone={presentation.targetAmount && presentation.targetAmount > 0 ? "primary" : "default"}
            value={presentation.targetAmount !== null ? formatCurrency(presentation.targetAmount) : "Steady"}
          />
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-4">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Next step</p>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--pa-text)]">{presentation.nextStep}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">{presentation.statementCloseSummary}</p>
      </div>

      {activeOffer ? (
        <div className="mt-4 rounded-[20px] border border-[rgba(180,107,24,0.16)] bg-[rgba(248,234,215,0.7)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Promo balance</p>
              <p className="mt-2 font-medium text-[var(--pa-text)]">{activeOffer.label}</p>
            </div>
            <StatusPill tone={activeOffer.days_remaining <= 45 ? "urgent" : "important"}>{activeOffer.days_remaining} days left</StatusPill>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Promo balance left" soft value={formatCurrency(activeOffer.remaining_deferred_amount)} />
            <Metric
              label="Needed each month"
              soft
              value={formatCurrency(card.minimum_monthly_payment_to_avoid_deferred_interest ?? activeOffer.required_monthly_payment_to_avoid_deferred_interest)}
            />
            <Metric label="Deadline" soft value={formatDate(activeOffer.expires_on)} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "default",
  soft = false
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "primary" | "warning" | "danger" | "success";
  soft?: boolean;
}) {
  const toneStyles = {
    default: "border-[var(--pa-border)] bg-[var(--pa-surface)]",
    primary: "border-[rgba(31,116,104,0.16)] bg-[rgba(223,241,235,0.7)]",
    warning: "border-[rgba(183,139,66,0.18)] bg-[rgba(248,234,215,0.7)]",
    danger: "border-[rgba(179,71,71,0.18)] bg-[rgba(247,223,223,0.7)]",
    success: "border-[rgba(31,138,92,0.16)] bg-[rgba(223,244,234,0.7)]"
  };

  return (
    <div
      className={cn(
        "rounded-[18px] border px-4 py-3",
        soft ? "border-[rgba(180,107,24,0.12)] bg-white/72" : toneStyles[tone]
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-[var(--pa-text-muted)]">{detail}</p> : null}
    </div>
  );
}
