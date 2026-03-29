import Link from "next/link";
import { ArrowRight, LockKeyhole, Radar, Wallet } from "lucide-react";

import { Logo } from "@/components/logo";

export default function LandingPage() {
  return (
    <main id="main-content" className="px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1540px] space-y-8">
        <section className="relative overflow-hidden rounded-[40px] border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(246,238,227,0.95))] px-6 py-6 shadow-[var(--pa-shadow-xl)] lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(31,116,104,0.18),transparent_28%),radial-gradient(circle_at_82%_34%,rgba(183,139,66,0.22),transparent_18%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_420px]">
            <div className="max-w-3xl pa-fade-up">
              <Logo />
              <p className="mt-8 text-xs uppercase tracking-[0.28em] text-[var(--pa-text-soft)]">Calm cash-flow intelligence for daily life</p>
              <h1 className="mt-4 max-w-4xl text-balance font-display text-5xl font-semibold leading-tight text-[var(--pa-text)] lg:text-7xl">
                Cash clarity without the dashboard noise.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--pa-text-muted)]">
                Track cash flow, debt pressure, subscriptions, and next actions in one read-only workspace designed to feel like advice, not clutter.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--pa-surface-ink)] px-6 py-3 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-[#18212a] hover:shadow-[var(--pa-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-bg)]"
                >
                  Launch seeded demo
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link
                  href="/app/dashboard?persona=high-debt-strong-income"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--pa-border)] bg-white/82 px-6 py-3 text-sm font-semibold text-[var(--pa-text)] transition-[background-color,border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.2)] hover:bg-[var(--pa-surface)] hover:shadow-[var(--pa-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-bg)]"
                >
                  View command center
                </Link>
              </div>
              <div className="mt-10 grid max-w-2xl gap-4 border-t border-[var(--pa-border)] pt-6 sm:grid-cols-3">
                {[
                  { label: "Readout", value: "Safe to Spend", detail: "Balances, bills, and pace compressed into one number." },
                  { label: "Priority", value: "Next best move", detail: "Debt, leakage, and risk ranked by urgency." },
                  { label: "Mode", value: "Privacy-first", detail: "Structured facts first. Masked AI second." }
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--pa-text-soft)]">{item.label}</p>
                    <p className="mt-2 font-display text-2xl text-[var(--pa-text)]">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="pa-fade-up pa-delay-1">
              <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,34,45,0.97),rgba(15,23,32,0.99))] p-6 text-white shadow-[0_36px_80px_rgba(10,16,24,0.34)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Command center preview</p>
                <h2 className="mt-3 max-w-sm font-display text-3xl leading-tight text-white">
                  See pressure, slack, and the next move at a glance.
                </h2>
                <div className="mt-6 space-y-4">
                  {[
                    {
                      icon: <Wallet aria-hidden="true" className="h-4 w-4" />,
                      label: "Safe to Spend this week",
                      value: "$2,548",
                      detail: "Balances, upcoming obligations, and current pace."
                    },
                    {
                      icon: <Radar aria-hidden="true" className="h-4 w-4" />,
                      label: "Top priority",
                      value: "Target Card B",
                      detail: "Highest impact debt action without weakening cash."
                    },
                    {
                      icon: <LockKeyhole aria-hidden="true" className="h-4 w-4" />,
                      label: "Privacy posture",
                      value: "Sanitized",
                      detail: "Raw financial identifiers stay outside the model boundary."
                    }
                  ].map((item) => (
                    <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/48">{item.label}</p>
                          <p className="mt-2 font-display text-[1.9rem] text-white">{item.value}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-3 text-[var(--pa-accent)]">{item.icon}</div>
                      </div>
                      <p className="mt-3 max-w-sm text-sm leading-6 text-white/68">{item.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/70">
                  NextCent separates facts, estimates, and recommended next actions so the interface stays calm under pressure.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[34px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,239,226,0.92))] p-6 shadow-[var(--pa-shadow-md)]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--pa-text-soft)]">What You Can Answer Fast</p>
            <h2 className="mt-3 max-w-2xl text-balance font-display text-3xl text-[var(--pa-text)]">
              Built for people who want clear guidance, not another noisy finance dashboard.
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                "Where is my money going right now?",
                "Am I at risk of running short before payday?",
                "Which card should I pay first without leaving cash fragile?",
                "Which subscriptions deserve review this week?"
              ].map((question, index) => (
                <article
                  key={question}
                  className="rounded-[24px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.7)] p-5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--pa-border-strong)] hover:shadow-[var(--pa-shadow-sm)]"
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Question {index + 1}</p>
                  <p className="mt-3 text-base leading-7 text-[var(--pa-text)]">{question}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,34,45,0.97),rgba(15,23,32,0.99))] p-6 text-white shadow-[0_28px_72px_rgba(10,16,24,0.28)]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Trust</p>
            <h2 className="mt-3 max-w-sm text-balance font-display text-3xl text-white">How the product earns trust</h2>
            <div className="mt-6 space-y-4">
              {[
                "Read-only account modeling for the MVP.",
                "Raw transaction descriptions, identifiers, names, and addresses stay blocked from external model payloads.",
                "Recommendations and simulations separate facts from estimates and expose assumptions.",
                "The product offers guidance and insights, not investment, tax, or legal advice."
              ].map((item) => (
                <div key={item} className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/72">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
