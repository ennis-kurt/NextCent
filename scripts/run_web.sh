#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../apps/web"
pnpm install
pnpm dev
