import type { CreditSummaryResponse, DebtStrategyRun } from "@contracts";

export type DebtPriorityPresentation = {
  cardId: string | null;
  badge: string;
  badgeTone: "safe" | "important" | "urgent";
  headline: string;
  summary: string;
  amountLabel: string;
  amountValue: number;
  amountDetail: string;
  detail: string[];
};

export type DeferredOfferPresentation = {
  id: string;
  cardId: string;
  cardName: string;
  label: string;
  expiresOn: string;
  daysRemaining: number;
  remainingAmount: number;
  requiredMonthlyPayment: number;
  estimatedBackcharge: number | null;
  tone: "important" | "urgent";
};

function recommendedTarget(debt: DebtStrategyRun) {
  const preferred = debt.strategies.find((strategy) => strategy.strategy === debt.recommended_strategy);
  return preferred?.suggested_allocations[0] ?? null;
}

export function buildDeferredOfferPresentations(cards: CreditSummaryResponse["cards"]): DeferredOfferPresentation[] {
  return cards
    .flatMap((card) =>
      card.deferred_interest_offers
        .filter((offer) => offer.status !== "expired")
        .map((offer) => ({
          id: offer.id,
          cardId: card.id,
          cardName: card.display_name,
          label: offer.label,
          expiresOn: offer.expires_on,
          daysRemaining: offer.days_remaining,
          remainingAmount: offer.remaining_deferred_amount,
          requiredMonthlyPayment:
            card.minimum_monthly_payment_to_avoid_deferred_interest ?? offer.required_monthly_payment_to_avoid_deferred_interest,
          estimatedBackcharge: offer.estimated_deferred_interest_if_missed ?? null,
          tone: offer.days_remaining <= 45 ? ("urgent" as const) : ("important" as const)
        }))
    )
    .sort((left, right) => left.daysRemaining - right.daysRemaining);
}

export function buildDebtPriorityPresentation({
  debt,
  cards
}: {
  debt: DebtStrategyRun;
  cards: CreditSummaryResponse["cards"];
}): DebtPriorityPresentation {
  const offers = buildDeferredOfferPresentations(cards);
  const priorityOffer = offers[0];

  if (priorityOffer) {
  return {
    cardId: priorityOffer.cardId,
    badge: priorityOffer.tone === "urgent" ? "Promo deadline near" : "Promo needs pacing",
    badgeTone: priorityOffer.tone,
    headline: `Protect ${priorityOffer.cardName} before deferred interest hits.`,
    summary: `This promo balance has a real deadline, so it should outrank general strategy theory until the financing window is cleared.`,
    amountLabel: "Total payment to keep on pace",
    amountValue: priorityOffer.requiredMonthlyPayment,
    amountDetail: `Keep minimums current on every card. This card should reach about $${priorityOffer.requiredMonthlyPayment.toFixed(0)} total this month before ${priorityOffer.expiresOn}.`,
    detail: [
      `${priorityOffer.label} still has about $${priorityOffer.remainingAmount.toFixed(0)} left on ${priorityOffer.cardName}.`,
      `There are ${priorityOffer.daysRemaining} days left before the promo expires.`,
      priorityOffer.estimatedBackcharge
          ? `Missing that deadline could add about $${priorityOffer.estimatedBackcharge.toFixed(0)} in deferred interest.`
          : "Missing that deadline could trigger deferred interest on the remaining balance."
      ]
    };
  }

  const target = recommendedTarget(debt);
  const card = cards.find((item) => item.id === String(target?.account_id)) ?? cards[0];
  const extraAmount = Math.max(0, Number(target?.extra_payment ?? target?.suggested_payment ?? card?.minimum_payment ?? 0));

  return {
    cardId: card?.id ?? null,
    badge: "Pay this card next",
    badgeTone: "important",
    headline: card ? `Start with ${card.display_name} before spreading extra payments.` : "Use one focused payment instead of splitting extra cash.",
    summary: debt.rationale,
    amountLabel: "Extra to direct next",
    amountValue: extraAmount,
    amountDetail: card?.statement_close_date
      ? `Minimums stay covered first. Direct this extra amount to ${card.sanitized_name} before the next statement close on ${card.statement_close_date}.`
      : "Minimums stay covered first. Direct this extra amount to the highest-priority card next.",
    detail: [
      debt.rationale,
      card?.utilization_estimate && card.utilization_estimate >= 0.7
        ? `${card.display_name} is using ${Math.round(card.utilization_estimate * 100)}% of its limit.`
        : `${card?.display_name ?? "This card"} is the strongest current target in the recommended plan.`,
      card?.interest_charged_this_month
        ? `It was charged about $${card.interest_charged_this_month.toFixed(0)} in interest this month.`
        : "Reducing this balance now should help limit the next cycle of interest and utilization drag."
    ]
  };
}
