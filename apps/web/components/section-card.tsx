import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  eyebrow,
  description,
  children,
  className
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-[var(--pa-border)] bg-[var(--pa-surface-strong)] p-6 shadow-panel",
        className
      )}
    >
      <div className="mb-5 flex flex-col gap-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--pa-text-soft)]">{eyebrow}</p>
        ) : null}
        <div className="flex flex-col gap-1">
          <h2 className="text-balance font-display text-xl font-semibold text-[var(--pa-text)]">{title}</h2>
          {description ? <p className="max-w-2xl text-sm text-[var(--pa-text-muted)]">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
