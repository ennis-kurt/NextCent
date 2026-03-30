"use client";

import type { SimulationHistoryItem, SimulationResult } from "@contracts";
import { Calculator, History, LoaderCircle, Sparkles } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";

import { getSimulationHistory, runSimulation } from "@/lib/api";
import { formatCurrency, formatDateTime, formatNumber, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ExpandableNote } from "./expandable-note";
import { StatusPill } from "./status-pill";

const scenarioOptions = [
  {
    value: "new_monthly_expense",
    label: "New bill",
    description: "See what a recurring expense would do to your month."
  },
  {
    value: "extra_debt_payment",
    label: "Extra debt payment",
    description: "Test whether a bigger debt move still keeps the month comfortable."
  },
  {
    value: "cancel_subscriptions",
    label: "Cancel subscriptions",
    description: "Estimate how much room returns if you cut recurring services."
  },
  {
    value: "reduce_category_spend",
    label: "Cut a category",
    description: "Model what happens if you lower a specific kind of spending."
  },
  {
    value: "move_to_savings",
    label: "Move to savings",
    description: "Check whether shifting cash out of checking makes the month tighter."
  }
] as const;

const amountPresets = [100, 250, 500, 1000] as const;

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
  const amountId = useId();
  const selectedScenario = useMemo(
    () => scenarioOptions.find((option) => option.value === scenarioType) ?? scenarioOptions[0],
    [scenarioType]
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Build a scenario</p>
              <h2 className="mt-2 font-display text-[1.3rem] text-[var(--pa-text)]">Choose the change to test</h2>
            </div>
            <Calculator aria-hidden="true" className="h-5 w-5 text-[var(--pa-primary)]" />
          </div>

          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(() => {
                void (async () => {
                  try {
                    const nextResult = await runSimulation({
                      persona_id: personaId,
                      name: selectedScenario.label,
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
            <div className="grid gap-3">
              {scenarioOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "rounded-[22px] border px-4 py-4 text-left transition-[background-color,border-color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    scenarioType === option.value
                      ? "border-[rgba(31,116,104,0.22)] bg-[rgba(223,241,235,0.84)] shadow-[0_18px_30px_rgba(8,15,22,0.06)]"
                      : "border-[var(--pa-border)] bg-white hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)]"
                  )}
                  type="button"
                  onClick={() => setScenarioType(option.value)}
                >
                  <p className="font-medium text-[var(--pa-text)]">{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">{option.description}</p>
                </button>
              ))}
            </div>

            <div className="rounded-[22px] border border-[var(--pa-border)] bg-white p-4">
              <label className="block" htmlFor={amountId}>
                <span className="text-sm font-medium text-[var(--pa-text)]">Amount</span>
              </label>
              <input
                id={amountId}
                name="amount"
                className="mt-3 w-full rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                inputMode="numeric"
                min={0}
                step={25}
                type="number"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {amountPresets.map((preset) => (
                  <button
                    key={preset}
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm font-medium transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                      amount === preset
                        ? "border-[rgba(31,116,104,0.2)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
                        : "border-[var(--pa-border)] bg-white text-[var(--pa-text-muted)] hover:border-[rgba(15,23,32,0.16)] hover:text-[var(--pa-text)]"
                    )}
                    type="button"
                    onClick={() => setAmount(preset)}
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="w-full rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[#18212a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Running…" : `Test ${selectedScenario.label.toLowerCase()}`}
            </button>

            <p className="sr-only" aria-live="polite">
              {isPending ? "Running simulation…" : error ?? ""}
            </p>
            {error ? <p className="text-sm text-[var(--pa-danger)]">{error}</p> : null}

            <ExpandableNote
              className="pt-1"
              detail={
                <ul className="space-y-2">
                  <li>Uses seeded demo accounts and recent behavior only.</li>
                  <li>Assumes the current income pattern stays broadly stable during the comparison.</li>
                  <li>Does not forecast unknown emergencies, life events, or one-off income shocks.</li>
                  <li>Read each estimate together with the result warnings and assumptions panel.</li>
                </ul>
              }
              label="Model boundary"
              summary="See what this projection assumes before treating the result as a decision."
            />
          </form>
        </div>

        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 shadow-[var(--pa-shadow-sm)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Saved runs</p>
              <h3 className="mt-2 font-display text-[1.2rem] text-[var(--pa-text)]">Recent scenarios</h3>
            </div>
            <History aria-hidden="true" className="h-5 w-5 text-[var(--pa-primary)]" />
          </div>
          <div className="mt-4 space-y-3">
            {history.length > 0 ? (
              history.map((item) => (
                <button
                  key={item.scenario_id}
                  className="w-full rounded-[20px] border border-[var(--pa-border)] bg-white p-4 text-left transition-[background-color,border-color,color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.2)] hover:bg-[var(--pa-primary-soft)]/30 hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
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
                  <p className="mt-3 text-sm leading-6 text-[var(--pa-text-muted)]">{item.result.summary}</p>
                </button>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-[var(--pa-border)] bg-white/78 px-4 py-6 text-sm leading-7 text-[var(--pa-text-muted)]">
                Your first run will appear here so you can compare it without rebuilding the scenario.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)]" aria-live="polite">
          {result ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Result summary</p>
                  <h3 className="mt-2 text-balance font-display text-[1.8rem] text-[var(--pa-text)]">{result.summary}</h3>
                </div>
                <StatusPill tone={comfortTone(result.comfort_level)}>{result.comfort_level}</StatusPill>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(result.deltas).map(([key, value]) => (
                  <div key={key} className="rounded-[20px] border border-[var(--pa-border)] bg-white/84 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{titleCase(key)}</p>
                    <p className="mt-3 font-display text-[1.9rem] tabular-nums text-[var(--pa-text)]">{formatDelta(key, value)}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <InsightBlock items={result.facts} title="Direct changes" />
                <InsightBlock items={[...result.warnings, ...result.assumptions]} title="Warnings and assumptions" />
              </div>
            </div>
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <div className="rounded-full bg-[var(--pa-primary-soft)]/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--pa-primary)]">
                Ready to model
              </div>
              <h3 className="mt-5 max-w-xl text-balance font-display text-[2rem] leading-tight text-[var(--pa-text)]">
                Build a scenario and see the likely comfort change before you act.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--pa-text-muted)]">
                Use the left side to test a bill, debt payment, subscription cut, or savings move and see the result immediately.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function InsightBlock({
  title,
  items
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/84 p-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--pa-text-muted)]">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>No notes were added for this scenario.</li>}
      </ul>
    </div>
  );
}
