#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../apps/api"
PYTHON_BIN="${HOMEBREW_PYTHON_BIN:-/opt/homebrew/opt/python@3.14/bin/python3}"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="${PYTHON_BIN_FALLBACK:-python}"
fi
if [ ! -x ".venv/bin/python" ]; then
  "$PYTHON_BIN" -m venv .venv
  . .venv/bin/activate
  python -m pip install --upgrade pip
  python -m pip install fastapi==0.135.2 'uvicorn[standard]==0.42.0' pydantic==2.12.5 sqlalchemy==1.4.39 python-dateutil==2.9.0.post0 eval_type_backport==0.2.2 httpx==0.28.1 pytest==8.3.5
else
  . .venv/bin/activate
fi
python -m uvicorn app.main:app --reload
