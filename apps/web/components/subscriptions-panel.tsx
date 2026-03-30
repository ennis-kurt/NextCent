"use client";

import type { SubscriptionSummary } from "@contracts";
import { CalendarClock, ExternalLink, LoaderCircle, Repeat, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";

import { getCancellationLink } from "@/lib/api";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { StatusPill } from "./status-pill";

type CancellationLinkData = {
  subscription_id: string;
  merchant_label: string;
  help_url: string;
  cancellation_url: string;
  support_email: string;
  steps: string[];
  confidence: number;
};

type HelpState = {
  expanded?: boolean;
  loaded?: boolean;
  data?: CancellationLinkData | null;
  error?: string | null;
};

function wasteTone(wasteRisk: string) {
  if (wasteRisk === "high") return "important";
  if (wasteRisk === "low") return "safe";
  return "default";
}

function riskRank(value: string) {
  if (value === "high") return 3;
  if (value === "review") return 2;
  return 1;
}

function actionLabel(value: string) {
  if (value === "ready_for_review") return "Needs review";
  return value.replaceAll("_", " ");
}

function reviewSummary(subscription: SubscriptionSummary) {
  if (subscription.waste_risk === "high") {
    return "This is one of the strongest candidates to review or cut before the next charge lands.";
  }

  if (subscription.waste_risk === "review") {
    return "This is worth a quick value check before the next billing cycle.";
  }

  return "This service looks lower-risk right now, but the cost is still visible here for regular review.";
}

export function SubscriptionsPanel({
  personaId,
  subscriptions
}: {
  personaId: string;
  subscriptions: SubscriptionSummary[];
}) {
  const [states, setStates] = useState<Record<string, HelpState>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const orderedSubscriptions = useMemo(
    () =>
      [...subscriptions].sort(
        (left, right) => riskRank(right.waste_risk) - riskRank(left.waste_risk) || right.monthly_amount - left.monthly_amount
      ),
    [subscriptions]
  );

  function toggleHelp(subscriptionId: string) {
    const current = states[subscriptionId];
    const nextExpanded = !current?.expanded;

    setStates((previous) => ({
      ...previous,
      [subscriptionId]: {
        ...previous[subscriptionId],
        expanded: nextExpanded
      }
    }));

    if (!nextExpanded || current?.loaded || loadingId === subscriptionId) {
      return;
    }

    setLoadingId(subscriptionId);
    startTransition(() => {
      void (async () => {
        try {
          const data = await getCancellationLink(personaId, subscriptionId);
          setStates((previous) => ({
            ...previous,
            [subscriptionId]: {
              ...previous[subscriptionId],
              expanded: true,
              loaded: true,
              data,
              error: null
            }
          }));
        } catch {
          setStates((previous) => ({
            ...previous,
            [subscriptionId]: {
              ...previous[subscriptionId],
              expanded: true,
              loaded: true,
              data: null,
              error: "No verified merchant help path is stored for this service yet."
            }
          }));
        } finally {
          setLoadingId(null);
        }
      })();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {orderedSubscriptions.map((subscription) => {
        const state = states[subscription.id];
        const isLoading = loadingId === subscription.id && isPending;

        return (
          <article
            key={subscription.id}
            className="rounded-[24px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,226,0.9))] p-5 shadow-[var(--pa-shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{subscription.merchant_key}</p>
                <h3 className="mt-2 font-display text-[1.25rem] text-[var(--pa-text)]">{subscription.label}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--pa-text-muted)]">{reviewSummary(subscription)}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <StatusPill tone={wasteTone(subscription.waste_risk)}>{subscription.waste_risk === "review" ? "Check value" : subscription.waste_risk}</StatusPill>
                <StatusPill>{actionLabel(subscription.action_status)}</StatusPill>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric icon={<Repeat className="h-4 w-4" />} label="Monthly" value={formatCurrency(subscription.monthly_amount)} />
              <SummaryMetric icon={<ShieldCheck className="h-4 w-4" />} label="Yearly" value={formatCurrency(subscription.monthly_amount * 12)} />
              <SummaryMetric icon={<CalendarClock className="h-4 w-4" />} label="Next charge" value={formatDate(subscription.next_expected_at)} />
              <SummaryMetric icon={<ExternalLink className="h-4 w-4" />} label="Detection confidence" value={formatPercent(subscription.confidence)} />
            </div>

            <div className="mt-5 rounded-[20px] border border-[var(--pa-border)] bg-white/84 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--pa-text)]">Open the merchant path only when you need it</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--pa-text-muted)]">
                    NextCent keeps the review simple first, then loads the verified account or help path when you want to act.
                  </p>
                </div>
                <button
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    state?.expanded
                      ? "border-[var(--pa-primary)] bg-[var(--pa-primary-soft)] text-[var(--pa-primary)]"
                      : "border-[var(--pa-border)] bg-[var(--pa-surface)] text-[var(--pa-text)] hover:border-[rgba(15,23,32,0.16)] hover:bg-white"
                  )}
                  type="button"
                  onClick={() => toggleHelp(subscription.id)}
                >
                  {isLoading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ExternalLink aria-hidden="true" className="h-4 w-4" />}
                  {state?.expanded ? "Hide path" : "Open help path"}
                </button>
              </div>

              {state?.expanded ? (
                <div className="mt-4 rounded-[20px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
                  {isLoading ? (
                    <p className="text-sm text-[var(--pa-text-muted)]">Loading verified merchant help details…</p>
                  ) : state?.data ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3">
                        {state.data.cancellation_url ? (
                          <a
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--pa-primary)] transition-colors hover:text-[#165e55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                            href={state.data.cancellation_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open cancellation page
                          </a>
                        ) : null}
                        {state.data.help_url ? (
                          <a
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--pa-primary)] transition-colors hover:text-[#165e55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]"
                            href={state.data.help_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open merchant help page
                          </a>
                        ) : null}
                      </div>
                      {state.data.steps.length > 0 ? (
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Suggested path</p>
                          <ol className="mt-3 space-y-2 text-sm leading-7 text-[var(--pa-text-muted)]">
                            {state.data.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--pa-text-soft)]">{state?.error ?? "No verified merchant help path is stored for this service yet."}</p>
                  )}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--pa-border)] bg-white/84 px-4 py-3">
      <div className="flex items-center gap-2 text-[var(--pa-primary)]">
        {icon}
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{label}</p>
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--pa-text)]">{value}</p>
    </div>
  );
}
