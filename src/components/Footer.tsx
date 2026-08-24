export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-[var(--text-dim)]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--text-primary)] uppercase">
            HydroGrid
          </span>
          <span>•</span>
          <span>Water Quality & Purification Operations Console</span>
        </div>
        <div className="flex items-center gap-3">
          <span>React 19 / TanStack Start</span>
          <span>•</span>
          <span>PostgreSQL + InfluxDB</span>
          <span>•</span>
          <span className="font-bold text-[var(--state-safe-text)]">
            ● 20/20 Backend Verified
          </span>
        </div>
      </div>
    </footer>
  );
}
