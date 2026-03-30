"use client";

import type { PersonaSummary } from "@contracts";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { APP_NAV } from "@/lib/navigation";

import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileMoreSheet } from "./mobile-more-sheet";

export function MobileShellChrome({
  pathname,
  personaId,
  personas
}: {
  pathname: string;
  personaId: string;
  personas: PersonaSummary[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const currentPersona = useMemo(
    () => personas.find((persona) => persona.id === personaId) ?? personas[0],
    [personaId, personas]
  );
  const primaryItems = useMemo(
    () =>
      [...APP_NAV]
        .filter((item) => item.mobilePrimary)
        .sort((left, right) => left.mobileOrder - right.mobileOrder),
    []
  );

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname, personaId]);

  return (
    <>
      <div className="pa-safe-top mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-4 pb-3 pt-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-white/55 bg-[linear-gradient(160deg,#1f7468,#0f1720_72%)] text-white shadow-[var(--pa-shadow-sm)]">
            <span className="font-display text-[1rem] font-semibold tracking-[-0.08em]">
              N<span className="ml-[-0.06em]">¢</span>
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-[1.35rem] font-semibold tracking-[-0.04em] text-[var(--pa-text)]">NextCent</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Mobile workspace</p>
          </div>
        </div>
        <button
          aria-controls="mobile-more-sheet"
          aria-expanded={sheetOpen}
          className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--pa-border)] bg-white/78 px-3.5 py-2 text-sm text-[var(--pa-text)] shadow-[var(--pa-shadow-sm)] transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-bg)] active:scale-[0.98]"
          type="button"
          onClick={() => setSheetOpen(true)}
        >
          <span className="max-w-[6.5rem] truncate font-medium">
            {currentPersona?.name.split(" ")[0] ?? "Scenario"}
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-[var(--pa-text-soft)]" />
        </button>
      </div>

      <MobileBottomNav
        items={primaryItems}
        pathname={pathname}
        personaId={personaId}
        moreOpen={sheetOpen}
        onOpenMore={() => setSheetOpen(true)}
      />
      <MobileMoreSheet items={APP_NAV} open={sheetOpen} onClose={() => setSheetOpen(false)} pathname={pathname} personaId={personaId} personas={personas} />
    </>
  );
}
