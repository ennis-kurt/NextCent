import Link from "next/link";

import { Logo } from "@/components/logo";
import { SectionCard } from "@/components/section-card";

const steps = [
  {
    title: "Value proposition",
    body: "Get a clear view of cash, debt, subscriptions, and the next best financial action instead of raw transaction clutter."
  },
  {
    title: "How it works",
    body: "Structured account data is normalized, scored, stress-tested, and then explained through grounded assistant flows."
  },
  {
    title: "Privacy and permissions",
    body: "The MVP models read-only account access and sanitizes financial payloads before any external AI boundary."
  },
  {
    title: "Connect accounts",
    body: "Start with a seeded scenario today. The architecture is ready for real aggregation adapters later."
  },
  {
    title: "Initial analysis",
    body: "The app computes Financial Health, Safe to Spend, risks, debt strategies, and ranked actions before showing the dashboard."
  }
];

export default function OnboardingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 lg:px-6">
      <div className="rounded-[36px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.78)] p-8 shadow-hero backdrop-blur lg:p-10">
        <Logo />
        <p className="mt-8 text-xs uppercase tracking-[0.28em] text-[var(--pa-text-soft)]">Onboarding</p>
        <h1 className="mt-4 font-display text-5xl font-semibold text-[var(--pa-text)]">Clarity first. Permissions second.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--pa-text-muted)]">
          Before asking for data, the product explains what it does, what the AI can see, what stays masked, and how guidance is generated.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {steps.map((step, index) => (
            <SectionCard key={step.title} eyebrow={`Step ${index + 1}`} title={step.title}>
              <p className="text-sm leading-7 text-[var(--pa-text-muted)]">{step.body}</p>
            </SectionCard>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/app/dashboard?persona=high-debt-strong-income"
            className="rounded-full bg-[var(--pa-surface-ink)] px-6 py-3 text-sm font-semibold text-white"
          >
            Enter the seeded app
          </Link>
          <Link
            href="/app/privacy?persona=high-debt-strong-income"
            className="rounded-full border border-[var(--pa-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--pa-text)]"
          >
            Read privacy controls
          </Link>
        </div>
      </div>
    </main>
  );
}
