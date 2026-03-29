import type { ReactNode } from "react";
import type { PersonaSummary } from "@contracts";
import Link from "next/link";

import { APP_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { ExpandableNote } from "./expandable-note";
import { Logo } from "./logo";
import { PersonaSwitcher } from "./persona-switcher";

const SHELL_COPY: Record<string, { summary: string; detail: string }> = {
  "/app/dashboard": {
    summary: "Cash, debt, and next steps at a glance.",
    detail:
      "This view combines balances, cash pressure, score drivers, and recommended actions so you can see near-term tradeoffs without hopping between screens."
  },
  "/app/cash-flow": {
    summary: "Income, spending pace, and upcoming pressure.",
    detail:
      "Use this view to separate fixed obligations from discretionary drift and spot whether upcoming bills are likely to tighten the next cycle."
  },
  "/app/debt-optimizer": {
    summary: "Prioritize balances by payoff impact and timing.",
    detail:
      "The optimizer focuses on balances that are most expensive or most risky to carry so the first dollars you move do the most work."
  },
  "/app/investment": {
    summary: "See whether surplus should go to debt, cash, or investing.",
    detail:
      "This view treats investing as an allocation decision, checking debt APR, buffer strength, and current surplus before recommending a channel and amount."
  },
  "/app/credit-health": {
    summary: "See what is helping or dragging the score.",
    detail:
      "The score breakdown is meant to stay interpretable, showing whether utilization, payment behavior, or cash buffers are driving the number."
  },
  "/app/subscriptions": {
    summary: "Review recurring spend and easy trims.",
    detail:
      "Recurring charges are grouped here because they are one of the fastest ways to recover monthly cash without changing core living costs."
  },
  "/app/simulation": {
    summary: "Test a change before you commit to it.",
    detail:
      "Simulations compare a proposed move against the current state so you can see surplus, runway, and comfort-level shifts before taking action."
  },
  "/app/monthly-review": {
    summary: "Wrap the month with wins, misses, and resets.",
    detail:
      "This page is for closing the loop on the past month, carrying forward what improved, and identifying what should change in the next cycle."
  },
  "/app/chat": {
    summary: "Ask grounded questions against the current persona.",
    detail:
      "The assistant is meant for explanation and prioritization, but it stays anchored to structured seeded account data instead of free-form financial advice."
  },
  "/app/privacy": {
    summary: "Understand what data is used and what stays read-only.",
    detail:
      "Privacy notes explain which parts of the seeded workspace are modeled, how outputs are generated, and where the demo is intentionally constrained."
  }
};

export function AppShell({
  children,
  personas,
  personaId,
  pathname
}: {
  children: ReactNode;
  personas: PersonaSummary[];
  personaId: string;
  pathname: string;
}) {
  const currentSection =
    APP_NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ??
    APP_NAV.find((item) => item.href === pathname);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(31,116,104,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(183,139,66,0.08),transparent_22%),transparent]">
      <div className="mx-auto grid min-h-screen max-w-[1560px] gap-6 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="flex flex-col overflow-hidden rounded-[34px] border border-white/8 bg-[linear-gradient(180deg,rgba(21,34,45,0.97),rgba(15,23,32,0.99))] p-6 text-white shadow-[0_32px_80px_rgba(9,16,24,0.34)] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <Logo tone="inverted" showTagline={false} />
          <div className="mt-6 inline-flex w-fit rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/62">
            Seeded demo data
          </div>
          <div className="mt-8 flex min-h-0 flex-1 flex-col">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Workspace</p>
            <nav className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {APP_NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={`${item.href}?persona=${personaId}`}
                    className={cn(
                      "flex items-center justify-between rounded-[22px] px-4 py-3 text-sm transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-panel)]",
                      active
                        ? "bg-white text-[var(--pa-surface-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_14px_28px_rgba(0,0,0,0.18)]"
                        : "text-white/68 hover:translate-x-0.5 hover:bg-white/8 hover:text-white"
                    )}
                  >
                    <span>{item.label}</span>
                    <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-[var(--pa-accent)]" : "bg-white/16")} />
                  </Link>
                );
              })}
            </nav>
            <div className="mt-5 border-t border-white/10 pt-4">
              <ExpandableNote
                detail="Recommendations are estimates based on available account data. Verify major financial decisions independently."
                label="Use with care"
                summary="Estimates only"
                tone="inverted"
              />
            </div>
          </div>
        </aside>
        <main id="main-content" className="space-y-8 pb-12">
          <header className="relative overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(245,236,223,0.94))] px-6 py-6 shadow-[var(--pa-shadow-lg)] backdrop-blur md:px-8">
            <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full bg-[rgba(31,116,104,0.14)] blur-3xl" />
            <div className="absolute bottom-0 left-0 h-20 w-full bg-[linear-gradient(90deg,rgba(31,116,104,0.12),rgba(183,139,66,0.14),transparent)]" />
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--pa-text-soft)]">Seeded workspace</p>
                <h1 className="mt-3 text-balance font-display text-3xl font-semibold leading-tight text-[var(--pa-text)] md:text-[2.2rem]">
                  {currentSection?.label ?? "Workspace"}
                </h1>
                <ExpandableNote
                  className="mt-3 max-w-xl"
                  detail={
                    SHELL_COPY[pathname]?.detail ??
                    "This workspace keeps financial guidance grounded in the current persona and seeded account context."
                  }
                  label="Page focus"
                  summary={SHELL_COPY[pathname]?.summary ?? "Grounded guidance for the current persona."}
                />
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="rounded-full border border-[var(--pa-border-strong)] bg-white/72 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)] shadow-[var(--pa-shadow-sm)]">
                  Demo data
                </div>
                <PersonaSwitcher personas={personas} personaId={personaId} />
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
