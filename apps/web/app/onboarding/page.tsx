import Link from "next/link";

import { Logo } from "@/components/logo";

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
    <main id="main-content" className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <section className="relative overflow-hidden rounded-[40px] border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(245,236,223,0.94))] p-6 shadow-[var(--pa-shadow-xl)] lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(31,116,104,0.14),transparent_24%),radial-gradient(circle_at_18%_100%,rgba(183,139,66,0.16),transparent_18%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,34,45,0.97),rgba(15,23,32,0.99))] p-6 text-white shadow-[0_32px_72px_rgba(10,16,24,0.28)]">
              <Logo tone="inverted" />
              <p className="mt-8 text-[11px] uppercase tracking-[0.26em] text-white/48">Onboarding / preflight</p>
              <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-tight text-white lg:text-5xl">
                Clarity first. Permissions second.
              </h1>
              <p className="mt-4 text-base leading-8 text-white/72">
                Before asking for data, the product explains what it does, what the AI can see, what stays masked, and how guidance is generated.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Read-only account modeling in the MVP",
                  "Deterministic finance logic before language generation",
                  "A seeded workspace you can enter immediately"
                ].map((item) => (
                  <div key={item} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/74">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/app/dashboard?persona=high-debt-strong-income"
                  className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[var(--pa-surface-ink)] transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[var(--pa-surface)] hover:shadow-[var(--pa-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface-ink)]"
                >
                  Enter the seeded app
                </Link>
                <Link
                  href="/app/privacy?persona=high-debt-strong-income"
                  className="rounded-full border border-white/14 bg-white/6 px-6 py-3 text-sm font-semibold text-white transition-[background-color,border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface-ink)]"
                >
                  Read privacy controls
                </Link>
              </div>
            </div>
            <div className="rounded-[34px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.74)] p-6 shadow-[var(--pa-shadow-md)] backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--pa-text-soft)]">Guided sequence</p>
              <h2 className="mt-3 max-w-2xl text-balance font-display text-3xl text-[var(--pa-text)]">
                The seeded experience explains the model before it asks for trust.
              </h2>
              <div className="relative mt-8 border-l border-[rgba(18,32,43,0.12)] pl-6">
                <div className="space-y-5">
                  {steps.map((step, index) => (
                    <article
                      key={step.title}
                      className="relative rounded-[28px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.8)] p-5 shadow-[var(--pa-shadow-sm)]"
                    >
                      <span className="absolute -left-[2.95rem] top-5 flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--pa-surface-ink)] font-display text-sm font-semibold text-white shadow-[var(--pa-shadow-sm)]">
                        {index + 1}
                      </span>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Step {index + 1}</p>
                      <h3 className="mt-2 font-display text-2xl text-[var(--pa-text)]">{step.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--pa-text-muted)]">{step.body}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
