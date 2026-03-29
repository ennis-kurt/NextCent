"use client";

import type { PersonaSummary } from "@contracts";
import { useId, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
      className="grid min-w-[280px] gap-2 rounded-[26px] border border-white/65 bg-white/80 px-4 py-4 text-sm text-[var(--pa-text-muted)] shadow-[var(--pa-shadow-sm)] backdrop-blur"
      htmlFor={selectId}
    >
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Scenario</span>
      <select
        id={selectId}
        name="persona"
        aria-busy={isPending}
        className="min-w-0 rounded-2xl border border-[var(--pa-border)] bg-[var(--pa-surface)] px-4 py-3 font-semibold text-[var(--pa-text)] transition-[border-color,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
        {isPending ? "Loading scenario…" : "Compare guidance across seeded profiles."}
      </span>
      <span className="sr-only" aria-live="polite">
        {isPending ? "Switching scenario…" : ""}
      </span>
    </label>
  );
}
