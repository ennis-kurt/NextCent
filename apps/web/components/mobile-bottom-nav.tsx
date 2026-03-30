"use client";

import type { AppNavItem } from "@/lib/navigation";
import { BarChart3, Ellipsis, Gauge, Landmark, Sparkles, Waves } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const MOBILE_NAV_ICONS: Record<string, typeof Gauge> = {
  "/app/dashboard": Gauge,
  "/app/cash-flow": Waves,
  "/app/debt-optimizer": Landmark,
  "/app/simulation": Sparkles
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({
  items,
  pathname,
  personaId,
  moreOpen,
  onOpenMore
}: {
  items: readonly AppNavItem[];
  pathname: string;
  personaId: string;
  moreOpen: boolean;
  onOpenMore: () => void;
}) {
  const activePrimary = items.find((item) => isActive(pathname, item.href));
  const moreActive = !activePrimary;

  return (
    <nav
      aria-label="Primary"
      className="pa-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-[linear-gradient(180deg,rgba(238,229,214,0),rgba(238,229,214,0.88)_26%,rgba(238,229,214,0.96))] px-4 pb-3 pt-4 lg:hidden"
    >
      <div className="mx-auto max-w-[1560px]">
        <div className="grid grid-cols-5 gap-2 rounded-[28px] border border-white/60 bg-[rgba(255,253,248,0.92)] p-2 shadow-[0_18px_40px_rgba(8,15,22,0.12)] backdrop-blur">
          {items.map((item) => {
            const Icon = MOBILE_NAV_ICONS[item.href] ?? BarChart3;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                aria-current={active ? "page" : undefined}
                href={`${item.href}?persona=${personaId}`}
                className={cn(
                  "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-center transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)] active:scale-[0.98]",
                  active
                    ? "bg-[var(--pa-surface-ink)] text-white shadow-[0_12px_24px_rgba(8,15,22,0.18)]"
                    : "text-[var(--pa-text-soft)] hover:bg-white hover:text-[var(--pa-text)]"
                )}
              >
                <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                <span className="text-[10px] font-medium uppercase tracking-[0.14em]">{item.mobileLabel}</span>
              </Link>
            );
          })}

          <button
            aria-controls="mobile-more-sheet"
            aria-expanded={moreOpen}
            aria-label="Open more navigation and scenario options"
            className={cn(
              "flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-center transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pa-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pa-surface)] active:scale-[0.98]",
              moreActive
                ? "bg-[var(--pa-surface-ink)] text-white shadow-[0_12px_24px_rgba(8,15,22,0.18)]"
                : "text-[var(--pa-text-soft)] hover:bg-white hover:text-[var(--pa-text)]"
            )}
            type="button"
            onClick={onOpenMore}
          >
            <Ellipsis aria-hidden="true" className="h-4.5 w-4.5" />
            <span className="text-[10px] font-medium uppercase tracking-[0.14em]">More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
