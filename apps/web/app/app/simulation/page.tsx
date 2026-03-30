import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SimulationPanel } from "@/components/simulation-panel";
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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Current surplus" value={formatCurrency(dashboard.net_monthly_cash_flow)} tone="success" />
        <MetricCard label="Safe to Spend this week" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)} tone="primary" />
        <MetricCard label="Current score" value={`${formatNumber(dashboard.financial_health.overall_score)}/100`} />
      </section>
      <SimulationPanel personaId={personaId} initialHistory={initialHistory} />
    </PageFrame>
  );
}
