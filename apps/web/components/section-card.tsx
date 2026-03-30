import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ExpandableNote } from "./expandable-note";

export function SectionCard({
  title,
  eyebrow,
  description,
  descriptionLabel,
  descriptionDetail,
  children,
  className
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  descriptionLabel?: string;
  descriptionDetail?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-[var(--pa-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,239,226,0.92))] p-5 shadow-[var(--pa-shadow-md)] md:rounded-[30px] md:p-6",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(183,139,66,0.7),transparent)]" />
      <div className="mb-5 flex flex-col gap-2 md:mb-6">
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--pa-text-soft)]">{eyebrow}</p>
        ) : null}
        <div className="flex flex-col gap-1">
          <h2 className="text-balance font-display text-[1.2rem] font-semibold text-[var(--pa-text)] md:text-[1.35rem]">{title}</h2>
          {description && descriptionDetail ? (
            <ExpandableNote
              className="max-w-2xl"
              detail={descriptionDetail}
              label={descriptionLabel ?? "Why it matters"}
              summary={description}
            />
          ) : description ? (
            <p className="max-w-2xl text-sm leading-6 text-[var(--pa-text-muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
