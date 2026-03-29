import { cn } from "@/lib/utils";

export function Logo({
  tone = "default",
  showTagline = true
}: {
  tone?: "default" | "inverted";
  showTagline?: boolean;
}) {
  const inverted = tone === "inverted";

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-[18px] border text-sm font-semibold shadow-[var(--pa-shadow-sm)]",
          inverted
            ? "border-white/10 bg-[linear-gradient(160deg,#d6b06c,#1f7468_52%,#0f1720)] text-white"
            : "border-white/70 bg-[linear-gradient(160deg,#1f7468,#0f1720_72%)] text-white"
        )}
      >
        PA
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-sm uppercase tracking-[0.24em]",
            inverted ? "text-white/62" : "text-[var(--pa-text-soft)]"
          )}
        >
          Personal Accountant AI
        </p>
        {showTagline ? (
          <p className={cn("text-sm", inverted ? "text-white/78" : "text-[var(--pa-text-muted)]")}>
            Cash clarity. Debt discipline. Calm next actions.
          </p>
        ) : null}
      </div>
    </div>
  );
}
