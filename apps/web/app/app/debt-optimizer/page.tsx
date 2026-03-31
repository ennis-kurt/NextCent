import Link from "next/link";
import { ArrowDownCircle, Clock3, ShieldAlert, WalletCards } from "lucide-react";

import { BalanceHistoryChart } from "@/components/charts";
import { DebtAccountCard } from "@/components/debt-account-card";
import { DebtStrategyGrid } from "@/components/debt-strategy-grid";
import { ExpandableNote } from "@/components/expandable-note";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getCreditSummary, getDebtStrategies } from "@/lib/api";
import { buildDebtPriorityPresentation, buildDeferredOfferPresentations } from "@/lib/debt-optimizer-presentation";
import { formatCurrency, formatDate, formatPercent, formatNumber } from "@/lib/format";
import { getPageFramePersonas } from "@/lib/page-data";

export default async function DebtOptimizerPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, debt, credit] = await Promise.all([getPageFramePersonas(), getDebtStrategies(personaId), getCreditSummary(personaId)]);
  const cards = credit.cards.map((card) => ({
    ...card,
    balance_history: card.balance_history ?? [],
    deferred_interest_offers: card.deferred_interest_offers ?? [],
    minimum_monthly_payment_to_avoid_deferred_interest: card.minimum_monthly_payment_to_avoid_deferred_interest ?? null
  }));

  const priority = buildDebtPriorityPresentation({
    debt,
    cards
  });
  const deferredOffers = buildDeferredOfferPresentations(cards);
  const priorityCard = cards.find((card) => card.id === priority.cardId) ?? cards[0];
  const interestThisMonth = cards.reduce((sum, card) => sum + card.interest_charged_this_month, 0);
  const interestSixMonths = cards.reduce((sum, card) => sum + card.interest_charged_last_six_months, 0);
  const prioritySimulationHref = `/app/simulation?${new URLSearchParams({
    persona: personaId,
    mode: "allocation",
    amount: String(Math.max(0, Math.round(priority.amountValue))),
    cadence: deferredOffers.length > 0 ? "monthly" : "one_time",
    label: priorityCard ? `Debt plan for ${priorityCard.sanitized_name}` : "Debt payment plan"
  }).toString()}`;

  return (
    <PageFrame pathname="/app/debt-optimizer" personaId={personaId} personas={personas}>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pay this card next"
          value={priorityCard?.sanitized_name ?? "Priority target"}
          tone="primary"
          detail={priority.summary}
          icon={<WalletCards className="h-5 w-5" />}
        />
        <MetricCard
          label={deferredOffers.length > 0 ? "Promo deadline" : "Target payment"}
          value={
            deferredOffers.length > 0
              ? `${formatNumber(deferredOffers[0].daysRemaining)} days`
              : formatCurrency(priority.amountValue)
          }
          tone={deferredOffers.length > 0 ? (deferredOffers[0].tone === "urgent" ? "danger" : "warning") : "primary"}
          detail={
            deferredOffers.length > 0
              ? `${priorityCard?.display_name ?? "This card"} has financing that expires on ${formatDate(deferredOffers[0].expiresOn)}.`
              : "Use the recommended plan amount after minimums are covered."
          }
          icon={<Clock3 className="h-5 w-5" />}
        />
        <MetricCard
          label="Interest this month"
          value={formatCurrency(interestThisMonth)}
          tone={interestThisMonth > 150 ? "warning" : "default"}
          detail="Recent interest charges across connected revolving balances."
          icon={<ArrowDownCircle className="h-5 w-5" />}
        />
        <MetricCard
          label="Interest, 6 months"
          value={formatCurrency(interestSixMonths)}
          tone="warning"
          detail={credit.payment_behavior}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </section>

      {priorityCard ? (
        <SectionCard
          eyebrow="Priority target"
          title="Why this card comes first"
          description={priority.summary}
          descriptionLabel="How this was chosen"
          descriptionDetail="This priority blends the current strategy recommendation with hard timing constraints like promo deadlines, utilization pressure, and recent interest drag."
        >
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:gap-6">
            <div className="min-w-0 overflow-hidden rounded-[24px] border border-[rgba(31,116,104,0.18)] bg-[linear-gradient(180deg,rgba(231,243,240,0.72),rgba(255,255,255,0.96))] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-2xl">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Main recommendation</p>
                  <h2 className="mt-3 font-display text-[1.9rem] leading-tight text-[var(--pa-text)]">{priority.headline}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">{priority.summary}</p>
                </div>
                <StatusPill tone={priority.badgeTone}>{priority.badge}</StatusPill>
              </div>

              <div className="mt-5 rounded-[22px] border border-[var(--pa-border)] bg-white/85 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{priority.amountLabel}</p>
                    <p className="mt-3 break-words font-display text-[2.25rem] leading-none tabular-nums text-[var(--pa-text)] sm:text-[2.6rem]">
                      {formatCurrency(priority.amountValue)}
                    </p>
                  </div>
                  <div className="self-start rounded-2xl border border-[rgba(31,116,104,0.16)] bg-[var(--pa-primary-soft)]/55 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Statement close</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">
                      {priorityCard.statement_close_date ? formatDate(priorityCard.statement_close_date) : "Unavailable"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--pa-text-muted)]">{priority.amountDetail}</p>
                <Link
                  href={prioritySimulationHref}
                  className="mt-4 inline-flex items-center justify-center rounded-full border border-[rgba(31,116,104,0.18)] bg-[var(--pa-primary-soft)]/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pa-primary)] transition-[background-color,transform] duration-150 hover:-translate-y-0.5 hover:bg-[var(--pa-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)]"
                >
                  Model this amount
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {priority.detail.map((item) => (
                  <div key={item} className="rounded-[18px] border border-[var(--pa-border)] bg-white/72 px-4 py-3 text-sm leading-6 text-[var(--pa-text-muted)]">
                    {item}
                  </div>
                ))}
              </div>

              {priorityCard.minimum_monthly_payment_to_avoid_deferred_interest ? (
                <ExpandableNote
                  className="mt-4"
                  detail={
                    <div className="space-y-4">
                      {priorityCard.deferred_interest_offers.map((offer) => (
                        <div key={offer.id} className="rounded-[16px] border border-[rgba(180,107,24,0.14)] bg-[rgba(248,234,215,0.62)] px-4 py-4">
                          <p className="font-medium text-[var(--pa-text)]">{offer.label}</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">
                            About {formatCurrency(offer.remaining_deferred_amount)} remains, and the promo ends on {formatDate(offer.expires_on)}.
                          </p>
                          <p className="mt-3 text-sm font-semibold text-[var(--pa-text)]">
                            Pace needed: {formatCurrency(priorityCard.minimum_monthly_payment_to_avoid_deferred_interest ?? offer.required_monthly_payment_to_avoid_deferred_interest)} per month
                          </p>
                        </div>
                      ))}
                    </div>
                  }
                  label="Promo math"
                  summary="See the required monthly pace for the current promo financing."
                />
              ) : null}
            </div>

            <div className="min-w-0 overflow-hidden rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Priority account</p>
                  <h3 className="mt-2 break-words font-display text-[1.35rem] text-[var(--pa-text)]">{priorityCard.display_name}</h3>
                  <p className="mt-2 text-sm text-[var(--pa-text-muted)]">{priorityCard.sanitized_name}</p>
                </div>
                <StatusPill tone={priorityCard.utilization_estimate && priorityCard.utilization_estimate >= 0.7 ? "important" : "safe"}>
                  {priorityCard.utilization_estimate ? `${Math.round(priorityCard.utilization_estimate * 100)}% utilized` : "Tracked"}
                </StatusPill>
              </div>
              <div className="mt-4">
                <BalanceHistoryChart
                  ariaLabel={`Area chart showing the last 12 months of balance history for ${priorityCard.display_name}.`}
                  color={priorityCard.deferred_interest_offers.length > 0 ? "#b46b18" : "#1f7468"}
                  data={priorityCard.balance_history}
                />
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {deferredOffers.length > 0 ? (
        <SectionCard
          eyebrow="Promo balances"
          title="Deferred-interest deadlines to watch"
          description="These balances need their own pacing plan because missing the promo deadline can add interest back."
        >
          <div className="space-y-3">
            {deferredOffers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-[22px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.88))] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-[1.2rem] text-[var(--pa-text)]">{offer.cardName}</p>
                      <StatusPill tone={offer.tone}>{offer.daysRemaining} days left</StatusPill>
                    </div>
                    <p className="mt-2 text-sm text-[var(--pa-text-muted)]">{offer.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Needed each month</p>
                    <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(offer.requiredMonthlyPayment)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-[rgba(180,107,24,0.12)] bg-[rgba(248,234,215,0.55)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Promo balance left</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">{formatCurrency(offer.remainingAmount)}</p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(180,107,24,0.12)] bg-[rgba(248,234,215,0.55)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Deadline</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">{formatDate(offer.expiresOn)}</p>
                  </div>
                  <div className="rounded-[18px] border border-[rgba(180,107,24,0.12)] bg-[rgba(248,234,215,0.55)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Possible backcharge</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--pa-text)]">
                      {offer.estimatedBackcharge ? formatCurrency(offer.estimatedBackcharge) : "Deferred interest"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <DebtStrategyGrid key={personaId} cards={cards} debt={debt} />

      <SectionCard
        eyebrow="Every card in view"
        title="Balance trend, timing, and interest by account"
        description="Use this section to compare due dates, statement-close timing, utilization, interest drag, and any promo balances in one place."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map((card) => (
            <DebtAccountCard key={card.id} card={card} isPriority={card.id === priority.cardId} />
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
