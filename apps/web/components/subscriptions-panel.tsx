"use client";

import type { SubscriptionSummary } from "@contracts";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { getCancellationLink } from "@/lib/api";
import { formatCurrency, formatDate, formatPercent, titleCase } from "@/lib/format";
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
    <div className="grid gap-5 xl:grid-cols-2">
      {subscriptions.map((subscription) => {
        const state = states[subscription.id];
        const isLoading = loadingId === subscription.id && isPending;

        return (
          <article key={subscription.id} className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">{subscription.merchant_key}</p>
                <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">{subscription.label}</h3>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <StatusPill tone={wasteTone(subscription.waste_risk)}>{subscription.waste_risk}</StatusPill>
                <StatusPill>{titleCase(subscription.action_status)}</StatusPill>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Monthly spend</p>
                <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(subscription.monthly_amount)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Next expected</p>
                <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatDate(subscription.next_expected_at)}</p>
              </div>
              <div className="rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Detection confidence</p>
                <p className="mt-2 font-display text-2xl tabular-nums text-[var(--pa-text)]">{formatPercent(subscription.confidence)}</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--pa-border)] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--pa-text)]">What to do next</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--pa-text-muted)]">
                    Review whether you still use this service before the next billing date and manage it from the merchant account page when possible.
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
                  {state?.expanded ? "Hide help path" : "Load help path"}
                </button>
              </div>

              {state?.expanded ? (
                <div className="mt-4 rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4">
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
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Suggested path</p>
                          <ol className="mt-3 space-y-2 text-sm text-[var(--pa-text-muted)]">
                            {state.data.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--pa-text-soft)]">
                      {state?.error ?? "No verified merchant help path is stored for this service yet."}
                    </p>
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
