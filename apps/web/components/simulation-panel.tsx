"use client";

import type { ReactNode } from "react";
import type { SimulationCadence, SimulationHistoryItem, SimulationResult } from "@contracts";
import {
  ArrowRightLeft,
  CalendarDays,
  CircleDollarSign,
  History,
  PiggyBank,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";

import { getSimulationHistory, runSimulation } from "@/lib/api";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ExpandableNote } from "./expandable-note";
import { StatusPill } from "./status-pill";

type PlannerMode = "affordability" | "allocation";

const plannerModes = [
  {
    value: "affordability",
    label: "Can I afford this payment?",
    description: "Test whether a one-time or monthly amount still fits before it creates cash pressure."
  },
  {
    value: "allocation",
    label: "Where should my next $X go?",
    description: "Split a custom amount across debt, buffer, and investing after minimums stay covered."
  }
] as const;

const legacyScenarioOptions = [
  {
    value: "new_monthly_expense",
    label: "New monthly bill",
    description: "See what a new recurring cost would do to the month."
  },
  {
    value: "extra_debt_payment",
    label: "Extra debt payment",
    description: "Test a quick debt move without rebuilding the full planner."
  },
  {
    value: "cancel_subscriptions",
    label: "Cancel subscriptions",
    description: "Estimate how much monthly room comes back from recurring cuts."
  },
  {
    value: "reduce_category_spend",
    label: "Cut a category",
    description: "Model what happens if you trim a specific kind of spending."
  },
  {
    value: "move_to_savings",
    label: "Move to savings",
    description: "Check whether shifting cash out of checking would tighten the month."
  }
] as const;

const amountPresets = [250, 500, 1000, 1500] as const;

function comfortTone(level: SimulationResult["comfort_level"]) {
  if (level === "risky") return "urgent" as const;
  if (level === "tight") return "important" as const;
  return "safe" as const;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function PlannerModeButton({
  active,
  description,
  label,
  onClick
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-[22px] border px-4 py-4 text-left transition-[background-color,border-color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        active
          ? "border-[rgba(31,116,104,0.24)] bg-[rgba(223,241,235,0.84)] shadow-[0_18px_30px_rgba(8,15,22,0.06)]"
          : "border-[var(--pa-border)] bg-white hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)]"
      )}
      type="button"
      onClick={onClick}
    >
      <p className="font-medium text-[var(--pa-text)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">{description}</p>
    </button>
  );
}

export function SimulationPanel({
  personaId,
  initialHistory,
  initialPlanner
}: {
  personaId: string;
  initialHistory: SimulationHistoryItem[];
  initialPlanner?: {
    mode: PlannerMode;
    amount: number;
    cadence: SimulationCadence;
    effectiveDate: string;
    label: string;
  };
}) {
  const [plannerMode, setPlannerMode] = useState<PlannerMode>(initialPlanner?.mode ?? "affordability");
  const [cadence, setCadence] = useState<SimulationCadence>(initialPlanner?.cadence ?? "one_time");
  const [amount, setAmount] = useState(initialPlanner?.amount ?? 500);
  const [effectiveDate, setEffectiveDate] = useState(initialPlanner?.effectiveDate ?? todayInputValue());
  const [label, setLabel] = useState(initialPlanner?.label ?? "");
  const [notes, setNotes] = useState("");
  const [legacyScenarioType, setLegacyScenarioType] = useState<(typeof legacyScenarioOptions)[number]["value"]>("new_monthly_expense");
  const [legacyAmount, setLegacyAmount] = useState(250);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const amountId = useId();
  const effectiveDateId = useId();
  const labelId = useId();
  const notesId = useId();
  const legacyAmountId = useId();

  const selectedLegacyScenario = useMemo(
    () => legacyScenarioOptions.find((option) => option.value === legacyScenarioType) ?? legacyScenarioOptions[0],
    [legacyScenarioType]
  );

  function submitSimulation(nextPayload: Parameters<typeof runSimulation>[0]) {
    startTransition(() => {
      void (async () => {
        try {
          const nextResult = await runSimulation(nextPayload);
          setResult(nextResult);
          setError(null);

          try {
            setHistory(await getSimulationHistory(personaId, 6));
          } catch {
            // Keep the newly computed result even if the history refresh fails.
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Unable to run the scenario.");
        }
      })();
    });
  }

  const plannerResult = result?.planner ?? null;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Amount planner</p>
                <h2 className="mt-2 font-display text-[1.4rem] text-[var(--pa-text)]">Start with the amount you are considering</h2>
              </div>
              <ArrowRightLeft aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--pa-primary)]" />
            </div>

            <div className="mt-4 grid gap-3">
              {plannerModes.map((mode) => (
                <PlannerModeButton
                  key={mode.value}
                  active={plannerMode === mode.value}
                  description={mode.description}
                  label={mode.label}
                  onClick={() => setPlannerMode(mode.value)}
                />
              ))}
            </div>

            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submitSimulation({
                  persona_id: personaId,
                  name:
                    label.trim() ||
                    (plannerMode === "allocation" ? "Where should my next dollar go?" : "Can I afford this payment?"),
                  scenario_type: plannerMode === "allocation" ? "custom_allocation" : "custom_outflow",
                  cadence,
                  effective_date: cadence === "one_time" ? effectiveDate : undefined,
                  amount,
                  notes
                });
              }}
            >
              <div className="rounded-[22px] border border-[var(--pa-border)] bg-white p-4">
                <label className="block" htmlFor={amountId}>
                  <span className="text-sm font-medium text-[var(--pa-text)]">Amount</span>
                </label>
                <input
                  id={amountId}
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

              <div className="grid gap-4 rounded-[22px] border border-[var(--pa-border)] bg-white p-4">
                <div>
                  <p className="text-sm font-medium text-[var(--pa-text)]">Cadence</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      { value: "one_time", label: "One-time amount" },
                      { value: "monthly", label: "Monthly amount" }
                    ].map((option) => (
                      <button
                        key={option.value}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-sm font-medium transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                          cadence === option.value
                            ? "border-[rgba(31,116,104,0.2)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
                            : "border-[var(--pa-border)] bg-[var(--pa-surface)] text-[var(--pa-text-muted)] hover:border-[rgba(15,23,32,0.16)] hover:text-[var(--pa-text)]"
                        )}
                        type="button"
                        onClick={() => setCadence(option.value as SimulationCadence)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {cadence === "one_time" ? (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--pa-text)]" htmlFor={effectiveDateId}>
                      <CalendarDays aria-hidden="true" className="h-4 w-4 text-[var(--pa-primary)]" />
                      Payment date
                    </label>
                    <input
                      id={effectiveDateId}
                      className="mt-3 w-full rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      type="date"
                      value={effectiveDate}
                      onChange={(event) => setEffectiveDate(event.target.value)}
                    />
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-[var(--pa-text)]" htmlFor={labelId}>
                    Short label
                  </label>
                  <input
                    id={labelId}
                    className="mt-3 w-full rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    placeholder={plannerMode === "allocation" ? "Example: Bonus check" : "Example: Medical bill"}
                    type="text"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--pa-text)]" htmlFor={notesId}>
                    Notes
                  </label>
                  <textarea
                    id={notesId}
                    className="mt-3 min-h-[84px] w-full rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    placeholder="Optional context to remember what this amount is for."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
              </div>

              <button
                className="w-full rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[#18212a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Running…" : plannerMode === "allocation" ? "Build allocation plan" : "Check affordability"}
              </button>

              <ExpandableNote
                className="pt-1"
                detail={
                  <ul className="space-y-2">
                    <li>Minimum debt payments stay covered before extra allocation is recommended.</li>
                    <li>Known paychecks, bills, subscriptions, and debt due dates over the next 30 days are included.</li>
                    <li>Deferred-interest deadlines can outrank simple highest-APR logic when the deadline is near.</li>
                    <li>Investment only appears after debt and liquidity gates are satisfied.</li>
                  </ul>
                }
                label="Planner rules"
                summary="See the rules behind the feasibility and next-dollar recommendation."
              />
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)]">
            {plannerResult ? (
              <PlannerResultView result={result as SimulationResult} />
            ) : result ? (
              <LegacyResultView result={result} />
            ) : (
              <EmptyPlannerState />
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 shadow-[var(--pa-shadow-sm)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Other what-ifs</p>
                  <h3 className="mt-2 font-display text-[1.2rem] text-[var(--pa-text)]">Quick scenario shortcuts</h3>
                </div>
                <CircleDollarSign aria-hidden="true" className="h-5 w-5 text-[var(--pa-primary)]" />
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">
                These lighter shortcuts are still available, but the amount planner above is the main place to answer “Can I do this?” and “Where should my next dollar go?”
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {legacyScenarioOptions.map((option) => (
                  <button
                    key={option.value}
                    className={cn(
                      "rounded-[20px] border px-4 py-4 text-left transition-[background-color,border-color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]",
                      legacyScenarioType === option.value
                        ? "border-[rgba(31,116,104,0.2)] bg-[var(--pa-primary-soft)]/65 shadow-[0_18px_30px_rgba(8,15,22,0.06)]"
                        : "border-[var(--pa-border)] bg-white hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)]"
                    )}
                    type="button"
                    onClick={() => setLegacyScenarioType(option.value)}
                  >
                    <p className="font-medium text-[var(--pa-text)]">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">{option.description}</p>
                  </button>
                ))}
              </div>
              <form
                className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitSimulation({
                    persona_id: personaId,
                    name: selectedLegacyScenario.label,
                    scenario_type: legacyScenarioType,
                    amount: legacyAmount
                  });
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-[var(--pa-text)]" htmlFor={legacyAmountId}>
                    Shortcut amount
                  </label>
                  <input
                    id={legacyAmountId}
                    className="mt-3 w-full rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3 text-sm text-[var(--pa-text)] transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                    inputMode="numeric"
                    min={0}
                    step={25}
                    type="number"
                    value={legacyAmount}
                    onChange={(event) => setLegacyAmount(Number(event.target.value))}
                  />
                </div>
                <button
                  className="self-end rounded-full bg-[var(--pa-surface-ink)] px-5 py-3 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[#18212a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                  disabled={isPending}
                  type="submit"
                >
                  Run shortcut
                </button>
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
                    Your first run will appear here so you can reopen it without rebuilding the setup.
                  </div>
                )}
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-[var(--pa-danger)]">{error}</p> : null}
          <p className="sr-only" aria-live="polite">
            {isPending ? "Running simulation…" : error ?? ""}
          </p>
        </div>
      </section>
    </div>
  );
}

function EmptyPlannerState() {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
      <div className="rounded-full bg-[var(--pa-primary-soft)]/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--pa-primary)]">
        Ready to model
      </div>
      <h3 className="mt-5 max-w-xl text-balance font-display text-[2rem] leading-tight text-[var(--pa-text)]">
        Start with a number, then see whether it fits and what it should do.
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--pa-text-muted)]">
        The planner will tell you whether the amount works, by how much it tightens the month, and where that money should go next if it does fit.
      </p>
    </div>
  );
}

function PlannerResultView({ result }: { result: SimulationResult }) {
  const planner = result.planner;
  if (!planner) return null;
  const deficit = planner.deficit_analysis.deficit_amount;
  const largestSafeAmount = planner.deficit_analysis.largest_safe_amount;

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Planner answer</p>
          <h3 className="mt-2 text-balance font-display text-[1.85rem] text-[var(--pa-text)]">{planner.verdict_label}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--pa-text-muted)]">{planner.verdict_summary}</p>
        </div>
        <StatusPill tone={comfortTone(result.comfort_level)}>{planner.status}</StatusPill>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {planner.impact_cards.map((card) => (
          <div key={card.key} className="rounded-[20px] border border-[var(--pa-border)] bg-white/84 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{card.label}</p>
            <p className="mt-3 font-display text-[1.9rem] tabular-nums text-[var(--pa-text)]">{formatCurrency(card.projected_value)}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">
              {card.delta >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(card.delta))}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--pa-text-muted)]">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[var(--pa-border)] bg-white/84 p-4">
          <div className="flex items-center gap-2 text-[var(--pa-primary)]">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">
              {planner.deficit_analysis.is_doable ? "Cushion left" : "Deficit to solve"}
            </p>
          </div>
          <p className="mt-3 font-display text-[2.2rem] tabular-nums text-[var(--pa-text)]">
            {formatCurrency(planner.deficit_analysis.is_doable ? planner.deficit_analysis.remaining_cushion : deficit)}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--pa-text-muted)]">{planner.deficit_analysis.explanation}</p>
          <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--pa-text-muted)]">
            <p>
              Tightest date: <span className="font-medium text-[var(--pa-text)]">{formatDate(planner.deficit_analysis.tightest_date)}</span>
            </p>
            <p>
              Largest {planner.cadence === "one_time" ? "one-time" : "monthly"} amount that still fits:{" "}
              <span className="font-medium text-[var(--pa-text)]">{formatCurrency(largestSafeAmount)}</span>
            </p>
          </div>
        </div>

        <div className="rounded-[22px] border border-[var(--pa-border)] bg-white/84 p-4">
          <div className="flex items-center gap-2 text-[var(--pa-primary)]">
            <TrendingUp aria-hidden="true" className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Monthly impact</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MetricTile label="Now" value={formatCurrency(planner.monthly_impact.current_surplus)} />
            <MetricTile label="After this" value={formatCurrency(planner.monthly_impact.projected_surplus)} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--pa-text-muted)]">
            {planner.monthly_impact.recurring_shortfall > 0
              ? `This would leave a recurring monthly gap of ${formatCurrency(planner.monthly_impact.recurring_shortfall)}.`
              : `This changes month-end checking by about ${formatCurrency(planner.monthly_impact.month_end_delta)} this cycle.`}
          </p>
        </div>
      </div>

      {planner.allocation_plan ? (
        <div className="rounded-[22px] border border-[rgba(31,116,104,0.18)] bg-[linear-gradient(180deg,rgba(223,241,235,0.44),rgba(255,255,255,0.92))] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Recommended split</p>
              <h4 className="mt-2 font-display text-[1.35rem] text-[var(--pa-text)]">Where this amount should go next</h4>
              <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">
                Minimums stay covered first, then the remaining amount is split across the most useful next targets.
              </p>
            </div>
            <StatusPill tone="safe">Minimums preserved</StatusPill>
          </div>

          <AllocationBar plan={planner.allocation_plan} />

          <div className="mt-4 space-y-3">
            {planner.allocation_plan.rows.map((row) => (
              <div key={`${row.target_type}-${row.target_id ?? row.target_name}`} className="rounded-[20px] border border-[var(--pa-border)] bg-white/88 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--pa-text)]">{row.target_name}</p>
                      <StatusPill tone={row.tone}>{row.target_type}</StatusPill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">{row.rationale}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Recommended amount</p>
                    <p className="mt-2 font-display text-2xl tabular-nums text-[var(--pa-text)]">{formatCurrency(row.amount)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Baseline" value={formatCurrency(row.base_amount)} />
                  <MetricTile label="Extra" value={formatCurrency(row.extra_amount)} />
                  <MetricTile label="Effect" value={row.expected_impact} compact />
                </div>
              </div>
            ))}
          </div>

          {planner.allocation_plan.comparison ? (
            <div className="mt-4 rounded-[20px] border border-[var(--pa-border)] bg-white/84 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{planner.allocation_plan.comparison.naive_label}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--pa-text-muted)]">{planner.allocation_plan.comparison.naive_summary}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--pa-text)]">{planner.allocation_plan.comparison.recommended_summary}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightBlock
          icon={<PiggyBank aria-hidden="true" className="h-4 w-4" />}
          items={[...result.facts, ...result.estimates, ...planner.recommended_next_steps]}
          title="What changes if you do it"
        />
        <ExpandableNote
          detail={
            <ul className="space-y-2">
              {[...result.warnings, ...result.assumptions].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          }
          label="Assumptions"
          summary="Open the assumptions, warnings, and modeling limits behind this result."
        />
      </div>
    </div>
  );
}

function LegacyResultView({ result }: { result: SimulationResult }) {
  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Shortcut result</p>
          <h3 className="mt-2 text-balance font-display text-[1.8rem] text-[var(--pa-text)]">{result.summary}</h3>
        </div>
        <StatusPill tone={comfortTone(result.comfort_level)}>{result.comfort_level}</StatusPill>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries(result.deltas).map(([key, value]) => (
          <div key={key} className="rounded-[20px] border border-[var(--pa-border)] bg-white/84 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{titleCase(key)}</p>
            <p className="mt-3 font-display text-[1.9rem] tabular-nums text-[var(--pa-text)]">
              {typeof value === "number" ? formatCurrency(value) : value === null ? "No change" : String(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InsightBlock icon={<CircleDollarSign aria-hidden="true" className="h-4 w-4" />} items={result.facts} title="Direct changes" />
        <InsightBlock
          icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
          items={[...result.warnings, ...result.assumptions]}
          title="Warnings and assumptions"
        />
      </div>
    </div>
  );
}

function AllocationBar({
  plan
}: {
  plan: NonNullable<NonNullable<SimulationResult["planner"]>["allocation_plan"]>;
}) {
  const total = Math.max(plan.total_amount, 1);

  return (
    <div className="mt-5 space-y-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-black/6">
        {plan.rows.map((row) => (
          <div
            key={`${row.target_type}-${row.target_id ?? row.target_name}`}
            className={cn(
              "h-full",
              row.target_type === "debt"
                ? row.tone === "urgent"
                  ? "bg-[var(--pa-danger)]"
                  : "bg-[var(--pa-warning)]"
                : row.target_type === "investment"
                  ? "bg-[var(--pa-success)]"
                  : "bg-[var(--pa-primary)]"
            )}
            style={{ width: `${Math.max((row.amount / total) * 100, 8)}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-[var(--pa-text-muted)]">
        {plan.rows.map((row) => (
          <span key={`${row.target_type}-${row.target_id ?? row.target_name}`} className="inline-flex items-center gap-2">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                row.target_type === "debt"
                  ? row.tone === "urgent"
                    ? "bg-[var(--pa-danger)]"
                    : "bg-[var(--pa-warning)]"
                  : row.target_type === "investment"
                    ? "bg-[var(--pa-success)]"
                    : "bg-[var(--pa-primary)]"
              )}
            />
            {row.target_name} · {formatCurrency(row.amount)}
          </span>
        ))}
      </div>
    </div>
  );
}

function InsightBlock({
  icon,
  items,
  title
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--pa-border)] bg-white/84 p-4">
      <div className="flex items-center gap-2 text-[var(--pa-primary)]">
        {icon}
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">{title}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--pa-text-muted)]">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>No notes were added for this scenario.</li>}
      </ul>
    </div>
  );
}

function MetricTile({
  compact = false,
  label,
  value
}: {
  compact?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{label}</p>
      <p className={cn("mt-2 text-sm font-semibold text-[var(--pa-text)]", compact ? "leading-6" : "")}>{value}</p>
    </div>
  );
}
