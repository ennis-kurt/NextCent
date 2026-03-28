export type VelocityStatus = "safe" | "caution" | "likely_overspend";
export type RecommendationUrgency = "urgent" | "important" | "routine";
export type RiskSeverity = "urgent" | "important" | "informational";

export interface PersonaSummary {
  id: string;
  name: string;
  archetype: string;
  summary: string;
  health_score: number;
  safe_to_spend_this_week: number;
  top_priority_title: string;
}

export interface BalanceSummary {
  total_cash: number;
  total_debt: number;
  net_worth_proxy: number;
  liquid_cash: number;
  checking_balance: number;
  savings_balance: number;
}

export interface CategorySpend {
  category_key: string;
  label: string;
  amount: number;
  share: number;
  trend_vs_baseline: number | null;
}

export interface HealthBreakdown {
  cash_flow_stability: number;
  debt_burden: number;
  utilization_health: number;
  fee_and_interest_leakage: number;
  emergency_buffer_strength: number;
  spending_discipline: number;
  payment_stability: number;
}

export interface FinancialHealthScore {
  overall_score: number;
  cash_flow_score: number;
  debt_score: number;
  credit_health_score: number;
  subscription_efficiency_score: number;
  risk_exposure_score: number;
  factor_breakdown: HealthBreakdown;
  drivers: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  summary: string;
  rationale: string;
  impact_estimate: string;
  urgency: RecommendationUrgency;
  confidence: number;
  category: string;
  affected_accounts: string[];
  suggested_action_amount: number | null;
  why_now: string;
  assumptions: string[];
  created_at: string;
  priority_score: number;
}

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  category: string;
  title: string;
  summary: string;
  rationale: string;
  affected_account_ids: string[];
  data: Record<string, unknown>;
  is_active: boolean;
}

export interface SafeToSpendSnapshot {
  safe_to_spend_today: number;
  safe_to_spend_this_week: number;
  safe_to_spend_until_payday: number;
  spending_velocity_status: VelocityStatus;
  projected_zero_date: string | null;
  guidance_summary: string;
  expected_income_before_payday: number;
  fixed_obligations_before_payday: number;
  risk_buffer: number;
  savings_floor: number;
}

export interface DebtStrategyCard {
  strategy: "avalanche" | "snowball" | "cash_preserving" | "utilization_improving";
  title: string;
  prioritizes: string;
  why_choose_it: string;
  monthly_payment_pool: number;
  projected_payoff_months: number;
  projected_payoff_date: string;
  projected_interest_cost: number;
  liquidity_impact: string;
  tradeoffs: string;
  suggested_allocations: Array<{
    account_id: string;
    suggested_payment: number;
    minimum_payment: number;
    utilization_estimate: number;
  }>;
}

export interface DebtStrategyRun {
  recommended_strategy: string;
  rationale: string;
  strategies: DebtStrategyCard[];
}

export interface SubscriptionSummary {
  id: string;
  merchant_key: string;
  label: string;
  monthly_amount: number;
  next_expected_at: string;
  confidence: number;
  waste_risk: string;
  action_status: string;
}

export interface MonthlyReview {
  month_start: string;
  summary: string;
  improved: string[];
  worsened: string[];
  total_spending: number;
  income: number;
  debt_progress: string;
  fees_and_interest_paid: number;
  next_month_actions: string[];
}

export interface DashboardResponse {
  persona_id: string;
  persona_name: string;
  archetype: string;
  balance_summary: BalanceSummary;
  financial_health: FinancialHealthScore;
  safe_to_spend: SafeToSpendSnapshot;
  top_recommendations: Recommendation[];
  risks: RiskAlert[];
  spend_by_category: CategorySpend[];
  subscriptions_total: number;
  fee_and_interest_leakage: number;
  net_monthly_cash_flow: number;
}

export interface CashFlowResponse {
  monthly_income: number;
  monthly_spending: number;
  monthly_fixed_expenses: number;
  monthly_variable_expenses: number;
  discretionary_spending: number;
  forecasted_month_end_balance: number;
  paycheck_to_paycheck_view: Record<string, string | number | null>;
  spending_velocity: Record<string, string | number | null>;
  category_breakdown: CategorySpend[];
  monthly_series: Array<{
    month: string;
    income: number;
    spending: number;
    net: number;
  }>;
}

export interface CreditSummaryResponse {
  current_score: number | null;
  score_available: boolean;
  trend_label: string;
  utilization_pressure: number;
  payment_behavior: string;
  actionable_suggestions: string[];
  cards: Array<{
    id: string;
    display_name: string;
    sanitized_name: string;
    institution_name: string;
    account_type: string;
    subtype: string;
    current_balance: number;
    available_balance: number;
    pending_balance: number;
    credit_limit: number | null;
    minimum_payment: number | null;
    due_date: string | null;
    utilization_estimate: number | null;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cited_metrics: string[];
  assumptions: string[];
  created_at: string;
}

export interface ChatTranscript {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface ChatAnswer {
  session_id: string;
  answer: string;
  facts: string[];
  estimates: string[];
  cited_metrics: string[];
  assumptions: string[];
  suggested_prompts: string[];
  source_cards: Array<Record<string, unknown>>;
}

export interface SimulationRequest {
  persona_id: string;
  name: string;
  scenario_type:
    | "new_monthly_expense"
    | "extra_debt_payment"
    | "cancel_subscriptions"
    | "reduce_category_spend"
    | "move_to_savings";
  amount?: number;
  category_key?: string;
  subscription_ids?: string[];
  account_id?: string;
  notes?: string;
}

export interface SimulationResult {
  scenario_id: string;
  summary: string;
  comfort_level: "comfortable" | "tight" | "risky";
  facts: string[];
  estimates: string[];
  warnings: string[];
  assumptions: string[];
  current_state: Record<string, string | number | null>;
  simulated_state: Record<string, string | number | null>;
  deltas: Record<string, string | number | null>;
}

export interface SimulationHistoryItem {
  scenario_id: string;
  name: string;
  scenario_type:
    | "new_monthly_expense"
    | "extra_debt_payment"
    | "cancel_subscriptions"
    | "reduce_category_spend"
    | "move_to_savings";
  created_at: string;
  result: SimulationResult;
}
