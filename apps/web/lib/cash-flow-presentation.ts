import type { CashFlowEvent, CashFlowResponse, SafeToSpendSnapshot } from "@contracts";

export type CashFlowStatusTone = "safe" | "important" | "urgent";

export type CashFlowStatusPresentation = {
  label: string;
  tone: CashFlowStatusTone;
  summary: string;
};

export type CashFlowEventPresentation = {
  id: string;
  date: string;
  label: string;
  kindLabel: string;
  amount: number;
  direction: "in" | "out";
  tone: "safe" | "important" | "default";
};

function eventKindLabel(kind: CashFlowEvent["kind"]) {
  if (kind === "income") return "Income";
  if (kind === "bill") return "Bill";
  if (kind === "subscription") return "Subscription";
  if (kind === "debt_due") return "Debt due";
  return "To savings";
}

function eventTone(kind: CashFlowEvent["kind"]) {
  if (kind === "income") return "safe" as const;
  if (kind === "debt_due" || kind === "bill") return "important" as const;
  return "default" as const;
}

export function buildCashFlowStatus(snapshot: SafeToSpendSnapshot): CashFlowStatusPresentation {
  if (snapshot.spending_velocity_status === "likely_overspend") {
    return {
      label: "Tight right now",
      tone: "urgent",
      summary: "The current pace is likely to run ahead of what this cycle can safely support before the next paycheck."
    };
  }

  if (snapshot.spending_velocity_status === "caution") {
    return {
      label: "Watch spending",
      tone: "important",
      summary: "You still have room, but the current pace is getting close to the buffer this cycle can support."
    };
  }

  return {
    label: "Comfortable",
    tone: "safe",
    summary: "Income timing and current pace still leave usable room before the next paycheck."
  };
}

export function buildCashFlowEvents(events: CashFlowResponse["upcoming_events"]): CashFlowEventPresentation[] {
  return events.map((event) => ({
    id: `${event.kind}-${event.date}-${event.label}`,
    date: event.date,
    label: event.label,
    kindLabel: eventKindLabel(event.kind),
    amount: event.amount,
    direction: event.kind === "income" ? "in" : "out",
    tone: eventTone(event.kind)
  }));
}

export function buildLowPointSummary({
  cashFlow,
  safe
}: {
  cashFlow: CashFlowResponse;
  safe: SafeToSpendSnapshot;
}) {
  const lowPointDate = String(cashFlow.paycheck_to_paycheck_view.lowest_projected_balance_date ?? "");
  const lowPointBalance = Number(cashFlow.paycheck_to_paycheck_view.lowest_projected_balance ?? 0);
  const obligations = Number(cashFlow.paycheck_to_paycheck_view.total_upcoming_obligations ?? 0);
  const expectedIncome = Number(cashFlow.paycheck_to_paycheck_view.total_expected_income ?? 0);

  if (lowPointBalance <= 0) {
    return {
      title: "The tightest point could turn negative.",
      summary: "Bills and debt minimums are likely to outrun checking before the next pay hits unless discretionary spending slows."
    };
  }

  if (lowPointBalance <= safe.risk_buffer) {
    return {
      title: "Your cash cushion dips close to the buffer line.",
      summary: "The cycle still works, but the tightest day leaves less room than your target safety margin."
    };
  }

  if (obligations > expectedIncome) {
    return {
      title: "Most of the near-term pressure comes from scheduled outflows.",
      summary: "The next few bills and minimums are heavier than the income expected before the next reset."
    };
  }

  return {
    title: "The next cycle keeps a usable cushion.",
    summary: "Expected income and current pace still leave room above the buffer target through the next payday."
  };
}
