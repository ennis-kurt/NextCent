import { cn } from "@/lib/utils";

export function StatusPill({
  children,
  tone = "default"
}: {
  children: string;
  tone?: "default" | "urgent" | "important" | "safe";
}) {
  const styles = {
    default: "bg-[var(--pa-surface)] text-[var(--pa-text-muted)]",
    urgent: "bg-[var(--pa-danger-soft)] text-[var(--pa-danger)]",
    important: "bg-[var(--pa-warning-soft)] text-[var(--pa-warning)]",
    safe: "bg-[var(--pa-success-soft)] text-[var(--pa-success)]"
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", styles[tone])}>
      {children}
    </span>
  );
}
