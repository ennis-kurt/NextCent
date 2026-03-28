import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { StatusPill } from "@/components/status-pill";
import { getCancellationDraft, getCancellationLink, getSubscriptions } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function SubscriptionsPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "subscription-heavy";
  const subscriptions = await getSubscriptions(personaId);

  const actionData = await Promise.all(
    subscriptions.slice(0, 4).map(async (subscription) => {
      const [linkResult, draftResult] = await Promise.allSettled([
        getCancellationLink(personaId, subscription.id),
        getCancellationDraft(personaId, subscription.id)
      ]);
      return {
        subscription,
        link: linkResult.status === "fulfilled" ? linkResult.value : null,
        draft: draftResult.status === "fulfilled" ? draftResult.value : null
      };
    })
  );

  return (
    <PageFrame pathname="/app/subscriptions" personaId={personaId}>
      <SectionCard
        eyebrow="Recurring Charges"
        title="Review subscription spend before it compounds"
        description="The module goes beyond detection and surfaces verified help links plus editable cancellation drafts where available."
      >
        <div className="grid gap-5 xl:grid-cols-2">
          {actionData.map(({ subscription, link, draft }) => (
            <article key={subscription.id} className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">{subscription.merchant_key}</p>
                  <h3 className="mt-2 font-display text-xl text-[var(--pa-text)]">{subscription.label}</h3>
                </div>
                <StatusPill tone={subscription.waste_risk === "high" ? "important" : "safe"}>{subscription.waste_risk}</StatusPill>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Monthly spend</p>
                  <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatCurrency(subscription.monthly_amount)}</p>
                </div>
                <div className="rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Next expected</p>
                  <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{formatDate(subscription.next_expected_at)}</p>
                </div>
                <div className="rounded-2xl border border-[var(--pa-border)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">Detection confidence</p>
                  <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{Math.round(subscription.confidence * 100)}%</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--pa-border)] bg-white p-4">
                  <p className="text-sm font-semibold text-[var(--pa-text)]">What to do next</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--pa-text-muted)]">
                    This looks like a recurring subscription. Review whether you still use it before the next billing date.
                  </p>
                  {link?.help_url ? (
                    <a className="mt-3 inline-block text-sm font-semibold text-[var(--pa-primary)]" href={link.help_url}>
                      Open merchant help page
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--pa-text-soft)]">No verified merchant help link is stored for this service yet.</p>
                  )}
                </div>
                <div className="rounded-2xl border border-[var(--pa-border)] bg-white p-4">
                  <p className="text-sm font-semibold text-[var(--pa-text)]">Draft assistance</p>
                  {draft ? (
                    <>
                      <p className="mt-2 text-sm leading-7 text-[var(--pa-text-muted)]">{draft.body}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">{draft.disclaimer}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--pa-text-soft)]">
                      Draft cancellation support is only available for merchants with verified action metadata.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </PageFrame>
  );
}
