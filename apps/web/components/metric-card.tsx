import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  tone = "default",
  detail,
  change,
  icon
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "warning" | "danger" | "success";
  detail?: string;
  change?: string;
  icon?: ReactNode;
}) {
  const tones = {
    default: "bg-[var(--pa-surface)]",
    primary: "bg-[var(--pa-primary-soft)]",
    warning: "bg-[var(--pa-warning-soft)]",
    danger: "bg-[var(--pa-danger-soft)]",
    success: "bg-[var(--pa-success-soft)]"
  };

  return (
    <div className={cn("rounded-[24px] border border-[var(--pa-border)] p-5", tones[tone])}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--pa-text-muted)]">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-[var(--pa-text)]">{value}</p>
        </div>
        {icon ? <div className="rounded-2xl bg-white/70 p-3 text-[var(--pa-text)]">{icon}</div> : null}
      </div>
      {detail ? <p className="text-sm text-[var(--pa-text-muted)]">{detail}</p> : null}
      {change ? <p className="mt-2 font-medium text-[var(--pa-text)]">{change}</p> : null}
    </div>
  );
}
