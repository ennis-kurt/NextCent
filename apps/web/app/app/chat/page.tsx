import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { ChatPanel } from "@/components/chat-panel";
import { getDashboard } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "subscription-heavy";
  const dashboard = await getDashboard(personaId);

  return (
    <PageFrame pathname="/app/chat" personaId={personaId}>
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Current score" value={`${dashboard.financial_health.overall_score.toFixed(0)}/100`} tone="primary" />
        <MetricCard label="Safe to Spend this week" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)} tone="success" />
        <MetricCard label="Top action" value={dashboard.top_recommendations[0]?.title ?? "No action"} />
      </section>
      <ChatPanel personaId={personaId} />
    </PageFrame>
  );
}
