import type { ReactNode } from "react";
import { ArrowRightLeft, CircleDollarSign, ShieldCheck } from "lucide-react";

import { PageFrame } from "@/components/page-frame";
import { SimulationPanel } from "@/components/simulation-panel";
import { StatusPill } from "@/components/status-pill";
import { getDashboard, getSimulationHistory } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatNumber } from "@/lib/format";

export default async function SimulationPage({
  searchParams
}: {
  searchParams: Promise<{
    persona?: string;
    mode?: "affordability" | "allocation";
    amount?: string;
    cadence?: "one_time" | "monthly";
    date?: string;
    label?: string;
  }>;
}) {
  const { persona, mode, amount, cadence, date, label } = await searchParams;
  const personaId = persona ?? "good-cash-poor-payment-allocation";
  const [personas, dashboard, initialHistory] = await Promise.all([
    getPageFramePersonas(),
    getDashboard(personaId),
    getSimulationHistory(personaId, 6)
  ]);
  const initialAmount = Number(amount ?? 500);
  const initialPlanner = {
    mode: mode === "allocation" ? "allocation" : "affordability",
    amount: Number.isFinite(initialAmount) && initialAmount > 0 ? initialAmount : 500,
    cadence: cadence === "monthly" ? "monthly" : "one_time",
    effectiveDate: date ?? new Date().toISOString().slice(0, 10),
    label: label ?? ""
  } as const;

  return (
    <PageFrame pathname="/app/simulation" personaId={personaId} personas={personas}>
      <section className="rounded-[28px] border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-md)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Decision lab</p>
              <StatusPill tone="safe">Next-dollar planner</StatusPill>
            </div>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-[var(--pa-text)] md:text-[2.2rem]">
              See whether an amount fits, then learn where it should go.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              Start with a one-time or monthly amount, check whether it works without outside income, and then use the allocation planner to split that money across debt, reserve, and investing.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-white/84 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Current monthly room</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[var(--pa-text)]">
              {formatCurrency(dashboard.net_monthly_cash_flow)} left over each month
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <InlineContext
            icon={<CircleDollarSign aria-hidden="true" className="h-4 w-4" />}
            label="Money left this week"
            value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)}
          />
          <InlineContext
            icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
            label="Money health"
            value={`${formatNumber(dashboard.financial_health.overall_score)}/100`}
          />
          <InlineContext
            icon={<ArrowRightLeft aria-hidden="true" className="h-4 w-4" />}
            label="Planner focus"
            value="Affordability + next-dollar allocation"
          />
        </div>
      </section>

      <SimulationPanel initialHistory={initialHistory} initialPlanner={initialPlanner} personaId={personaId} />
    </PageFrame>
  );
}

function InlineContext({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--pa-border)] bg-white/84 px-4 py-4 shadow-[var(--pa-shadow-sm)]">
      <div className="flex items-center gap-2 text-[var(--pa-primary)]">
        {icon}
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{label}</p>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-[var(--pa-text)]">{value}</p>
    </div>
  );
}
