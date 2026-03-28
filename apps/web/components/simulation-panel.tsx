"use client";

import type { SimulationHistoryItem, SimulationResult } from "@contracts";
import { useId, useState, useTransition } from "react";

import { getSimulationHistory, runSimulation } from "@/lib/api";
import { formatCurrency, formatDateTime, formatNumber, titleCase } from "@/lib/format";

import { SectionCard } from "./section-card";
import { StatusPill } from "./status-pill";

const scenarioOptions = [
  { value: "new_monthly_expense", label: "New monthly expense" },
  { value: "extra_debt_payment", label: "Extra debt payment" },
  { value: "cancel_subscriptions", label: "Cancel subscriptions" },
  { value: "reduce_category_spend", label: "Reduce category spend" },
  { value: "move_to_savings", label: "Move cash to savings" }
] as const;

function formatDelta(key: string, value: string | number | null) {
  if (typeof value !== "number") return value === null ? "No change" : String(value);
  if (key === "health_score") {
    const scoreValue = Number.isInteger(value) ? formatNumber(value) : value.toFixed(1);
    return `${value > 0 ? "+" : ""}${scoreValue}`;
  }

  const magnitude = formatCurrency(Math.abs(value));
  if (value === 0) return magnitude;
  return `${value > 0 ? "+" : "-"}${magnitude}`;
}

function comfortTone(level: SimulationResult["comfort_level"]) {
  if (level === "risky") return "urgent";
  if (level === "tight") return "important";
  return "safe";
}

export function SimulationPanel({
  personaId,
  initialHistory
}: {
  personaId: string;
  initialHistory: SimulationHistoryItem[];
}) {
  const [scenarioType, setScenarioType] = useState<(typeof scenarioOptions)[number]["value"]>("new_monthly_expense");
  const [amount, setAmount] = useState(400);
  const [result, setResult] = useState<SimulationResult | null>(initialHistory[0]?.result ?? null);
  const [history, setHistory] = useState(initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectId = useId();
  const amountId = useId();
  const scenarioName = scenarioOptions.find((option) => option.value === scenarioType)?.label ?? "Scenario";

  return (
    <SectionCard
      eyebrow="Decision Lab"
      title="What-if simulation"
      description="Compare current state and a proposed change before you commit to it. Each run is saved and can be revisited from the latest persona history."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(() => {
              void (async () => {
                try {
                  const nextResult = await runSimulation({
                    persona_id: personaId,
                    name: scenarioName,
                    scenario_type: scenarioType,
                    amount
                  });

                  setResult(nextResult);
                  setError(null);

                  try {
                    setHistory(await getSimulationHistory(personaId));
                  } catch {
                    // Keep the newly computed result even if the history refresh fails.
                  }
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "Unable to run the scenario.");
                }
              })();
            });
          }}
        >
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Scenario inputs</p>
          <div className="mt-4 space-y-4">
            <label className="block" htmlFor={selectId}>
              <span className="mb-2 block text-sm font-medium text-[var(--pa-text)]">Scenario type</span>
              <select
                id={selectId}
                name="scenario_type"
                className="w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                value={scenarioType}
                onChange={(event) => setScenarioType(event.target.value as typeof scenarioType)}
              >
                {scenarioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block" htmlFor={amountId}>
              <span className="mb-2 block text-sm font-medium text-[var(--pa-text)]">Amount</span>
              <input
                id={amountId}
                name="amount"
                className="w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                inputMode="numeric"
                min={0}
                step={25}
                type="number"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </label>
            <button
              className="w-full rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[#18212a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Running…" : "Run scenario"}
            </button>
            <p className="sr-only" aria-live="polite">
              {isPending ? "Running simulation…" : error ?? ""}
            </p>
            {error ? <p className="text-sm text-[var(--pa-danger)]">{error}</p> : null}
          </div>
        </form>
        <div className="space-y-6">
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-white p-5" aria-live="polite">
            {result ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Result summary</p>
                    <h3 className="mt-2 text-balance font-display text-2xl text-[var(--pa-text)]">{result.summary}</h3>
                  </div>
                  <StatusPill tone={comfortTone(result.comfort_level)}>{result.comfort_level}</StatusPill>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(result.deltas).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{titleCase(key)}</p>
                      <p className="mt-2 font-display text-2xl tabular-nums text-[var(--pa-text)]">{formatDelta(key, value)}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Facts</p>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--pa-text-muted)]">
                      {result.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                      {result.facts.length === 0 ? <li>No direct fact changes were triggered for this run.</li> : null}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Warnings & assumptions</p>
                    <ul className="mt-3 space-y-2 text-sm text-[var(--pa-text-muted)]">
                      {[...result.warnings, ...result.assumptions].map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-80 flex-col justify-center rounded-[24px] bg-[var(--pa-surface)] p-8 text-center">
                <p className="font-display text-2xl text-[var(--pa-text)]">Model the next move before you make it.</p>
                <p className="mt-3 text-sm text-[var(--pa-text-muted)]">
                  The simulation engine estimates surplus impact, Safe to Spend changes, and liquidity tradeoffs using recent account behavior.
                </p>
              </div>
            )}
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Saved runs</p>
                <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">Recent simulation history</h3>
              </div>
              <StatusPill>{history.length} saved</StatusPill>
            </div>
            <div className="mt-4 space-y-3">
              {history.length > 0 ? (
                history.map((item) => (
                  <button
                    key={item.scenario_id}
                    className="w-full rounded-2xl border border-[var(--pa-border)] bg-white p-4 text-left transition-[background-color,border-color,color] duration-150 hover:border-[rgba(15,23,32,0.2)] hover:bg-[var(--pa-primary-soft)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                    type="button"
                    onClick={() => setResult(item.result)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--pa-text)]">{item.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">
                          {titleCase(item.scenario_type)} · {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <StatusPill tone={comfortTone(item.result.comfort_level)}>{item.result.comfort_level}</StatusPill>
                    </div>
                    <p className="mt-3 text-sm text-[var(--pa-text-muted)]">{item.result.summary}</p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-[var(--pa-text-muted)]">No saved simulations yet. Your first run will appear here.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
