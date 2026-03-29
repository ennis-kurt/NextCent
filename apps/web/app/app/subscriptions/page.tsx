import { PageFrame } from "@/components/page-frame";
import { SectionCard } from "@/components/section-card";
import { SubscriptionsPanel } from "@/components/subscriptions-panel";
import { getSubscriptions } from "@/lib/api";
import { getPageFramePersonas } from "@/lib/page-data";

export default async function SubscriptionsPage({
  searchParams
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona } = await searchParams;
  const personaId = persona ?? "subscription-heavy";
  const [personas, subscriptions] = await Promise.all([getPageFramePersonas(), getSubscriptions(personaId)]);

  return (
    <PageFrame pathname="/app/subscriptions" personaId={personaId} personas={personas}>
      <SectionCard
        eyebrow="Recurring Charges"
        title="Review subscription spend before it compounds"
        description="The module focuses on verified merchant help paths so you can manage recurring services where they actually live."
        descriptionDetail="Subscriptions are shown in full, with action status visible up front and merchant help paths loaded only when you ask for them."
      >
        <SubscriptionsPanel personaId={personaId} subscriptions={subscriptions} />
      </SectionCard>
    </PageFrame>
  );
}
