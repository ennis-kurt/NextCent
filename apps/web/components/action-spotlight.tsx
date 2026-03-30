import type { Recommendation, RecommendationUrgency } from "@contracts";
import { ArrowUpRight, WalletCards } from "lucide-react";

import { formatCurrency } from "@/lib/format";

import { ExpandableNote } from "./expandable-note";
import { StatusPill } from "./status-pill";

function urgencyTone(urgency: RecommendationUrgency) {
  if (urgency === "urgent") return "urgent";
  if (urgency === "important") return "important";
  return "safe";
}

export function ActionSpotlight({
  personaName,
  archetype,
  recommendation,
  safeToSpendThisWeek
}: {
  personaName: string;
  archetype: string;
  recommendation?: Recommendation;
  safeToSpendThisWeek: number;
}) {
  const actionAmount = recommendation?.suggested_action_amount;
  const hasActionAmount = typeof actionAmount === "number";
  const headline = recommendation ? `${personaName}, start with ${recommendation.title.toLowerCase()}.` : `${personaName}, protect this week's runway.`;
  const takeaway = recommendation
    ? `${formatCurrency(safeToSpendThisWeek)} is available this week for this ${archetype.toLowerCase()} profile. ${recommendation.summary}`
    : `${formatCurrency(safeToSpendThisWeek)} is available this week for this ${archetype.toLowerCase()} profile. Hold cash steady and revisit the next refresh before making a bigger move.`;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[rgba(18,32,43,0.14)] bg-[linear-gradient(135deg,rgba(19,36,47,0.98),rgba(18,32,43,0.92)_58%,rgba(31,116,104,0.85))] px-5 py-5 text-white shadow-[0_28px_64px_rgba(8,15,22,0.22)] md:rounded-[32px] md:px-7 md:py-6">
      <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[rgba(183,139,66,0.22)] blur-3xl" />
      <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-[rgba(255,255,255,0.08)] blur-3xl" />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_300px] lg:items-start">
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Top priority</p>
            <StatusPill tone={urgencyTone(recommendation?.urgency ?? "routine")}>
              {recommendation?.urgency ?? "routine"}
            </StatusPill>
          </div>
          <div className="space-y-2">
            <h2 className="max-w-3xl text-balance font-display text-[2.25rem] font-semibold leading-tight text-white md:text-[2.35rem]">
              {headline}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-white/74 md:leading-7">{takeaway}</p>
          </div>
          <ExpandableNote
            className="max-w-3xl"
            detail={
              <div className="space-y-3">
                <p>{recommendation?.rationale ?? "No single action is currently outranking the rest, so the priority is to preserve flexibility until the next account refresh."}</p>
                <p>{recommendation?.why_now ?? `The current weekly runway is ${formatCurrency(safeToSpendThisWeek)}, so timing matters more than broad changes right now.`}</p>
                <p>
                  <span className="font-semibold text-[var(--pa-text)]">Expected benefit:</span>{" "}
                  {recommendation?.impact_estimate ?? "Use this week’s runway as a pacing check before taking a larger action."}
                </p>
              </div>
            }
            label="Why this is first"
            summary="See the rationale and expected benefit behind this priority."
          />
        </div>

        <div className="rounded-[24px] border border-white/12 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur md:rounded-[28px] md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">
                {hasActionAmount ? "Suggested amount" : "Current runway"}
              </p>
              <p className="mt-3 font-display text-[2.75rem] font-semibold leading-none tabular-nums text-white md:text-4xl">
                {hasActionAmount ? formatCurrency(actionAmount) : formatCurrency(safeToSpendThisWeek)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-black/10 p-3 text-[var(--pa-accent)]">
              {hasActionAmount ? <ArrowUpRight aria-hidden="true" className="h-5 w-5" /> : <WalletCards aria-hidden="true" className="h-5 w-5" />}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/68">
            {hasActionAmount
              ? `Move about ${formatCurrency(actionAmount)} toward this action in the current cycle.`
              : "Use this week’s runway as the pacing limit until the next refresh."}
          </p>
          <div className="mt-5 rounded-[20px] border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/62">
            Weekly flexibility: {formatCurrency(safeToSpendThisWeek)}
          </div>
        </div>
      </div>
    </section>
  );
}
