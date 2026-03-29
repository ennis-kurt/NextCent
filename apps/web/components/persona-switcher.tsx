"use client";

import type { PersonaSummary } from "@contracts";
import { useId, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export function PersonaSwitcher({
  personas,
  personaId
}: {
  personas: PersonaSummary[];
  personaId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const selectId = useId();

  return (
    <label
      className={cn(
        "grid min-w-[280px] gap-2 rounded-[26px] border bg-white/80 px-4 py-4 text-sm text-[var(--pa-text-muted)] shadow-[var(--pa-shadow-sm)] backdrop-blur transition-[border-color,box-shadow,transform] duration-200",
        isPending
          ? "border-[rgba(31,116,104,0.24)] shadow-[0_16px_30px_rgba(31,116,104,0.14)]"
          : "border-white/65 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(8,15,22,0.08)]"
      )}
      htmlFor={selectId}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Scenario</span>
        <span
          className={cn(
            "inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]",
            isPending ? "text-[var(--pa-primary)]" : "text-[var(--pa-text-soft)]"
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", isPending ? "animate-pulse bg-[var(--pa-primary)]" : "bg-[var(--pa-accent)]/80")} />
          {isPending ? "Refreshing" : "Ready"}
        </span>
      </span>
      <select
        id={selectId}
        name="persona"
        aria-busy={isPending}
        className={cn(
          "min-w-0 rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 font-semibold text-[var(--pa-text)] transition-[border-color,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          isPending && "bg-white"
        )}
        disabled={isPending}
        value={personaId}
        onChange={(event) => {
          startTransition(() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("persona", event.target.value);
            router.push(`${pathname}?${params.toString()}`);
          });
        }}
      >
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.name} · {persona.archetype}
          </option>
        ))}
      </select>
      <span className="text-xs text-[var(--pa-text-soft)]">
        {isPending ? "Refreshing guidance for the selected seeded profile…" : "Compare guidance across seeded profiles."}
      </span>
      <span className="sr-only" aria-live="polite">
        {isPending ? "Switching scenario…" : ""}
      </span>
    </label>
  );
}
