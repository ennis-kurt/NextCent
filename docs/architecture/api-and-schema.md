# API And Schema Reference

## Core endpoints

- `GET /health`
- `GET /api/v1/personas`
- `POST /api/v1/personas/{persona_id}/activate`
- `GET /api/v1/dashboard`
- `GET /api/v1/accounts`
- `GET /api/v1/balances`
- `GET /api/v1/transactions`
- `GET /api/v1/categories`
- `GET /api/v1/cash-flow`
- `GET /api/v1/subscriptions`
- `GET /api/v1/credit-summaries`
- `GET /api/v1/financial-health`
- `GET /api/v1/recommendations`
- `GET /api/v1/alerts`
- `GET /api/v1/monthly-reviews`
- `GET /api/v1/safe-to-spend`
- `GET /api/v1/debt-strategies`
- `POST /api/v1/simulate`
- `POST /api/v1/subscriptions/{id}/draft-cancellation`
- `GET /api/v1/subscriptions/{id}/cancellation-link`
- `GET /api/v1/privacy/sanitization-policy`
- `GET /api/v1/agent-traces/{id}/sanitized-input`
- `POST /api/v1/chat/sessions`
- `POST /api/v1/chat/messages`
- `GET /api/v1/admin/seed-scenarios`
- `GET /api/v1/admin/agent-runs/{id}`

## Relational tables

- `users`
- `connected_accounts`
- `account_balance_snapshots`
- `transactions`
- `transaction_categories`
- `recurring_charges`
- `credit_card_summaries`
- `financial_health_scores`
- `risk_alerts`
- `recommendations`
- `recommendation_history`
- `monthly_reviews`
- `chat_sessions`
- `chat_messages`
- `sync_runs`
- `agent_runs`
- `simulation_scenarios`
- `simulation_results`
- `sanitized_ai_views`
- `safe_to_spend_snapshots`
- `debt_strategy_runs`
- `merchant_action_metadata`
- `privacy_policy_logs`
- `llm_payload_audit_logs`

## Required typed contracts implemented

- `RawTransactionInternal`
- `SanitizedTransactionForAI`
- `SanitizedAccountSummaryForAI`
- `SanitizedRecommendationContext`
- `FinancialHealthScore`
- `RiskAlert`
- `Recommendation`
- `SafeToSpendSnapshot`
- `DebtStrategyResult`
- `SimulationScenario`
- `SimulationResult`
- `ChatAnswer`
- `AgentTrace`

## Seeded scenarios

The MVP ships with ten personas:

1. High debt, strong income
2. Thin checking balance with upcoming bills
3. Subscription-heavy spending
4. Rising dining spend
5. Frequent overdraft fees
6. Good cash, poor payment allocation
7. Healthy cash flow
8. Paycheck to paycheck
9. Recovering after cutting expenses
10. Credit pressure from high utilization
