import type { ReactNode } from "react";

import { getPersonas } from "@/lib/api";

import { AppShell } from "./app-shell";

export async function PageFrame({
  pathname,
  personaId,
  children
}: {
  pathname: string;
  personaId: string;
  children: ReactNode;
}) {
  const personas = await getPersonas();
  const activePersona = personas.find((persona) => persona.id === personaId)?.id ?? personas[0]?.id ?? personaId;

  return (
    <AppShell personas={personas} personaId={activePersona} pathname={pathname}>
      {children}
    </AppShell>
  );
}
