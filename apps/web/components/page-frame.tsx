import type { ReactNode } from "react";
import type { PersonaSummary } from "@contracts";

import { AppShell } from "./app-shell";

export function PageFrame({
  pathname,
  personaId,
  personas,
  children
}: {
  pathname: string;
  personaId: string;
  personas: PersonaSummary[];
  children: ReactNode;
}) {
  const activePersona = personas.find((persona) => persona.id === personaId)?.id ?? personas[0]?.id ?? personaId;

  return (
    <AppShell personas={personas} personaId={activePersona} pathname={pathname}>
      {children}
    </AppShell>
  );
}
