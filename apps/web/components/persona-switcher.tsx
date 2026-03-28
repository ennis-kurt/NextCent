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
      className="flex items-center gap-3 rounded-full border border-[var(--pa-border)] bg-white/85 px-4 py-3 text-sm text-[var(--pa-text-muted)] shadow-sm backdrop-blur"
      htmlFor={selectId}
    >
      <span className="font-medium text-[var(--pa-text)]">Scenario</span>
      <select
        id={selectId}
        name="persona"
        aria-busy={isPending}
        className="rounded-full bg-transparent font-semibold text-[var(--pa-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
      <span className="sr-only" aria-live="polite">
        {isPending ? "Switching scenario…" : ""}
      </span>
    </label>
  );
}
