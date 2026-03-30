import type { Recommendation, RiskAlert } from "@contracts";

import { formatCurrency } from "@/lib/format";

import { StatusPill } from "./status-pill";

export function InsightCard({
  item,
  variant
}: {
  item: Recommendation | RiskAlert;
  variant: "recommendation" | "risk";
}) {
  const recommendation = variant === "recommendation" ? (item as Recommendation) : null;
  const risk = variant === "risk" ? (item as RiskAlert) : null;
  const urgency =
    variant === "recommendation"
      ? recommendation?.urgency ?? "routine"
      : risk?.severity === "informational"
        ? "important"
        : risk?.severity ?? "important";

  const impactText =
    variant === "recommendation"
      ? recommendation?.impact_estimate ?? "Expected impact depends on payment timing and current balances."
      : `Expected impact depends on the next account refresh and payment timing.`;

  return (
    <div className="rounded-[22px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)] md:rounded-[24px] md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--pa-text-soft)]">{variant === "recommendation" ? "Next Best Action" : "Risk Signal"}</p>
          <h3 className="mt-2 font-display text-[1.05rem] font-semibold leading-7 text-[var(--pa-text)] md:text-lg">{item.title}</h3>
        </div>
        <StatusPill tone={urgency === "urgent" ? "urgent" : urgency === "important" ? "important" : "safe"}>
          {urgency}
        </StatusPill>
      </div>
      <div className="space-y-3 text-sm text-[var(--pa-text-muted)]">
        <p>
          <span className="font-semibold text-[var(--pa-text)]">What happened:</span> {item.summary}
        </p>
        <p>
          <span className="font-semibold text-[var(--pa-text)]">Why it matters:</span> {item.rationale}
        </p>
        <p>
          <span className="font-semibold text-[var(--pa-text)]">What to do next:</span>{" "}
          {variant === "recommendation" && recommendation?.suggested_action_amount
            ? `Move about ${formatCurrency(recommendation.suggested_action_amount)} toward the suggested action.`
            : "Review the linked detail and act this cycle if the signal matches your situation."}
        </p>
        <p>
          <span className="font-semibold text-[var(--pa-text)]">Expected benefit:</span> {impactText}
        </p>
      </div>
    </div>
  );
}
