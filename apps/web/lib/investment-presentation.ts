import type { CreditSummaryResponse, DebtStrategyRun, InvestmentGuidance } from "@contracts";

type PillTone = "default" | "important" | "urgent" | "safe";
type MetricTone = "default" | "primary" | "warning" | "danger" | "success";

export type InvestmentCoachPresentation = {
  badge: string;
  badgeTone: PillTone;
  headline: string;
  summary: string;
  amountLabel: string;
  amountValue: number;
  amountDetail: string;
  destinationLabel: string;
  destinationValue: string;
  detailSummary: string;
  detail: string[];
};

export type InvestmentPathPresentation = {
  label: string;
  title: string;
  summary: string;
  value: string;
  tone: MetricTone;
  selected: boolean;
};

export type InvestmentStepPresentation = {
  title: string;
  summary: string;
  tone: PillTone;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatMonths(value: number) {
  return `${value.toFixed(1)} months`;
}

function formatApr(value: number | null) {
  return value !== null ? `${value.toFixed(1)}%` : "None";
}

export function buildInvestmentCoachPresentation({
  guidance,
  debt,
  cards
}: {
  guidance: InvestmentGuidance;
  debt: DebtStrategyRun;
  cards: CreditSummaryResponse["cards"];
}): InvestmentCoachPresentation {
  const recommendedDebtStrategy = debt.strategies.find((strategy) => strategy.strategy === debt.recommended_strategy);
  const topDebtTarget = [...(recommendedDebtStrategy?.suggested_allocations ?? [])].sort(
    (left, right) => right.suggested_payment - left.suggested_payment
  )[0];
  const debtTargetCard = cards.find((card) => card.id === String(topDebtTarget?.account_id));

  if (guidance.posture === "invest_now") {
    return {
      badge: "Ready to start",
      badgeTone: "safe",
      headline: "You can start a steady investment contribution now.",
      summary: "Cash flow and buffer strength look solid enough that a modest recurring contribution should not crowd out near-term flexibility.",
      amountLabel: "Suggested monthly amount",
      amountValue: guidance.recommended_investment_amount,
      amountDetail: `Start with about ${formatCurrency(guidance.recommended_investment_amount)} each month in ${guidance.investment_channel.toLowerCase()}.`,
      destinationLabel: "Best place for new dollars",
      destinationValue: guidance.priority_destination,
      detailSummary: "See the debt, buffer, and cash-flow guardrails behind this green light.",
      detail: [guidance.why_now, guidance.rationale, ...guidance.assumptions]
    };
  }

  if (guidance.posture === "buffer_first") {
    return {
      badge: guidance.liquid_buffer_months < 1 ? "Cash first" : "Buffer first",
      badgeTone: guidance.liquid_buffer_months < 1 ? "urgent" : "important",
      headline: "Build your cash cushion before you start investing.",
      summary: "The current near-term buffer is still thin enough that new investing would make the month feel tighter instead of safer.",
      amountLabel: "Move this much to cash first",
      amountValue: guidance.priority_action_amount,
      amountDetail: `Keep about ${formatCurrency(guidance.priority_action_amount)} in reserve instead of sending it into a market account right now.`,
      destinationLabel: "Best place for extra money",
      destinationValue: "Cash reserve",
      detailSummary: "See why the app is protecting liquidity first.",
      detail: [guidance.why_now, guidance.rationale, ...guidance.assumptions]
    };
  }

  return {
    badge: "Debt first",
    badgeTone: "important",
    headline: "Pay debt before starting a new investment contribution.",
    summary: "The current interest drag is strong enough that debt payoff is still the cleaner next-dollar move.",
    amountLabel: "Use this for debt now",
    amountValue: guidance.priority_action_amount,
      amountDetail:
        debtTargetCard && topDebtTarget
        ? `Keep minimums current, then send about ${formatCurrency(topDebtTarget.extra_payment ?? topDebtTarget.suggested_payment)} extra to ${debtTargetCard.display_name} before starting a new investment contribution.`
        : `Use about ${formatCurrency(guidance.priority_action_amount)} for debt reduction before starting a new investment contribution.`,
    destinationLabel: "Best place for extra money",
    destinationValue: debtTargetCard ? debtTargetCard.display_name : guidance.priority_destination,
    detailSummary: "See why debt is outranking investing right now.",
    detail: [guidance.why_now, guidance.rationale, ...guidance.assumptions]
  };
}

export function buildInvestmentPathPresentations(guidance: InvestmentGuidance): InvestmentPathPresentation[] {
  return [
    {
      label: "Cash reserve",
      title: "Keep more money liquid",
      summary: "This is where extra money belongs when near-term flexibility is still fragile.",
      value: formatMonths(guidance.liquid_buffer_months),
      tone: guidance.posture === "buffer_first" ? "primary" : "default",
      selected: guidance.posture === "buffer_first"
    },
    {
      label: "Debt paydown",
      title: "Reduce guaranteed drag",
      summary: "This is strongest when current card APRs are beating any realistic low-risk investing outcome.",
      value: formatApr(guidance.max_apr),
      tone: guidance.posture === "debt_first" ? "warning" : "default",
      selected: guidance.posture === "debt_first"
    },
    {
      label: "Investing",
      title: "Start long-term investing",
      summary: "This becomes the right move when surplus is stable and debt drag is contained.",
      value: formatCurrency(guidance.recommended_investment_amount),
      tone: guidance.posture === "invest_now" ? "success" : "default",
      selected: guidance.posture === "invest_now"
    }
  ];
}

export function buildInvestmentStepPresentations(guidance: InvestmentGuidance): InvestmentStepPresentation[] {
  if (guidance.posture === "invest_now") {
    return [
      {
        title: "Start with a repeatable amount",
        summary: `Set ${formatCurrency(guidance.recommended_investment_amount)} as a monthly contribution rather than swinging between large one-offs.`,
        tone: "safe"
      },
      {
        title: "Use a simple channel",
        summary: `${guidance.investment_channel} keeps the recommendation easy to continue instead of turning it into stock-picking homework.`,
        tone: "default"
      },
      {
        title: "Do not pull from your buffer",
        summary: "Only invest money that is still left after near-term bills, minimum debt payments, and your cash cushion are covered.",
        tone: "important"
      }
    ];
  }

  if (guidance.posture === "buffer_first") {
    return [
      {
        title: "Pause new investing",
        summary: "A small reserve shortfall matters more than getting a contribution started a few weeks early.",
        tone: "important"
      },
      {
        title: "Build liquid cash first",
        summary: `Move about ${formatCurrency(guidance.priority_action_amount)} toward reserve-building before opening up a new investing amount.`,
        tone: "safe"
      },
      {
        title: "Recheck after the next cash reset",
        summary: "Once the month stops feeling tight before payday, investing becomes easier to sustain.",
        tone: "default"
      }
    ];
  }

  return [
    {
      title: "Treat high APR like a guaranteed drag",
      summary: "If a card is charging well above typical low-risk returns, paying that balance down is the more reliable win.",
      tone: "important"
    },
    {
      title: "Use focused debt payments",
      summary: `Send about ${formatCurrency(guidance.priority_action_amount)} to the current debt priority instead of splitting it across investing and debt.`,
      tone: "safe"
    },
    {
      title: "Start investing after the drag drops",
      summary: "Once interest leakage and APR pressure cool down, the same surplus can shift into long-term investing.",
      tone: "default"
    }
  ];
}
