import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { ChatPanel } from "@/components/chat-panel";
import { getDashboard, getLatestChatSession } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";
import { formatCurrency, formatNumber } from "@/lib/format";

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "subscription-heavy";
  const [personas, dashboard, initialTranscript] = await Promise.all([
    getPageFramePersonas(),
    getDashboard(personaId),
    getLatestChatSession(personaId)
  ]);

  return (
    <PageFrame pathname="/app/chat" personaId={personaId} personas={personas}>
      <section className="grid gap-4 xl:grid-cols-3">
        <MetricCard label="Current score" value={`${formatNumber(dashboard.financial_health.overall_score)}/100`} tone="primary" />
        <MetricCard label="Safe to Spend this week" value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)} tone="success" />
        <MetricCard label="Top action" value={dashboard.top_recommendations[0]?.title ?? "No action"} />
      </section>
      <ChatPanel personaId={personaId} initialTranscript={initialTranscript} />
    </PageFrame>
  );
}
