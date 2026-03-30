import type { ReactNode } from "react";
import { LockKeyhole, ShieldCheck, ShieldOff, VenetianMask } from "lucide-react";

import { MetricCard } from "@/components/metric-card";
import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getSanitizationPolicy } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { getPageFramePersonas } from "@/lib/page-data";

export default async function PrivacyPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "high-debt-strong-income";
  const [personas, policy] = await Promise.all([getPageFramePersonas(), getSanitizationPolicy()]);

  return (
    <PageFrame pathname="/app/privacy" personaId={personaId} personas={personas}>
      <section className="rounded-[28px] border border-[rgba(18,32,43,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-md)] md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Privacy controls</p>
              <StatusPill tone="safe">Visible in product</StatusPill>
            </div>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-[var(--pa-text)] md:text-[2.2rem]">
              What the AI can see is explicit here, not buried in policy copy.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">
              Structured financial calculations happen before any model boundary, and the product keeps a visible list of what is safe, masked, or blocked.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-white/84 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Current mode</p>
            <p className="mt-2 max-w-[16rem] text-sm font-semibold leading-6 text-[var(--pa-text)]">{policy.llm_mode}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Safe fields" tone="success" value={formatNumber(policy.safe_for_llm.length)} />
          <MetricCard icon={<VenetianMask className="h-5 w-5" />} label="Masked fields" tone="warning" value={formatNumber(policy.masked_for_llm.length)} />
          <MetricCard icon={<ShieldOff className="h-5 w-5" />} label="Blocked fields" tone="danger" value={formatNumber(policy.blocked_for_llm.length)} />
          <MetricCard icon={<LockKeyhole className="h-5 w-5" />} label="Privacy notes" tone="primary" value={formatNumber(policy.notes.length)} />
        </div>
      </section>

      <SectionCard
        eyebrow="Data boundary"
        title="What is shared, masked, or never sent"
        description="This is the product’s practical privacy boundary in one screen."
      >
        <div className="grid gap-6 xl:grid-cols-3">
          <Bucket
            icon={<ShieldCheck aria-hidden="true" className="h-5 w-5 text-[var(--pa-success)]" />}
            items={policy.safe_for_llm}
            title="Safe to summarize"
            tone="border-[rgba(31,138,92,0.18)] bg-[var(--pa-success-soft)]"
          />
          <Bucket
            icon={<VenetianMask aria-hidden="true" className="h-5 w-5 text-[var(--pa-warning)]" />}
            items={policy.masked_for_llm}
            title="Shared only in masked form"
            tone="border-[rgba(183,139,66,0.2)] bg-[var(--pa-warning-soft)]"
          />
          <Bucket
            icon={<ShieldOff aria-hidden="true" className="h-5 w-5 text-[var(--pa-danger)]" />}
            items={policy.blocked_for_llm}
            title="Never sent to the model"
            tone="border-[rgba(179,71,71,0.2)] bg-[var(--pa-danger-soft)]"
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="What this means"
        title="How to read the privacy policy in plain English"
        description="These notes describe the product behavior, not legal boilerplate."
      >
        <div className="space-y-3">
          {policy.notes.map((note) => (
            <div key={note} className="rounded-[22px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm leading-7 text-[var(--pa-text-muted)]">
              {note}
            </div>
          ))}
          <div className="rounded-[22px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm leading-7 text-[var(--pa-text-muted)]">
            NextCent helps with financial guidance and explanation. It is not regulated investment, tax, or legal advice, and major decisions should still be verified independently.
          </div>
        </div>
      </SectionCard>
    </PageFrame>
  );
}

function Bucket({
  title,
  items,
  icon,
  tone
}: {
  title: string;
  items: string[];
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className={`rounded-[24px] border p-5 ${tone}`}>
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="font-display text-[1.18rem] text-[var(--pa-text)]">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-7 text-[var(--pa-text-muted)]">
        {items.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </div>
  );
}
