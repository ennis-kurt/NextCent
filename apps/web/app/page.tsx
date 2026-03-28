import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";

import { Logo } from "@/components/logo";
import { MetricCard } from "@/components/metric-card";
import { SectionCard } from "@/components/section-card";

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="rounded-[36px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.78)] px-6 py-6 shadow-hero backdrop-blur lg:px-10 lg:py-8">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Logo />
              <p className="mt-8 text-xs uppercase tracking-[0.28em] text-[var(--pa-text-soft)]">An AI personal accountant for everyday financial health</p>
              <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-tight text-[var(--pa-text)] lg:text-7xl">
                Understand where your money is going. Protect your cash flow. Make the next move with confidence.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--pa-text-muted)]">
                Personal Accountant AI is a privacy-first financial operating surface for cash flow, debt strategy, subscription waste, Safe to Spend, and practical next actions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--pa-surface-ink)] px-6 py-3 text-sm font-semibold text-white"
                >
                  Launch seeded demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/app/dashboard?persona=high-debt-strong-income"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--pa-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--pa-text)]"
                >
                  View command center
                </Link>
              </div>
            </div>
            <div className="grid w-full max-w-xl gap-4 md:grid-cols-2">
              <MetricCard
                label="Safe to Spend"
                value="$120"
                tone="primary"
                detail="Living guidance based on balances, upcoming bills, minimum debt payments, and current pace."
                icon={<Wallet className="h-5 w-5" />}
              />
              <MetricCard
                label="Top action"
                value="Pay Card B"
                tone="warning"
                detail="Recommendations are ranked by urgency, impact, feasibility, and risk reduction."
                icon={<Sparkles className="h-5 w-5" />}
              />
              <MetricCard
                label="Privacy mode"
                value="Sanitized"
                tone="success"
                detail="External AI access is disabled by default and raw financial payloads are never sent through the model boundary."
                icon={<ShieldCheck className="h-5 w-5" />}
              />
              <MetricCard
                label="Decision support"
                value="Scenario lab"
                detail="Model a payment, subscription cut, or new monthly expense before you commit."
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <SectionCard
            eyebrow="Positioning"
            title="Built for people who want clear guidance, not another noisy finance dashboard."
            description="The interface separates signal from noise and makes privacy visible. It behaves like a personal accountant and financial operator, not a hype-driven chatbot."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {[
                "Where is my money going right now?",
                "Am I at risk of running short before payday?",
                "Which card should I pay first without leaving myself cash fragile?",
                "Which subscriptions should I review this week?"
              ].map((question) => (
                <div key={question} className="rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5 text-sm text-[var(--pa-text-muted)]">
                  {question}
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard
            eyebrow="Trust"
            title="How the product earns trust"
            description="Least-privilege, read-only account modeling with deterministic finance logic first and sanitized AI second."
          >
            <ul className="space-y-4 text-sm leading-7 text-[var(--pa-text-muted)]">
              <li>Read-only account access model for the MVP.</li>
              <li>Raw transaction descriptions, account identifiers, names, and addresses are blocked from external model payloads.</li>
              <li>Recommendations and simulations separate facts from estimates and expose assumptions.</li>
              <li>The product provides guidance and insights, not investment, tax, or legal advice.</li>
            </ul>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
