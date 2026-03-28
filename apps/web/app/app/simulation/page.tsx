import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SimulationPanel } from "@/components/simulation-panel";
import { getDashboard } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default async function SimulationPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "good-cash-poor-payment-allocation";
  const dashboard = await getDashboard(personaId);

  return (
    <PageFrame pathname="/app/simulation" personaId={personaId}>
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Current surplus" value={formatCurrency(dashboard.net_monthly_cash_flow)} tone="success" />
        <MetricCard label="Safe to Spend this week" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)} tone="primary" />
        <MetricCard label="Current score" value={`${dashboard.financial_health.overall_score.toFixed(0)}/100`} />
      </section>
      <SimulationPanel personaId={personaId} />
    </PageFrame>
  );
}
