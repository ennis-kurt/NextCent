# Personal Accountant AI

Personal Accountant AI is a production-style seeded MVP for a privacy-first personal finance web app. It combines deterministic financial analysis with an agentic explanation layer to help users understand cash flow, debt stress, subscription waste, Safe to Spend, and the next best action.

## What is implemented

- FastAPI backend with seeded personas, SQLite persistence, deterministic finance engines, sanitization policy enforcement, audit logging, debt strategy comparison, simulation, and grounded chat
- Next.js web app scaffold for landing, onboarding, dashboard, cash flow, debt optimizer, credit health, subscriptions, simulation, monthly review, chat, and privacy screens
- Shared TypeScript API contracts and design-token package
- Documentation for architecture, formulas, privacy posture, and brand system

## Repo structure

```text
apps/
  api/   FastAPI app, SQLite schema, seeded data, finance services, tests
  web/   Next.js App Router interface and premium component system
packages/
  api-contracts/   Shared TypeScript contracts
  design-tokens/   Token source files
  mock-scenarios/  Seeded persona and merchant metadata
docs/
  architecture/    Runtime architecture and schema notes
  branding/        Brand, visual, and UX-writing direction
scripts/
  bootstrap_api.sh
  run_api.sh
  run_web.sh
```

## Local setup

### API

```bash
cd apps/api
/opt/homebrew/opt/python@3.14/bin/python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install fastapi==0.135.2 'uvicorn[standard]==0.42.0' pydantic==2.12.5 sqlalchemy==1.4.39 python-dateutil==2.9.0.post0 eval_type_backport==0.2.2 httpx==0.28.1 pytest==8.3.5
python -m uvicorn app.main:app --reload
```

### API tests

```bash
cd apps/api
source .venv/bin/activate
python -m pytest
```

### Web

```bash
cd apps/web
pnpm install
pnpm dev
```

Set `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1` for the default local split-stack setup.

## Notes about this workspace

- The Python backend was verified locally with `pytest` and by starting Uvicorn.
- The current machine did not have `node`, `npm`, `pnpm`, or Docker installed while implementing this repo, so the Next.js app was scaffolded but not executed here.
- SQLite is the local default. The schema is relational and organized to remain Postgres-friendly later.
- External LLM mode is disabled by default. All model-facing payloads must pass through the sanitization service first.

## Trust and disclaimer framework

- The product provides financial guidance and insights, not investment, tax, or legal advice.
- Recommendations are based on available account data plus explicit assumptions where forecasting is involved.
- Users should verify major financial decisions independently.
- The MVP models read-only account access and least-privilege handling.
