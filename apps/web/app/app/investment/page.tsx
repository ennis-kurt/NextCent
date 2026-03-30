import { ArrowDownCircle, Shield, TrendingUp, WalletCards } from "lucide-react";

import { ExpandableNote } from "@/components/expandable-note";
import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getCreditSummary, getDashboard, getDebtStrategies, getInvestmentGuidance } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/format";
import { resolveInvestmentGuidance } from "@/lib/investment";
import {
  buildInvestmentCoachPresentation,
  buildInvestmentPathPresentations,
  buildInvestmentStepPresentations
} from "@/lib/investment-presentation";
import { getPageFramePersonas } from "@/lib/page-data";

const pathToneStyles = {
  default: "border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.9))]",
  primary: "border-[rgba(31,116,104,0.18)] bg-[rgba(223,241,235,0.76)]",
  warning: "border-[rgba(183,139,66,0.2)] bg-[rgba(248,234,215,0.76)]",
  danger: "border-[rgba(179,71,71,0.2)] bg-[rgba(247,223,223,0.76)]",
  success: "border-[rgba(31,138,92,0.18)] bg-[rgba(223,244,234,0.76)]"
} as const;

const stepToneMap = {
  default: "default",
  important: "important",
  urgent: "urgent",
  safe: "safe"
} as const;

export default async function InvestmentPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "healthy-cashflow";
  const [personas, dashboard, directInvestment, debt, credit] = await Promise.all([
    getPageFramePersonas(),
    getDashboard(personaId),
    getInvestmentGuidance(personaId).catch(() => null),
    getDebtStrategies(personaId),
    getCreditSummary(personaId)
  ]);

  const { guidance: investment, isFallback: investmentFallback } = resolveInvestmentGuidance({
    dashboard,
    debt,
    directGuidance: directInvestment
  });

  const coach = buildInvestmentCoachPresentation({
    guidance: investment,
    debt,
    cards: credit.cards
  });
  const paths = buildInvestmentPathPresentations(investment);
  const steps = buildInvestmentStepPresentations(investment);

  return (
    <PageFrame pathname="/app/investment" personaId={personaId} personas={personas}>
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(18,32,43,0.14)] bg-[linear-gradient(135deg,rgba(19,36,47,0.98),rgba(18,32,43,0.92)_58%,rgba(31,116,104,0.85))] px-5 py-5 text-white shadow-[0_28px_64px_rgba(8,15,22,0.22)] md:rounded-[32px] md:px-7 md:py-6">
        <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[rgba(183,139,66,0.22)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-[rgba(255,255,255,0.08)] blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.42fr)_320px] lg:items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Should you invest right now?</p>
              <StatusPill tone={coach.badgeTone}>{coach.badge}</StatusPill>
            </div>
            <div className="space-y-2">
              <h2 className="max-w-3xl text-balance font-display text-[2rem] font-semibold leading-tight text-white md:text-[2.2rem]">
                {coach.headline}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-white/74 md:text-[0.98rem] md:leading-7">{coach.summary}</p>
            </div>
            <ExpandableNote
              className="max-w-3xl"
              detail={
                <div className="space-y-3">
                  {coach.detail.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              }
              label="Why this answer"
              summary={coach.detailSummary}
            />
          </div>

          <div className="rounded-[24px] border border-white/12 bg-white/[0.08] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur md:rounded-[28px] md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">{coach.amountLabel}</p>
                <p className="mt-3 font-display text-[2.65rem] font-semibold leading-none tabular-nums text-white md:text-4xl">
                  {formatCurrency(coach.amountValue)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-black/10 p-3 text-[var(--pa-accent)]">
                {investment.posture === "invest_now" ? (
                  <TrendingUp aria-hidden="true" className="h-5 w-5" />
                ) : investment.posture === "buffer_first" ? (
                  <Shield aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <ArrowDownCircle aria-hidden="true" className="h-5 w-5" />
                )}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-white/68">{coach.amountDetail}</p>
            <div className="mt-5 rounded-[20px] border border-white/10 bg-black/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/46">{coach.destinationLabel}</p>
              <p className="mt-2 text-sm text-white/74">{coach.destinationValue}</p>
            </div>
          </div>
        </div>
      </section>

      {investmentFallback ? (
        <div className="rounded-[22px] border border-[rgba(31,116,104,0.16)] bg-[var(--pa-primary-soft)]/35 px-4 py-4 text-sm leading-7 text-[var(--pa-text-muted)]">
          This preview is using compatibility guidance derived from the dashboard and debt signals already loaded for this profile because the dedicated investment endpoint was unavailable.
        </div>
      ) : null}

      <SectionCard
        eyebrow="Best home for extra money"
        title="Where extra money should go right now"
        description="This page always picks one first home for new dollars: cash reserve, debt payoff, or investing."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {paths.map((path) => (
            <div
              key={path.label}
              className={`rounded-[24px] border p-5 shadow-[var(--pa-shadow-sm)] ${pathToneStyles[path.tone]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">{path.label}</p>
                  <h3 className="mt-2 font-display text-[1.18rem] text-[var(--pa-text)]">{path.title}</h3>
                </div>
                <StatusPill tone={path.selected ? (path.tone === "warning" ? "important" : path.tone === "success" ? "safe" : "default") : "default"}>
                  {path.selected ? "Now" : "Later"}
                </StatusPill>
              </div>
              <p className="mt-4 font-display text-[1.75rem] leading-none text-[var(--pa-text)]">{path.value}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--pa-text-muted)]">{path.summary}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:gap-6">
        <SectionCard
          eyebrow="Readiness checks"
          title="What is shaping this answer"
          description="These are the main signals the app is using before it green-lights new investing."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              detail="This is the monthly room the app sees after tracked income and spending."
              icon={<WalletCards className="h-5 w-5" />}
              label="Left over each month"
              tone={investment.monthly_surplus > 0 ? "primary" : "danger"}
              value={formatCurrency(investment.monthly_surplus)}
            />
            <MetricCard
              detail="This is the liquid cushion available before longer-term investing starts to feel crowded."
              icon={<Shield className="h-5 w-5" />}
              label="Cash cushion"
              tone={investment.liquid_buffer_months >= 3 ? "success" : investment.liquid_buffer_months >= 1.5 ? "primary" : "warning"}
              value={`${investment.liquid_buffer_months.toFixed(1)} mo`}
            />
            <MetricCard
              detail="Fees and interest already paid are a direct drag on the same money that could be invested."
              icon={<ArrowDownCircle className="h-5 w-5" />}
              label="Debt drag"
              tone={investment.fee_and_interest_leakage > 40 ? "warning" : "default"}
              value={formatCurrency(investment.fee_and_interest_leakage)}
            />
            <MetricCard
              detail="A very high card APR usually beats any realistic low-risk investment return."
              icon={<TrendingUp className="h-5 w-5" />}
              label="Highest card APR"
              tone={investment.max_apr !== null && investment.max_apr >= 18 ? "warning" : "success"}
              value={investment.max_apr !== null ? `${formatNumber(investment.max_apr)}%` : "None"}
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="How to use it"
          title="Turn the recommendation into a simple next move"
          description="The goal is to make this decision easy to repeat, not to create more investment homework."
        >
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.title} className="rounded-[22px] border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-[1.08rem] text-[var(--pa-text)]">{step.title}</h3>
                  <StatusPill tone={stepToneMap[step.tone]}>{step.tone === "safe" ? "Ready" : step.tone === "important" ? "Focus" : step.tone === "urgent" ? "Now" : "Guide"}</StatusPill>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">{step.summary}</p>
              </div>
            ))}
          </div>
          <ExpandableNote
            className="mt-5"
            detail={
              <ul className="space-y-2">
                {investment.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            }
            label="Assumptions"
            summary="Review the guardrails and assumptions behind this recommendation."
          />
        </SectionCard>
      </section>
    </PageFrame>
  );
}
