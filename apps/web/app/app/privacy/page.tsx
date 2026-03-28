import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { getSanitizationPolicy } from "@/lib/api";
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
      <SectionCard
        eyebrow="How Your Data Is Used"
        title="Privacy controls are visible in the product, not buried in a footer."
        description="Structured financial calculations happen before any model boundary. External LLM usage is disabled by default in this MVP."
      >
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-success-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Safe for LLM</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--pa-text-muted)]">
              {policy.safe_for_llm.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-warning-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Masked for LLM</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--pa-text-muted)]">
              {policy.masked_for_llm.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-danger-soft)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Blocked from LLM</p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--pa-text-muted)]">
              {policy.blocked_for_llm.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>
      <SectionCard eyebrow="Notes" title="What the AI can see">
        <div className="space-y-3">
          {policy.notes.map((note) => (
            <div key={note} className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm leading-7 text-[var(--pa-text-muted)]">
              {note}
            </div>
          ))}
          <div className="rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 text-sm leading-7 text-[var(--pa-text-muted)]">
            The product provides financial guidance and insights. It does not provide regulated investment, tax, or legal advice, and major financial decisions should still be verified independently.
          </div>
        </div>
      </SectionCard>
    </PageFrame>
  );
}
