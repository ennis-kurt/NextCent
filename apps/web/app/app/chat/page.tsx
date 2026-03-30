import type { ReactNode } from "react";
import { Bot, CircleDollarSign, ShieldCheck, WalletCards } from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { PageFrame } from "@/components/page-frame";
import { StatusPill } from "@/components/status-pill";
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
      <section className="rounded-[28px] border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-md)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">AI assistant</p>
              <StatusPill tone="safe">Grounded answers</StatusPill>
            </div>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-[var(--pa-text)] md:text-[2.2rem]">
              Ask NextCent like an assistant, not like a help forum.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              This workspace keeps the latest thread for the selected profile, offers fast prompt actions, and shows the facts, estimates, and source cards behind each answer.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-white/84 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Current focus</p>
            <p className="mt-2 max-w-[16rem] text-sm font-semibold leading-6 text-[var(--pa-text)]">
              {dashboard.top_recommendations[0]?.title ?? "No priority set"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InlineContext
            icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
            label="Money health"
            value={`${formatNumber(dashboard.financial_health.overall_score)}/100`}
          />
          <InlineContext
            icon={<CircleDollarSign aria-hidden="true" className="h-4 w-4" />}
            label="Money left this week"
            value={formatCurrency(dashboard.safe_to_spend.safe_to_spend_this_week)}
          />
          <InlineContext
            icon={<WalletCards aria-hidden="true" className="h-4 w-4" />}
            label="Open thread"
            value={initialTranscript ? "Resuming saved conversation" : "Start a new one"}
          />
        </div>
      </section>

      <ChatPanel
        context={{
          healthScore: dashboard.financial_health.overall_score,
          safeToSpendThisWeek: dashboard.safe_to_spend.safe_to_spend_this_week,
          topAction: dashboard.top_recommendations[0]?.title ?? "No priority set"
        }}
        initialTranscript={initialTranscript}
        personaId={personaId}
      />
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
