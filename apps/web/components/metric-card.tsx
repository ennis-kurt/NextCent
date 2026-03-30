import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  tone = "default",
  detail,
  change,
  icon,
  className
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "warning" | "danger" | "success";
  detail?: string;
  change?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    default: {
      surface: "bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,239,226,0.95))]",
      accent: "bg-[rgba(18,32,43,0.72)]",
      icon: "bg-white/80"
    },
    primary: {
      surface: "bg-[linear-gradient(180deg,rgba(216,235,228,0.88),rgba(255,255,255,0.96))]",
      accent: "bg-[var(--pa-primary)]",
      icon: "bg-white/72"
    },
    warning: {
      surface: "bg-[linear-gradient(180deg,rgba(248,234,215,0.95),rgba(255,255,255,0.96))]",
      accent: "bg-[var(--pa-warning)]",
      icon: "bg-white/72"
    },
    danger: {
      surface: "bg-[linear-gradient(180deg,rgba(247,223,223,0.95),rgba(255,255,255,0.96))]",
      accent: "bg-[var(--pa-danger)]",
      icon: "bg-white/72"
    },
    success: {
      surface: "bg-[linear-gradient(180deg,rgba(223,244,234,0.95),rgba(255,255,255,0.96))]",
      accent: "bg-[var(--pa-success)]",
      icon: "bg-white/72"
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-[var(--pa-border)] p-4 shadow-[var(--pa-shadow-sm)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[rgba(15,23,32,0.16)] hover:shadow-[0_18px_30px_rgba(8,15,22,0.08)] md:rounded-[28px] md:p-5",
        className,
        tones[tone].surface
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1.5", tones[tone].accent)} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--pa-text-muted)]">{label}</p>
          <p className="mt-2 font-display text-[2rem] font-semibold leading-none tabular-nums text-[var(--pa-text)] md:text-3xl">{value}</p>
        </div>
        {icon ? (
          <div className={cn("rounded-2xl p-2.5 text-[var(--pa-text)] shadow-[var(--pa-shadow-sm)] md:p-3", tones[tone].icon)}>
            {icon}
          </div>
        ) : null}
      </div>
      {detail ? <p className="max-w-[26rem] text-sm leading-6 text-[var(--pa-text-muted)] md:text-[0.95rem]">{detail}</p> : null}
      {change ? <p className="mt-2 font-medium text-[var(--pa-text)]">{change}</p> : null}
    </div>
  );
}
