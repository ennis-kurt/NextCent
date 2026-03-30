"use client";

import type { PersonaSummary } from "@contracts";
import { ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef } from "react";

import type { AppNavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

import { ExpandableNote } from "./expandable-note";
import { PersonaSwitcher } from "./persona-switcher";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));
}

export function MobileMoreSheet({
  items,
  open,
  onClose,
  pathname,
  personaId,
  personas
}: {
  items: readonly AppNavItem[];
  open: boolean;
  onClose: () => void;
  pathname: string;
  personaId: string;
  personas: PersonaSummary[];
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const currentPersona = personas.find((persona) => persona.id === personaId) ?? personas[0];
  const secondaryItems = useMemo(
    () =>
      [...items]
        .filter((item) => !item.mobilePrimary)
        .sort((left, right) => left.mobileOrder - right.mobileOrder),
    [items]
  );

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(panelRef.current);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        aria-label="Close menu"
        className="absolute inset-0 bg-[rgba(8,15,22,0.38)] backdrop-blur-[2px]"
        type="button"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id="mobile-more-sheet"
        aria-labelledby={titleId}
        aria-modal="true"
        className="pa-safe-bottom absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-[30px] border border-white/50 bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(247,239,226,0.98))] px-4 pb-6 pt-4 shadow-[0_-20px_48px_rgba(8,15,22,0.18)]"
        role="dialog"
      >
        <div className="mx-auto max-w-[1560px]">
          <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[rgba(18,32,43,0.12)]" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--pa-text-soft)]">Mobile workspace</p>
              <h2 id={titleId} className="mt-2 font-display text-2xl text-[var(--pa-text)]">
                Explore & switch scenario
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--pa-text-muted)]">
                {currentPersona ? `${currentPersona.name} · ${currentPersona.archetype}` : "Seeded demo data"}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              aria-label="Close menu"
              className="rounded-full border border-[var(--pa-border)] bg-white/90 p-3 text-[var(--pa-text)] shadow-[var(--pa-shadow-sm)] transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)] active:scale-[0.98]"
              type="button"
              onClick={onClose}
            >
              <X aria-hidden="true" className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--pa-border)] bg-white/78 p-4 shadow-[var(--pa-shadow-sm)]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">Scenario</p>
            <PersonaSwitcher personas={personas} personaId={personaId} showDescription={false} variant="compact" />
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--pa-border)] bg-[var(--pa-surface)] p-4 shadow-[var(--pa-shadow-sm)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pa-text-soft)]">More tools</p>
              <div className="rounded-full border border-[var(--pa-border)] bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--pa-text-soft)]">
                Seeded demo data
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {secondaryItems.map((item) => (
                <Link
                  key={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  href={`${item.href}?persona=${personaId}`}
                  className={cn(
                    "flex items-center justify-between rounded-[18px] border px-4 py-3 text-sm transition-[background-color,color,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)] active:scale-[0.99]",
                    isActive(pathname, item.href)
                      ? "border-[rgba(31,116,104,0.22)] bg-[var(--pa-primary-soft)] text-[var(--pa-text)]"
                      : "border-transparent bg-white/75 text-[var(--pa-text-muted)] hover:border-[var(--pa-border)] hover:text-[var(--pa-text)]"
                  )}
                  onClick={onClose}
                >
                  <span>{item.label}</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          <ExpandableNote
            className="mt-5"
            detail="Recommendations are estimates based on available account data. Verify major financial decisions independently."
            label="Use with care"
            summary="Outputs stay grounded in the seeded profile, but they are still estimates."
          />
        </div>
      </div>
    </div>
  );
}
