import type { ReactNode } from "react";
import type { PersonaSummary } from "@contracts";
import Link from "next/link";

import { APP_NAV } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { Logo } from "./logo";
import { PersonaSwitcher } from "./persona-switcher";

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
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(31,116,104,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(183,139,66,0.08),transparent_24%),var(--pa-bg)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-8 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[32px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.78)] p-6 shadow-panel backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <Logo />
          <div className="mt-8 rounded-[28px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--pa-text-soft)]">Operating Mode</p>
            <h2 className="mt-3 font-display text-xl text-[var(--pa-text)]">Read-only guidance</h2>
            <p className="mt-2 text-sm text-[var(--pa-text-muted)]">
              Connected accounts are modeled in read-only mode. Deterministic finance logic runs before any language generation.
            </p>
          </div>
          <nav className="mt-8 space-y-2">
            {APP_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={`${item.href}?persona=${personaId}`}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 text-sm transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)]",
                    active
                      ? "bg-[var(--pa-surface-ink)] text-white shadow-sm"
                      : "text-[var(--pa-text-muted)] hover:bg-white hover:text-[var(--pa-text)]"
                  )}
                >
                  <span>{item.label}</span>
                  <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-[var(--pa-accent)]" : "bg-transparent")} />
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto hidden pt-8 lg:block">
            <p className="text-sm text-[var(--pa-text-muted)]">
              Recommendations are estimates based on available account data. Verify major financial decisions independently.
            </p>
          </div>
        </aside>
        <main id="main-content" className="space-y-6 pb-10">
          <header className="flex flex-col gap-4 rounded-[32px] border border-[var(--pa-border)] bg-[rgba(255,255,255,0.72)] px-6 py-5 shadow-panel backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--pa-text-soft)]">Personal Finance Operating System</p>
              <h1 className="mt-2 text-balance font-display text-3xl font-semibold text-[var(--pa-text)]">A calmer way to understand your money and act on it.</h1>
            </div>
            <PersonaSwitcher personas={personas} personaId={personaId} />
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
