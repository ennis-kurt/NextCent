"use client";

import type { PersonaSummary } from "@contracts";
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

  return (
    <label className="flex items-center gap-3 rounded-full border border-[var(--pa-border)] bg-white/85 px-4 py-3 text-sm text-[var(--pa-text-muted)] shadow-sm backdrop-blur">
      <span className="font-medium text-[var(--pa-text)]">Scenario</span>
      <select
        className="bg-transparent font-semibold text-[var(--pa-text)] outline-none"
        value={personaId}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("persona", event.target.value);
          router.push(`${pathname}?${params.toString()}`);
        }}
      >
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.name} · {persona.archetype}
          </option>
        ))}
      </select>
    </label>
  );
}
