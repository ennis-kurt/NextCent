export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#1f7468,#0f1720)] text-sm font-semibold text-white shadow-panel">
        PA
      </div>
      <div>
        <p className="font-display text-sm uppercase tracking-[0.24em] text-[var(--pa-text-soft)]">
          Personal Accountant AI
        </p>
        <p className="text-sm text-[var(--pa-text-muted)]">Everyday financial health, grounded in your data.</p>
      </div>
    </div>
  );
}
