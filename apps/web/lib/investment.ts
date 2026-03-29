import type { DashboardResponse, DebtStrategyRun, InvestmentGuidance } from "@contracts";

export type DashboardResponseCompat = Omit<DashboardResponse, "investment_guidance"> & {
  investment_guidance?: InvestmentGuidance | null;
};

export function resolveInvestmentGuidance({
  dashboard,
  debt,
  directGuidance
}: {
  dashboard: DashboardResponseCompat;
  debt: DebtStrategyRun;
  directGuidance?: InvestmentGuidance | null;
}) {
  const guidance = directGuidance ?? dashboard.investment_guidance;

  if (guidance) {
    return {
      guidance,
      isFallback: false
    };
  }

  return {
    guidance: deriveInvestmentGuidanceFallback(dashboard, debt),
    isFallback: true
  };
}

function deriveInvestmentGuidanceFallback(
  dashboard: DashboardResponseCompat,
  debt: DebtStrategyRun
): InvestmentGuidance {
  const monthlySurplus = Math.max(0, dashboard.net_monthly_cash_flow);
  const safe = dashboard.safe_to_spend;
  const feeLeakage = dashboard.fee_and_interest_leakage;
  const emergencyBufferStrength = dashboard.financial_health.factor_breakdown.emergency_buffer_strength;
  const liquidBufferMonths = Number((emergencyBufferStrength / 55).toFixed(2));
  const recommendedDebtStrategy = debt.strategies.find((strategy) => strategy.strategy === debt.recommended_strategy);
  const topDebtTarget = [...(recommendedDebtStrategy?.suggested_allocations ?? [])].sort(
    (left, right) => right.suggested_payment - left.suggested_payment
  )[0];

  const fragileRunway =
    safe.spending_velocity_status !== "safe" ||
    safe.safe_to_spend_until_payday < safe.risk_buffer * 0.75 ||
    monthlySurplus < 100;

  if (fragileRunway) {
    const bufferAmount = roundMoney(Math.max(0, Math.min(monthlySurplus * 0.35, Math.max(125, safe.risk_buffer * 0.4))));

    return {
      posture: "buffer_first",
      title: "Hold new investing until the cash buffer is steadier",
      summary: "Near-term cash pressure is still high enough that starting an investment contribution would reduce flexibility.",
      rationale: "The current runway to payday looks narrow relative to the risk buffer, so the next dollars should stay liquid before they move into market exposure.",
      recommended_investment_amount: 0,
      priority_action_amount: bufferAmount,
      priority_destination: "Cash reserve",
      investment_channel: "Not ready for market investing yet",
      cadence: "monthly",
      monthly_surplus: monthlySurplus,
      fee_and_interest_leakage: feeLeakage,
      max_apr: null,
      liquid_buffer_months: liquidBufferMonths,
      why_now: "This is a compatibility estimate from dashboard data while the detailed investment service is unavailable.",
      assumptions: [
        "Current bill cadence and income timing remain stable.",
        "Liquid cash is the first source of protection for near-term surprises."
      ]
    };
  }

  const highDebtPressure = feeLeakage >= 45 || dashboard.financial_health.debt_score < 60;

  if (highDebtPressure) {
    const debtAmount = roundMoney(
      Math.max(
        0,
        topDebtTarget?.suggested_payment ?? Math.min(monthlySurplus * 0.55, Math.max(feeLeakage * 4, 150))
      )
    );

    return {
      posture: "debt_first",
      title: "Debt payoff outranks investing right now",
      summary: "The current interest drag is high enough that paying down debt is the stronger guaranteed return.",
      rationale: "When revolving debt is still draining cash each month, reducing that balance is the cleaner use of surplus cash than starting a new investment contribution.",
      recommended_investment_amount: 0,
      priority_action_amount: debtAmount,
      priority_destination: "Debt paydown",
      investment_channel: "Redirect surplus to the highest-impact card first",
      cadence: "this_cycle",
      monthly_surplus: monthlySurplus,
      fee_and_interest_leakage: feeLeakage,
      max_apr: null,
      liquid_buffer_months: liquidBufferMonths,
      why_now: "This is a compatibility estimate from dashboard data while the detailed investment service is unavailable.",
      assumptions: [
        "Trailing fee and interest leakage is a reasonable proxy for active debt pressure.",
        "Minimum payments are already covered before extra dollars are allocated."
      ]
    };
  }

  const investmentAmount = roundMoney(Math.max(50, Math.min(monthlySurplus * 0.3, safe.safe_to_spend_this_week * 1.8)));

  return {
    posture: "invest_now",
    title: "Start a steady investment contribution",
    summary: "Current cash flow, buffer strength, and debt pressure support a modest recurring contribution.",
    rationale: "There is positive surplus after current obligations, debt drag looks contained, and the current cushion appears strong enough to support long-term investing.",
    recommended_investment_amount: investmentAmount,
    priority_action_amount: investmentAmount,
    priority_destination: "Diversified index fund",
    investment_channel: "Broad-market index fund",
    cadence: "monthly",
    monthly_surplus: monthlySurplus,
    fee_and_interest_leakage: feeLeakage,
    max_apr: null,
    liquid_buffer_months: liquidBufferMonths,
    why_now: "This is a compatibility estimate from dashboard data while the detailed investment service is unavailable.",
    assumptions: [
      "Surplus cash is stable enough to repeat monthly.",
      "Current debt pressure is low enough that investing is no longer clearly dominated by debt payoff."
    ]
  };
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
