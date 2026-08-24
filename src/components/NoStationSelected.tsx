import { Link } from "@tanstack/react-router";
import type React from "react";

interface NoStationSelectedProps {
  title?: string;
}

export const NoStationSelected: React.FC<NoStationSelectedProps> = ({
  title = "No Station Selected",
}) => {
  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="ops-card mx-auto max-w-md space-y-4 p-8 text-center">
        <div className="font-mono text-xs font-bold tracking-wider text-[var(--brand-primary)] uppercase">
          HYDROGRID OPERATIONS
        </div>
        <h2 className="font-mono text-sm font-bold text-[var(--text-primary)] uppercase">
          {title}
        </h2>
        <p className="font-sans text-xs leading-relaxed text-[var(--text-muted)]">
          Select a water station to view operational telemetry, quality
          diagnostics, treatment status, and hydraulic flow protection.
        </p>
        <Link
          to="/"
          className="inline-block rounded bg-[var(--brand-primary)] px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-[var(--brand-secondary)]"
        >
          [ SELECT STATION ]
        </Link>
      </div>
    </main>
  );
};
