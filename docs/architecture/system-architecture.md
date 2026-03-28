# Personal Accountant AI System Architecture

## Product shape

- `apps/web`: Next.js App Router UI for landing, onboarding, dashboard, cash flow, debt optimizer, credit health, subscriptions, simulation, monthly review, chat, and privacy surfaces.
- `apps/api`: FastAPI service for seeded ingestion, deterministic finance logic, sanitization, simulation, chat orchestration, and persistence.
- `packages/mock-scenarios`: scenario definitions and merchant action metadata for the seeded MVP.
- `packages/api-contracts`: shared TypeScript contracts for the web app.
- `packages/design-tokens`: source-of-truth color, radius, and elevation tokens.

## Runtime architecture

1. Seed personas are generated into SQLite on API startup.
2. The analysis pipeline persists derived artifacts:
   - credit summaries
   - recurring charges
   - financial health scores
   - risk alerts
   - recommendations
   - safe-to-spend snapshots
   - debt strategy runs
   - monthly reviews
   - agent traces
   - sanitized AI views
   - LLM payload audit logs
3. The web app consumes typed REST endpoints and renders premium finance workflows over the seeded personas.

## Agent orchestration

Ordered pipeline:

1. `data_ingestion`
2. `categorization`
3. `financial_analysis`
4. `risk_detection`
5. `safe_to_spend`
6. `debt_strategy`
7. `recommendation`
8. `explanation`
9. `notification`

Each run stores sanitized input plus deterministic outputs in `agent_runs`.

## Privacy boundary

- Raw financial records are stored in `transactions`, `connected_accounts`, and related relational tables.
- Sanitized AI-ready payloads are stored separately in `sanitized_ai_views`.
- `SanitizationService` applies field policy:
  - safe: category, amount, dates, account type, utilization, minimum payment
  - masked: account alias, merchant alias
  - blocked: raw account numbers, suffixes, raw descriptions, names, addresses, email, phone, institution identifiers when not needed
- Every sanitized payload intended for model use is hashed and audit logged in `llm_payload_audit_logs`.

## Core formulas

### Financial Health

Weighted internal score out of 100:

- cash flow stability: 20%
- debt burden: 20%
- utilization health: 15%
- fee and interest leakage: 15%
- emergency buffer strength: 15%
- spending discipline: 10%
- payment stability: 5%

### Recommendation priority

`0.30 urgency + 0.25 impact + 0.20 risk_reduction + 0.15 feasibility + 0.10 context_fit`

Deterministic boosts are added for imminent overdraft risk, due dates inside 7 days, repeat fees, and near-threshold utilization relief.

### Safe to Spend

`liquid cash + expected income before payday - fixed obligations before payday - savings floor - risk buffer`

The result is pace-adjusted using trailing discretionary velocity to derive:

- `safe_to_spend_today`
- `safe_to_spend_this_week`
- `safe_to_spend_until_payday`
- `projected_zero_date`

### Debt strategies

All strategies pay minimums first, respect liquidity floors, and then allocate extra capacity by strategy:

- Avalanche: highest APR first
- Snowball: smallest balance first
- Cash Preserving: due-date and liquidity protection first
- Utilization Improving: highest utilization pressure first
