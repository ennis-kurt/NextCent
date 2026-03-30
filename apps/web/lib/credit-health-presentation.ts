import type { CreditSummaryResponse } from "@contracts";

type CreditCard = CreditSummaryResponse["cards"][number];
type PillTone = "default" | "important" | "urgent" | "safe";
type MetricTone = "default" | "primary" | "warning" | "danger" | "success";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const monthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric"
});

export type CreditPriorityPresentation = {
  cardId: string | null;
  cardName: string;
  headline: string;
  summary: string;
  badge: string;
  badgeTone: PillTone;
  actionLabel: string;
  actionAmount: number;
  actionDateLabel: string;
  actionDate: string | null;
  detail: string[];
};

export type CreditOverviewPresentation = {
  headline: string;
  summary: string;
  tone: PillTone;
  scoreTone: MetricTone;
  utilizationTone: MetricTone;
  interestTone: MetricTone;
};

export type CreditDriverPresentation = {
  title: string;
  summary: string;
  tone: PillTone;
};

export type CreditCardPresentation = {
  id: string;
  badge: string | null;
  badgeTone: PillTone;
  summary: string;
  nextStep: string;
  targetLabel: string;
  targetAmount: number | null;
  targetDetail: string;
  utilizationLabel: string;
  utilizationTone: MetricTone;
  statementCloseSummary: string;
  interestSummary: string;
  isPriority: boolean;
  hasOffer: boolean;
};

function toDate(value: string | null) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function daysUntil(value: string | null) {
  const date = toDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

function highestPressureCard(cards: CreditCard[]) {
  return [...cards].sort((left, right) => (right.utilization_estimate ?? 0) - (left.utilization_estimate ?? 0))[0];
}

function nextDueCard(cards: CreditCard[]) {
  return [...cards]
    .filter((card) => card.due_date)
    .sort((left, right) => (toDate(left.due_date)?.getTime() ?? Number.POSITIVE_INFINITY) - (toDate(right.due_date)?.getTime() ?? Number.POSITIVE_INFINITY))[0];
}

function activeOffer(cards: CreditCard[]) {
  return cards
    .flatMap((card) =>
      card.deferred_interest_offers
        .filter((offer) => offer.status !== "expired")
        .map((offer) => ({
          card,
          offer
        }))
    )
    .sort((left, right) => left.offer.days_remaining - right.offer.days_remaining)[0];
}

function buildUsageTarget(card: CreditCard) {
  if (!card.credit_limit || card.utilization_estimate === null) {
    return {
      label: "Usage target",
      amount: null,
      detail: "Limit data is not available, so the next usage target cannot be estimated yet."
    };
  }

  if (card.utilization_estimate <= 0.3) {
    return {
      label: "Usage target",
      amount: 0,
      detail: "This card is already below the common 30% range."
    };
  }

  const targetRatio = card.utilization_estimate >= 0.75 ? 0.5 : 0.3;
  const amount = Math.max(0, card.current_balance - card.credit_limit * targetRatio);

  return {
    label: targetRatio === 0.5 ? "To get under 50%" : "To get under 30%",
    amount,
    detail:
      targetRatio === 0.5
        ? "This is the fastest usage milestone to aim for first."
        : "This is the healthier long-run usage range to aim for."
  };
}

function utilizationTone(value: number | null): MetricTone {
  if (value === null) return "default";
  if (value >= 0.8) return "danger";
  if (value >= 0.5) return "warning";
  if (value > 0.3) return "primary";
  return "success";
}

function utilizationLabel(value: number | null) {
  if (value === null) return "Usage not available";
  if (value >= 0.8) return "Very high card use";
  if (value >= 0.5) return "High card use";
  if (value > 0.3) return "Moderate card use";
  return "Healthy card use";
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string | null) {
  if (!value) return "an upcoming statement";
  return monthDayFormatter.format(new Date(value));
}

export function buildCreditPriorityPresentation(cards: CreditCard[]): CreditPriorityPresentation {
  const offer = activeOffer(cards);
  if (offer) {
    return {
      cardId: offer.card.id,
      cardName: offer.card.display_name,
      headline: `${offer.card.display_name} needs attention before the promo deadline.`,
      summary: "A promo or deferred-interest balance has a real clock on it, so that card should be handled before general score cleanup.",
      badge: offer.offer.days_remaining <= 45 ? "Deadline near" : "Promo active",
      badgeTone: offer.offer.days_remaining <= 45 ? "urgent" : "important",
      actionLabel: "Pay at least each month",
      actionAmount:
        offer.card.minimum_monthly_payment_to_avoid_deferred_interest ?? offer.offer.required_monthly_payment_to_avoid_deferred_interest,
      actionDateLabel: "Promo deadline",
      actionDate: offer.offer.expires_on,
      detail: [
        `${offer.offer.label} still has a balance left.`,
        `Missing ${formatDate(offer.offer.expires_on)} could trigger deferred interest on what remains.`,
        "Use this pace before shifting focus to broader utilization cleanup."
      ]
    };
  }

  const dueCard = nextDueCard(cards);
  const dueSoon = dueCard ? daysUntil(dueCard.due_date) : null;
  if (dueCard && dueSoon !== null && dueSoon <= 7) {
    return {
      cardId: dueCard.id,
      cardName: dueCard.display_name,
      headline: `${dueCard.display_name} is the next payment to cover.`,
      summary: "Keeping the next due card current comes before optional score optimization, especially when the due date is close.",
      badge: "Due soon",
      badgeTone: dueSoon <= 3 ? "urgent" : "important",
      actionLabel: "Minimum due",
      actionAmount: dueCard.minimum_payment ?? 0,
      actionDateLabel: "Pay by",
      actionDate: dueCard.due_date,
      detail: [
        `This card is due first on ${formatDate(dueCard.due_date)}.`,
        "Covering the due payment protects payment history before chasing lower utilization.",
        dueCard.statement_close_date
          ? `If you can pay before ${formatDate(dueCard.statement_close_date)}, that lower balance may also help the next reported utilization.`
          : "Statement-close timing is not available for this connection yet."
      ]
    };
  }

  const pressureCard = highestPressureCard(cards);
  if (pressureCard) {
    const target = buildUsageTarget(pressureCard);
    return {
      cardId: pressureCard.id,
      cardName: pressureCard.display_name,
      headline: `Start by lowering ${pressureCard.display_name}.`,
      summary: "This card is putting the most pressure on overall credit usage, so the next extra dollars should go here first.",
      badge: (pressureCard.utilization_estimate ?? 0) >= 0.8 ? "Highest pressure" : "Best quick win",
      badgeTone: (pressureCard.utilization_estimate ?? 0) >= 0.8 ? "urgent" : "important",
      actionLabel: target.amount && target.amount > 0 ? target.label : "Suggested payment",
      actionAmount: target.amount && target.amount > 0 ? target.amount : pressureCard.minimum_payment ?? 0,
      actionDateLabel: pressureCard.statement_close_date ? "Try before statement close" : "Next due date",
      actionDate: pressureCard.statement_close_date ?? pressureCard.due_date,
      detail: [
        utilizationLabel(pressureCard.utilization_estimate),
        pressureCard.statement_close_date
          ? `A payment before ${formatDate(pressureCard.statement_close_date)} has the best chance of improving the next reported balance.`
          : "This card has the highest usage even though statement-close timing is not available.",
        target.detail
      ]
    };
  }

  return {
    cardId: null,
    cardName: "Your cards",
    headline: "Your cards look relatively steady right now.",
    summary: "There is no single urgent credit action from the current seeded data, so focus on staying current and keeping balances low before they report.",
    badge: "Steady",
    badgeTone: "safe",
    actionLabel: "Suggested payment",
    actionAmount: 0,
    actionDateLabel: "Next step",
    actionDate: null,
    detail: ["Keep every card current.", "If you make an extra payment, use it before statement close."]
  };
}

export function buildCreditOverviewPresentation(credit: CreditSummaryResponse): CreditOverviewPresentation {
  const totalInterest = credit.cards.reduce((sum, card) => sum + card.interest_charged_last_six_months, 0);
  const scoreTone: MetricTone =
    !credit.score_available ? "default" : credit.current_score !== null && credit.current_score < 680 ? "warning" : "success";
  const utilTone = utilizationTone(credit.utilization_pressure);

  if (credit.utilization_pressure >= 0.8) {
    return {
      headline: "Card balances are putting real pressure on credit right now.",
      summary: "The main job here is to protect on-time payments and lower the most-used card before the next statement closes.",
      tone: "urgent",
      scoreTone,
      utilizationTone: utilTone,
      interestTone: totalInterest > 500 ? "warning" : "default"
    };
  }

  if (credit.utilization_pressure >= 0.5) {
    return {
      headline: "Credit is okay, but card usage is still heavier than ideal.",
      summary: "The next improvement usually comes from focusing extra payments on one balance instead of spreading them thin.",
      tone: "important",
      scoreTone,
      utilizationTone: utilTone,
      interestTone: totalInterest > 250 ? "warning" : "default"
    };
  }

  return {
    headline: "Credit usage is in a steadier range right now.",
    summary: "The main goal is to stay current and keep balances low before the next statement dates.",
    tone: "safe",
    scoreTone,
    utilizationTone: utilTone,
    interestTone: totalInterest > 0 ? "primary" : "success"
  };
}

export function buildCreditDriverPresentations(credit: CreditSummaryResponse): CreditDriverPresentation[] {
  const cards = credit.cards;
  const dueCard = nextDueCard(cards);
  const pressureCard = highestPressureCard(cards);
  const offer = activeOffer(cards);
  const totalInterest = cards.reduce((sum, card) => sum + card.interest_charged_last_six_months, 0);

  const items: CreditDriverPresentation[] = [];

  if (offer) {
    items.push({
      title: "A promo balance has a deadline",
      summary: `${offer.card.display_name} has financing that ends on ${formatDate(offer.offer.expires_on)}, so it needs its own payoff pace.`,
      tone: offer.offer.days_remaining <= 45 ? "urgent" : "important"
    });
  }

  if (pressureCard && (pressureCard.utilization_estimate ?? 0) >= 0.75) {
    items.push({
      title: "One card is carrying most of the pressure",
      summary: `${pressureCard.display_name} is using about ${Math.round((pressureCard.utilization_estimate ?? 0) * 100)}% of its limit.`,
      tone: "important"
    });
  }

  if (dueCard) {
    items.push({
      title: "The next due date is clear",
      summary: `${dueCard.display_name} is due on ${formatDate(dueCard.due_date)}, with a minimum of ${formatCurrency(dueCard.minimum_payment ?? 0)}.`,
      tone: daysUntil(dueCard.due_date) !== null && (daysUntil(dueCard.due_date) ?? 99) <= 3 ? "urgent" : "default"
    });
  }

  if (totalInterest > 0) {
    items.push({
      title: "Interest is still draining cash",
      summary: `These cards have added about ${formatCurrency(totalInterest)} in interest over the last 6 months.`,
      tone: totalInterest > 500 ? "important" : "default"
    });
  }

  if (items.length === 0) {
    items.push({
      title: "Nothing urgent is jumping out",
      summary: "The seeded history does not show a strong short-term credit risk right now.",
      tone: "safe"
    });
  }

  return items.slice(0, 3);
}

export function buildCreditCardPresentations(cards: CreditCard[], priorityCardId: string | null): CreditCardPresentation[] {
  return [...cards]
    .sort((left, right) => {
      if (left.id === priorityCardId) return -1;
      if (right.id === priorityCardId) return 1;
      return (right.utilization_estimate ?? 0) - (left.utilization_estimate ?? 0);
    })
    .map((card) => {
      const offer = card.deferred_interest_offers
        .filter((item) => item.status !== "expired")
        .sort((left, right) => left.days_remaining - right.days_remaining)[0];
      const target = buildUsageTarget(card);
      const dueIn = daysUntil(card.due_date);
      const closeIn = daysUntil(card.statement_close_date);
      const highUse = (card.utilization_estimate ?? 0) >= 0.75;

      let badge: string | null = null;
      let badgeTone: PillTone = "default";
      let summary = "This card is in a steadier range right now.";
      let nextStep = "Stay current and keep the reported balance low.";

      if (card.id === priorityCardId) {
        badge = "Start here";
        badgeTone = "important";
      }

      if (offer) {
        badge = offer.days_remaining <= 45 ? "Promo deadline" : "Promo balance";
        badgeTone = offer.days_remaining <= 45 ? "urgent" : "important";
        summary = `${offer.label} still has time pressure, so this card needs a specific monthly pace.`;
        nextStep = `Keep at least ${formatCurrency(card.minimum_monthly_payment_to_avoid_deferred_interest ?? offer.required_monthly_payment_to_avoid_deferred_interest)} moving each month before ${formatDate(offer.expires_on)}.`;
      } else if (dueIn !== null && dueIn <= 7) {
        summary = `The next due date is close, so the minimum should be covered before optional balance cleanup.`;
        nextStep = `Pay at least the minimum by ${formatDate(card.due_date)}.`;
      } else if (highUse && closeIn !== null && closeIn <= 10) {
        summary = `High usage on this card is likely to matter most if it stays elevated through the next statement close.`;
        nextStep = `If possible, pay before ${formatDate(card.statement_close_date)} so a lower balance is reported.`;
      } else if (highUse) {
        summary = "This card is carrying high usage and is likely weighing on overall credit more than the others.";
        nextStep = "Use extra payments here before spreading money across lower-pressure cards.";
      } else if ((card.utilization_estimate ?? 0) > 0.3) {
        summary = "This card is not in crisis, but lowering it would still help overall card usage.";
        nextStep = "Once the highest-pressure card is handled, this is the next cleanup candidate.";
      }

      const statementCloseSummary = card.statement_close_date
        ? `The next reported balance is likely to lock in around ${formatDate(card.statement_close_date)}.`
        : "Statement-close timing is not available from this connection yet.";

      const interestSummary =
        card.interest_charged_last_six_months > 0
          ? `Interest has added about ${formatCurrency(card.interest_charged_last_six_months)} over the last 6 months.`
          : "No recent interest charges were detected in the seeded history.";

      return {
        id: card.id,
        badge,
        badgeTone,
        summary,
        nextStep,
        targetLabel: target.label,
        targetAmount: target.amount,
        targetDetail: target.detail,
        utilizationLabel: utilizationLabel(card.utilization_estimate),
        utilizationTone: utilizationTone(card.utilization_estimate),
        statementCloseSummary,
        interestSummary,
        isPriority: card.id === priorityCardId,
        hasOffer: Boolean(offer)
      };
    });
}
