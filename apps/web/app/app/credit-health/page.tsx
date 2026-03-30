import { ArrowDownCircle, CalendarClock, ShieldCheck, WalletCards } from "lucide-react";

import { CreditHealthCard } from "@/components/credit-health-card";
import { ExpandableNote } from "@/components/expandable-note";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getCreditSummary } from "@/lib/api";
import {
  buildCreditCardPresentations,
  buildCreditDriverPresentations,
  buildCreditOverviewPresentation,
  buildCreditPriorityPresentation
} from "@/lib/credit-health-presentation";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { getPageFramePersonas } from "@/lib/page-data";

const driverToneStyles = {
  default: "border-[var(--pa-border)] bg-white/78",
  important: "border-[rgba(183,139,66,0.2)] bg-[rgba(248,234,215,0.76)]",
  urgent: "border-[rgba(179,71,71,0.2)] bg-[rgba(247,223,223,0.76)]",
  safe: "border-[rgba(31,138,92,0.18)] bg-[rgba(223,244,234,0.76)]"
} as const;

export default async function CreditHealthPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "credit-score-pressure";
  const [personas, credit] = await Promise.all([getPageFramePersonas(), getCreditSummary(personaId)]);

  const priority = buildCreditPriorityPresentation(credit.cards);
  const overview = buildCreditOverviewPresentation(credit);
  const drivers = buildCreditDriverPresentations(credit);
  const cardPresentations = buildCreditCardPresentations(credit.cards, priority.cardId);
  const totalInterest = credit.cards.reduce((sum, card) => sum + card.interest_charged_last_six_months, 0);
  const priorityCard = credit.cards.find((card) => card.id === priority.cardId) ?? credit.cards[0] ?? null;

  return (
    <PageFrame pathname="/app/credit-health" personaId={personaId} personas={personas}>
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(18,32,43,0.14)] bg-[linear-gradient(135deg,rgba(19,36,47,0.98),rgba(18,32,43,0.92)_58%,rgba(31,116,104,0.85))] px-5 py-5 text-white shadow-[0_28px_64px_rgba(8,15,22,0.22)] md:rounded-[32px] md:px-7 md:py-6">
        <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[rgba(183,139,66,0.22)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-[rgba(255,255,255,0.08)] blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.42fr)_320px] lg:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">What to pay next</p>
              <StatusPill tone={priority.badgeTone}>{priority.badge}</StatusPill>
            </div>
            <div className="space-y-2">
              <h2 className="max-w-3xl text-balance font-display text-[2rem] font-semibold leading-tight text-white md:text-[2.2rem]">
                {priority.headline}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-white/74 md:text-[0.98rem] md:leading-7">{priority.summary}</p>
            </div>
            <ExpandableNote
              className="max-w-3xl"
              detail={
                <div className="space-y-3">
                  {priority.detail.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              }
              label="Why this comes first"
              summary="See the usage, payment-timing, and promo signals behind this recommendation."
            />
          </div>

          <div className="rounded-[24px] border border-white/12 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur md:rounded-[28px] md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">{priority.actionLabel}</p>
                <p className="mt-3 font-display text-[2.65rem] font-semibold leading-none tabular-nums text-white md:text-4xl">
                  {priority.actionAmount > 0 ? formatCurrency(priority.actionAmount) : "Stay current"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/10 p-3 text-[var(--pa-accent)]">
                <WalletCards aria-hidden="true" className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/68">
              {priority.actionAmount > 0
                ? `Use this as the next focused move on ${priority.cardName}.`
                : "There is no extra-payment emergency right now. Staying current is the main job."}
            </p>
            <div className="mt-5 rounded-[20px] border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/46">{priority.actionDateLabel}</p>
              <p className="mt-2 text-sm text-white/74">{priority.actionDate ? formatDate(priority.actionDate) : "Keep balances low before statement close"}</p>
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        eyebrow="Overall standing"
        title={overview.headline}
        description={overview.summary}
        descriptionLabel="How to read this"
        descriptionDetail="This page is aimed at everyday decisions, not bureau-level reporting. The key questions are whether you are current, whether one card is too high, and whether interest or promo deadlines need attention."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusPill tone={overview.tone}>
            {overview.tone === "urgent" ? "Act now" : overview.tone === "important" ? "Needs attention" : "Looking steady"}
          </StatusPill>
          <p className="text-sm text-[var(--pa-text-muted)]">
            {priorityCard ? `${priorityCard.display_name} is the card to watch first.` : "No single card stands out right now."}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            detail={credit.score_available ? credit.trend_label : "Some seeded profiles do not include a score feed."}
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Credit score"
            tone={overview.scoreTone}
            value={credit.score_available && credit.current_score !== null ? `${credit.current_score}` : "Unavailable"}
          />
          <MetricCard
            detail={credit.utilization_pressure >= 0.5 ? "High overall usage is usually the fastest thing to improve." : "Overall card usage is in a calmer range."}
            icon={<WalletCards className="h-5 w-5" />}
            label="Overall card use"
            tone={overview.utilizationTone}
            value={formatPercent(credit.utilization_pressure)}
          />
          <MetricCard
            detail="This reflects interest already paid, not future estimates."
            icon={<ArrowDownCircle className="h-5 w-5" />}
            label="Interest paid recently"
            tone={overview.interestTone}
            value={formatCurrency(totalInterest)}
          />
          <MetricCard
            detail="Based on the recent seeded payment pattern, not a live bureau feed."
            icon={<CalendarClock className="h-5 w-5" />}
            label="Payment habit"
            tone="primary"
            value={credit.payment_behavior}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="What’s helping or hurting"
        title="The signals shaping credit right now"
        description="Use these as the short version of what matters before diving into each card."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {drivers.map((driver) => (
            <div
              key={driver.title}
              className={`rounded-[24px] border p-5 shadow-[var(--pa-shadow-sm)] ${driverToneStyles[driver.tone]}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-[1.08rem] text-[var(--pa-text)]">{driver.title}</h3>
                <StatusPill tone={driver.tone}>
                  {driver.tone === "urgent" ? "Now" : driver.tone === "important" ? "Watch" : driver.tone === "safe" ? "Okay" : "Info"}
                </StatusPill>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--pa-text-muted)]">{driver.summary}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Every card in view"
        title="What each card needs next"
        description="Use this section to compare usage, due dates, statement-close timing, and interest without digging through card statements."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {cardPresentations.map((presentation) => {
            const card = credit.cards.find((item) => item.id === presentation.id);
            if (!card) return null;
            return <CreditHealthCard key={card.id} card={card} presentation={presentation} />;
          })}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
