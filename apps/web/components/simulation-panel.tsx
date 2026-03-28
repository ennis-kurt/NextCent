"use client";

import type { SimulationResult } from "@contracts";
import { useMemo, useState, useTransition } from "react";

import { runSimulation } from "@/lib/api";
import { formatCurrency, titleCase } from "@/lib/format";

import { SectionCard } from "./section-card";
import { StatusPill } from "./status-pill";

const scenarioOptions = [
  { value: "new_monthly_expense", label: "New monthly expense" },
  { value: "extra_debt_payment", label: "Extra debt payment" },
  { value: "cancel_subscriptions", label: "Cancel subscriptions" },
  { value: "reduce_category_spend", label: "Reduce category spend" },
  { value: "move_to_savings", label: "Move cash to savings" }
] as const;

export function SimulationPanel({ personaId }: { personaId: string }) {
  const [scenarioType, setScenarioType] = useState<(typeof scenarioOptions)[number]["value"]>("new_monthly_expense");
  const [amount, setAmount] = useState(400);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const scenarioName = useMemo(() => {
    return scenarioOptions.find((option) => option.value === scenarioType)?.label ?? "Scenario";
  }, [scenarioType]);

  return (
    <SectionCard
      eyebrow="Decision Lab"
      title="What-if simulation"
      description="Compare current state and a proposed change before you commit to it."
    >
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Scenario inputs</p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--pa-text)]">Scenario type</span>
              <select
                className="w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-sm text-[var(--pa-text)] outline-none"
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
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--pa-text)]">Amount</span>
              <input
                className="w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-sm text-[var(--pa-text)] outline-none"
                type="number"
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
              />
            </label>
            <button
              className="w-full rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  void (async () => {
                    const nextResult = await runSimulation({
                      persona_id: personaId,
                      name: scenarioName,
                      scenario_type: scenarioType,
                      amount
                    });
                    setResult(nextResult);
                  })();
                });
              }}
            >
              {isPending ? "Running simulation..." : "Run scenario"}
            </button>
          </div>
        </div>
        <div className="rounded-[24px] border border-[var(--pa-border)] bg-white p-5">
          {result ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Result summary</p>
                  <h3 className="mt-2 font-display text-2xl text-[var(--pa-text)]">{result.summary}</h3>
                </div>
                <StatusPill tone={result.comfort_level === "risky" ? "urgent" : result.comfort_level === "tight" ? "important" : "safe"}>
                  {result.comfort_level}
                </StatusPill>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(result.deltas).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{titleCase(key)}</p>
                    <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">
                      {typeof value === "number" ? formatCurrency(value) : String(value)}
                    </p>
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
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Warnings and assumptions</p>
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
      </div>
    </SectionCard>
  );
}
