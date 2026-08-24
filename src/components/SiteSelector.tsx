import type React from "react";

import { useAuth } from "../lib/auth-context";

export const SiteSelector: React.FC = () => {
  const { sites, activeSiteId, setActiveSiteId, isLoading, isAuthenticating } =
    useAuth();

  if (isLoading || isAuthenticating) {
    return (
      <div className="flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-muted)]">
        <span className="h-1.5 w-1.5 animate-spin rounded-full bg-[var(--state-warn-text)]" />
        Syncing...
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-muted)]">
        No Station
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="hidden font-mono text-[9px] font-bold text-[var(--text-dim)] uppercase sm:inline">
        Station:
      </span>
      <select
        value={activeSiteId ?? ""}
        onChange={(e) => setActiveSiteId(e.target.value)}
        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.name}
          </option>
        ))}
      </select>
    </div>
  );
};
