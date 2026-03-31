import type { CreditSummaryResponse, DashboardResponse, DebtStrategyRun, InvestmentGuidance, Recommendation, RiskAlert } from "@contracts";
import type { DashboardResponseCompat } from "@/lib/investment";

type StatusTone = "safe" | "important" | "urgent";

export type DashboardCoachPresentation = {
  badge: string;
  badgeTone: StatusTone;
  headline: string;
  summary: string;
  amountLabel: string;
  amountValue: number;
  amountDetail: string;
  contextLabel: string;
  contextValue: number;
  detailSummary: string;
  detail: string[];
  plannerHref: string;
  plannerLabel: string;
};

export type DashboardRunwayPresentation = {
  status: string;
  tone: StatusTone;
  summary: string;
  mathSummary: string;
};

export type DashboardFocusCardPresentation = {
  key: "spending" | "debt" | "credit" | "investing";
  label: string;
  title: string;
  metricLabel: string;
  metricValue: number | string;
  summary: string;
  href: string;
  cta: string;
  tone: "default" | "primary" | "warning" | "success";
  bars?: Array<{
    label: string;
    amount: number;
    share: number;
  }>;
};

export type DashboardWatchPresentation = {
  id: string;
  title: string;
  summary: string;
  tone: StatusTone;
  href: string;
  cta: string;
};

function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

function mapUrgency(urgency?: Recommendation["urgency"]): { label: string; tone: StatusTone } {
  if (urgency === "urgent") return { label: "Do this now", tone: "urgent" };
  if (urgency === "important") return { label: "Start here", tone: "important" };
  return { label: "Worth doing next", tone: "safe" };
}

function mapVelocityStatus(status: DashboardResponse["safe_to_spend"]["spending_velocity_status"]) {
  if (status === "likely_overspend") {
    return {
      status: "Tight right now",
      tone: "urgent" as const,
      summary: "Bills and minimums are leaving very little room before the next paycheck.",
      mathSummary: "See what is already spoken for before payday."
    };
  }

  if (status === "caution") {
    return {
      status: "Watch spending",
      tone: "important" as const,
      summary: "You still have room, but the current pace is getting close to what this week can support.",
      mathSummary: "Check the numbers behind this week’s limit."
    };
  }

  return {
    status: "Comfortable",
    tone: "safe" as const,
    summary: "You have room to keep spending steady without pressing on near-term bills.",
    mathSummary: "Review what’s already reserved before payday."
  };
}

function watchHrefForRisk(risk: RiskAlert, personaId: string) {
  if (risk.category === "utilization") {
    return {
      href: `/app/credit-health?persona=${personaId}`,
      cta: "Open Credit Health"
    };
  }

  if (risk.category === "interest_leakage") {
    return {
      href: `/app/debt-optimizer?persona=${personaId}`,
      cta: "Open Debt Optimizer"
    };
  }

  return {
    href: `/app/cash-flow?persona=${personaId}`,
    cta: "Open Cash Flow"
  };
}

function investmentTitle(investment: InvestmentGuidance) {
  if (investment.posture === "invest_now") return "You can start investing without crowding out essentials.";
  if (investment.posture === "buffer_first") return "Keep more cash on hand before you invest.";
  return "Debt should still beat investing right now.";
}

function investmentSummary(investment: InvestmentGuidance) {
  if (investment.posture === "invest_now") {
    return `Start with ${investment.investment_channel.toLowerCase()} while keeping your current cash buffer intact.`;
  }

  if (investment.posture === "buffer_first") {
    return `Build cash toward ${investment.priority_destination.toLowerCase()} before starting a new contribution.`;
  }

  return `Use extra money for ${investment.priority_destination.toLowerCase()} before opening a new investing habit.`;
}

function simulationHref({
  personaId,
  mode,
  amount,
  cadence,
  label
}: {
  personaId: string;
  mode: "affordability" | "allocation";
  amount: number;
  cadence: "one_time" | "monthly";
  label: string;
}) {
  const params = new URLSearchParams({
    persona: personaId,
    mode,
    amount: String(Math.max(0, Math.round(amount))),
    cadence,
    label
  });
  return `/app/simulation?${params.toString()}`;
}

export function buildDashboardCoachPresentation({
  personaId,
  dashboard,
  debt,
  credit,
  investment
}: {
  personaId: string;
  dashboard: DashboardResponseCompat;
  debt: DebtStrategyRun;
  credit: CreditSummaryResponse;
  investment: InvestmentGuidance;
}): DashboardCoachPresentation {
  const recommendation = dashboard.top_recommendations[0];
  const { label, tone } = mapUrgency(recommendation?.urgency);
  const preferredStrategy = debt.strategies.find((strategy) => strategy.strategy === debt.recommended_strategy);
  const debtTarget = preferredStrategy?.suggested_allocations[0];
  const debtTargetCard = credit.cards.find((card) => card.id === String(debtTarget?.account_id));
  const userFirstName = firstName(dashboard.persona_name);

  if (recommendation?.category === "cash_flow") {
    return {
      badge: label,
      badgeTone: tone,
      headline: `${userFirstName}, keep this week tighter until the next paycheck.`,
      summary: "Your weekly room is narrow enough that holding off on extra spending matters more than any other move right now.",
      amountLabel: "Protect at least",
      amountValue: dashboard.safe_to_spend.safe_to_spend_this_week,
      amountDetail: "Treat this as your practical limit until the next refresh.",
      contextLabel: "Money left this week",
      contextValue: dashboard.safe_to_spend.safe_to_spend_this_week,
      detailSummary: "See why this is the best move right now.",
      detail: [
        recommendation.rationale,
        recommendation.why_now,
        recommendation.impact_estimate
      ],
      plannerHref: simulationHref({
        personaId,
        mode: "affordability",
        amount: dashboard.safe_to_spend.safe_to_spend_this_week,
        cadence: "one_time",
        label: "Extra spending this week"
      }),
      plannerLabel: "Test this in Simulation"
    };
  }

  if (recommendation?.category === "subscriptions") {
    return {
      badge: label,
      badgeTone: tone,
      headline: `${userFirstName}, cut a few recurring charges before they renew again.`,
      summary: "Recurring charges are one of the easiest ways to free up money without changing the essentials.",
      amountLabel: "Monthly relief to target",
      amountValue: recommendation.suggested_action_amount ?? dashboard.subscriptions_total,
      amountDetail: "Focus on the lowest-value charges first.",
      contextLabel: "Money left this week",
      contextValue: dashboard.safe_to_spend.safe_to_spend_this_week,
      detailSummary: "See why subscriptions are first right now.",
      detail: [
        recommendation.summary,
        recommendation.rationale,
        recommendation.impact_estimate
      ],
      plannerHref: simulationHref({
        personaId,
        mode: "affordability",
        amount: recommendation.suggested_action_amount ?? dashboard.subscriptions_total,
        cadence: "monthly",
        label: "Subscription cleanup"
      }),
      plannerLabel: "Test this in Simulation"
    };
  }

  if (recommendation?.category === "investment") {
    return {
      badge: label,
      badgeTone: tone,
      headline: `${userFirstName}, start a steady investing habit without crowding out the basics.`,
      summary: "The current mix of cash buffer, surplus, and debt pressure supports starting small and staying consistent.",
      amountLabel: "Start with",
      amountValue: recommendation.suggested_action_amount ?? investment.recommended_investment_amount,
      amountDetail: `A steady ${investment.cadence === "monthly" ? "monthly" : "current-cycle"} contribution is the better move than waiting for a perfect time.`,
      contextLabel: "Money left this week",
      contextValue: dashboard.safe_to_spend.safe_to_spend_this_week,
      detailSummary: "See why investing can start now.",
      detail: [
        recommendation.summary,
        recommendation.rationale,
        recommendation.impact_estimate
      ],
      plannerHref: simulationHref({
        personaId,
        mode: "allocation",
        amount: recommendation.suggested_action_amount ?? investment.recommended_investment_amount,
        cadence: investment.cadence === "monthly" ? "monthly" : "one_time",
        label: "Investment contribution"
      }),
      plannerLabel: "Model this amount"
    };
  }

  if (recommendation?.category === "financial_health") {
    return {
      badge: label,
      badgeTone: tone,
      headline: `${userFirstName}, stop the fees and interest from repeating next month.`,
      summary: "Interest and fee drag is draining money that could stay in your buffer or go toward progress elsewhere.",
      amountLabel: "Leakage to stop",
      amountValue: recommendation.suggested_action_amount ?? dashboard.fee_and_interest_leakage,
      amountDetail: "Fixing this early helps both monthly flexibility and overall money health.",
      contextLabel: "Money left this week",
      contextValue: dashboard.safe_to_spend.safe_to_spend_this_week,
      detailSummary: "See why reducing leakage matters now.",
      detail: [
        recommendation.summary,
        recommendation.rationale,
        recommendation.impact_estimate
      ],
      plannerHref: simulationHref({
        personaId,
        mode: "affordability",
        amount: recommendation.suggested_action_amount ?? dashboard.fee_and_interest_leakage,
        cadence: "monthly",
        label: "Monthly leakage"
      }),
      plannerLabel: "Test this in Simulation"
    };
  }

  const debtExtra = Math.max(
    0,
    Number(recommendation?.suggested_action_amount ?? debtTarget?.extra_payment ?? debtTarget?.suggested_payment ?? dashboard.safe_to_spend.safe_to_spend_this_week)
  );

  return {
    badge: label,
    badgeTone: tone,
    headline: `${userFirstName}, put this week’s extra money toward one card.`,
    summary: debtTargetCard
      ? `${debtTargetCard.display_name} is the clearest place to start right now, and concentrating the payment should do more than spreading it around.`
      : "One focused debt payment should help more than splitting extra cash evenly.",
    amountLabel: "Move this amount",
    amountValue: debtExtra,
    amountDetail: debtTargetCard
      ? `This is the extra amount to direct after minimums stay covered. Start with ${debtTargetCard.sanitized_name}.`
      : "This is the extra amount to direct after minimums are covered.",
    contextLabel: "Money left this week",
    contextValue: dashboard.safe_to_spend.safe_to_spend_this_week,
    detailSummary: "See why this card comes first.",
    detail: [
      recommendation?.summary ?? "This payment order should improve debt progress faster than splitting extra cash.",
      recommendation?.rationale ?? debt.rationale,
      recommendation?.impact_estimate ?? preferredStrategy?.why_choose_it ?? "A focused payment should produce faster visible progress."
    ],
    plannerHref: simulationHref({
      personaId,
      mode: "allocation",
      amount: debtExtra,
      cadence: "one_time",
      label: debtTargetCard ? `Extra payment for ${debtTargetCard.sanitized_name}` : "Extra debt payment"
    }),
    plannerLabel: "Model this amount"
  };
}

export function buildDashboardRunwayPresentation(snapshot: DashboardResponse["safe_to_spend"]): DashboardRunwayPresentation {
  return mapVelocityStatus(snapshot.spending_velocity_status);
}

export function buildDashboardFocusCards({
  personaId,
  dashboard,
  debt,
  credit,
  investment
}: {
  personaId: string;
  dashboard: DashboardResponseCompat;
  debt: DebtStrategyRun;
  credit: CreditSummaryResponse;
  investment: InvestmentGuidance;
}): DashboardFocusCardPresentation[] {
  const topCategories = dashboard.spend_by_category.slice(0, 4);
  const preferredStrategy = debt.strategies.find((strategy) => strategy.strategy === debt.recommended_strategy);
  const debtTarget = preferredStrategy?.suggested_allocations[0];
  const debtTargetCard = credit.cards.find((card) => card.id === String(debtTarget?.account_id));
  const debtExtra = Math.max(0, Number(debtTarget?.extra_payment ?? debtTarget?.suggested_payment ?? 0));
  const avoidableCosts = dashboard.subscriptions_total + dashboard.fee_and_interest_leakage;

  return [
    {
      key: "spending",
      label: "Spending",
      title: "A few categories are doing most of the work this month.",
      metricLabel: "Avoidable costs",
      metricValue: avoidableCosts,
      summary: `Subscriptions and recent fees are taking another bite on top of everyday spending.`,
      href: `/app/cash-flow?persona=${personaId}`,
      cta: "Open Cash Flow",
      tone: dashboard.fee_and_interest_leakage > 80 ? "warning" : "default",
      bars: topCategories.map((item) => ({
        label: item.label,
        amount: item.amount,
        share: item.share
      }))
    },
    {
      key: "debt",
      label: "Debt",
      title: debtTargetCard
        ? `${debtTargetCard.sanitized_name} should get the extra payment.`
        : "One debt target matters more than spreading payments around.",
      metricLabel: "Extra after minimums",
      metricValue: debtExtra,
      summary: debtTargetCard
        ? `Keep minimums current, then direct the extra amount to ${debtTargetCard.display_name}.`
        : "Focus extra money on one target after minimums are covered.",
      href: `/app/debt-optimizer?persona=${personaId}`,
      cta: "Open Debt Optimizer",
      tone: "warning"
    },
    {
      key: "credit",
      label: "Credit",
      title:
        credit.utilization_pressure > 0.7
          ? "Card usage is still weighing on your credit."
          : credit.utilization_pressure > 0.45
            ? "Credit pressure is improving, but one card still needs watching."
            : "Credit pressure looks manageable right now.",
      metricLabel: "Usage pressure",
      metricValue: `${Math.round(credit.utilization_pressure * 100)}%`,
      summary: `Your credit trend is ${credit.trend_label.toLowerCase()}, and payment behavior is currently ${credit.payment_behavior.toLowerCase()}.`,
      href: `/app/credit-health?persona=${personaId}`,
      cta: "Open Credit Health",
      tone: credit.utilization_pressure > 0.7 ? "warning" : "primary"
    },
    {
      key: "investing",
      label: "Investing",
      title: investmentTitle(investment),
      metricLabel: investment.posture === "invest_now" ? "Start with" : "Put this here first",
      metricValue: investment.posture === "invest_now" ? investment.recommended_investment_amount : investment.priority_action_amount,
      summary: investmentSummary(investment),
      href: `/app/investment?persona=${personaId}`,
      cta: "Open Investment",
      tone: investment.posture === "invest_now" ? "success" : investment.posture === "buffer_first" ? "primary" : "warning"
    }
  ];
}

export function buildDashboardWatchList({
  personaId,
  risks
}: {
  personaId: string;
  risks: DashboardResponse["risks"];
}): DashboardWatchPresentation[] {
  return risks.slice(0, 2).map((risk) => {
    const nextStep = watchHrefForRisk(risk, personaId);

    return {
      id: risk.id,
      title: risk.title,
      summary: risk.summary,
      tone: risk.severity === "urgent" ? "urgent" : risk.severity === "important" ? "important" : "safe",
      href: nextStep.href,
      cta: nextStep.cta
    };
  });
}
