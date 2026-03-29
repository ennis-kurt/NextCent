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
          "flex h-12 w-12 items-center justify-center rounded-[18px] border shadow-[var(--pa-shadow-sm)]",
          inverted
            ? "border-white/10 bg-[linear-gradient(160deg,#d6b06c,#1f7468_52%,#0f1720)] text-white"
            : "border-white/70 bg-[linear-gradient(160deg,#1f7468,#0f1720_72%)] text-white"
        )}
      >
        <span className="font-display text-[1.05rem] font-semibold tracking-[-0.08em]">
          N<span className="ml-[-0.06em]">¢</span>
        </span>
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-[1.45rem] font-semibold tracking-[-0.04em]",
            inverted ? "text-white" : "text-[var(--pa-text)]"
          )}
        >
          NextCent
        </p>
        {showTagline ? (
          <p className={cn("text-sm", inverted ? "text-white/78" : "text-[var(--pa-text-muted)]")}>
            Cash clarity. Debt discipline. Clear next moves.
          </p>
        ) : null}
      </div>
    </div>
  );
}
