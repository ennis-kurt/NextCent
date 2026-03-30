import type { ReactNode } from "react";
import { Calculator, CircleDollarSign, ShieldCheck, Sparkles } from "lucide-react";

import { PageFrame } from "@/components/page-frame";
import { SimulationPanel } from "@/components/simulation-panel";
import { StatusPill } from "@/components/status-pill";
import { getDashboard, getSimulationHistory } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatNumber } from "@/lib/format";

export default async function SimulationPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "good-cash-poor-payment-allocation";
  const [personas, dashboard, initialHistory] = await Promise.all([
    getPageFramePersonas(),
    getDashboard(personaId),
    getSimulationHistory(personaId)
  ]);

  return (
    <PageFrame pathname="/app/simulation" personaId={personaId} personas={personas}>
      <section className="rounded-[28px] border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-md)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Decision lab</p>
              <StatusPill tone="safe">What-if modeling</StatusPill>
            </div>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-[var(--pa-text)] md:text-[2.2rem]">
              Try the next money move before you make it.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              Build a quick scenario, see the likely change to surplus and comfort level, and reopen saved runs without re-entering the setup.
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
            icon={<Sparkles aria-hidden="true" className="h-4 w-4" />}
            label="Saved runs"
            value={initialHistory.length > 0 ? `${initialHistory.length} ready to reopen` : "No saved runs yet"}
          />
        </div>
      </section>

      <SimulationPanel personaId={personaId} initialHistory={initialHistory} />
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
