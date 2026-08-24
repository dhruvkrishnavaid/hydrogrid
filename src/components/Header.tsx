import { Link } from "@tanstack/react-router";

import { useAuth } from "../lib/auth-context";
import type { UserRole } from "../lib/types";
import { useSSE } from "../lib/use-sse";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const {
    role,
    activeSite,
    activeSiteId,
    isStationEntered,
    exitStation,
    useDemoPersona,
    isAuthenticating,
  } = useAuth();
  const { connectionState } = useSSE({ siteId: activeSiteId });

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--header-bg)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2 px-4 py-2 sm:px-6">
        {/* Brand & Active Operational Station Context */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-decoration-none flex items-center gap-2.5"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--brand-primary)] font-mono text-[11px] font-bold text-white">
              HG
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs font-black tracking-wider text-[var(--text-primary)] uppercase">
                HydroGrid
              </span>
              <span className="text-[9px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
                Operations
              </span>
            </div>
          </Link>

          {isStationEntered && activeSite && (
            <>
              <div className="hidden h-4 w-px bg-[var(--border-subtle)] sm:block" />

              <div className="flex items-center gap-2 font-mono text-xs">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase">
                    {activeSite.name}
                  </span>
                  <span className="hidden text-[9px] text-[var(--text-dim)] md:inline">
                    {activeSite.location ?? "Erode Regional Station"}
                  </span>
                </div>

                <button
                  onClick={exitStation}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  title="Switch to another water station"
                >
                  Switch
                </button>
              </div>
            </>
          )}

          <div className="hidden h-4 w-px bg-[var(--border-subtle)] sm:block" />

          {/* SSE Connection Status */}
          <div
            className="flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5"
            title={`Real-Time Telemetry: ${connectionState}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectionState === "connected"
                  ? "bg-[var(--state-safe-text)]"
                  : connectionState === "connecting"
                    ? "animate-pulse bg-[var(--state-warn-text)]"
                    : "bg-[var(--state-danger-text)]"
              }`}
            />
            <span className="font-mono text-[9px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
              {connectionState === "connected"
                ? "Live Telemetry"
                : connectionState === "connecting"
                  ? "Connecting"
                  : "Offline"}
            </span>
          </div>
        </div>

        {/* Structured Horizontal Navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs font-semibold">
          {/* OVERVIEW */}
          <Link
            to="/"
            className="rounded px-2.5 py-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            activeProps={{
              className:
                "bg-[var(--bg-subtle)] text-[var(--brand-primary)] font-bold",
            }}
          >
            Dashboard
          </Link>

          <div className="mx-1 h-3.5 w-px bg-[var(--border-subtle)]" />

          {/* MONITORING GROUP */}
          <div className="flex items-center gap-0.5">
            <Link
              to="/water-quality"
              className="rounded px-2 py-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              activeProps={{
                className:
                  "bg-[var(--bg-subtle)] text-[var(--brand-primary)] font-bold",
              }}
            >
              Water Quality
            </Link>
            <Link
              to="/purification"
              className="rounded px-2 py-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              activeProps={{
                className:
                  "bg-[var(--bg-subtle)] text-[var(--brand-primary)] font-bold",
              }}
            >
              Purification
            </Link>
            <Link
              to="/flow"
              className="rounded px-2 py-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              activeProps={{
                className:
                  "bg-[var(--bg-subtle)] text-[var(--brand-primary)] font-bold",
              }}
            >
              Flow & Leaks
            </Link>
            <Link
              to="/devices"
              className="rounded px-2 py-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              activeProps={{
                className:
                  "bg-[var(--bg-subtle)] text-[var(--brand-primary)] font-bold",
              }}
            >
              Devices
            </Link>
          </div>

          <div className="mx-1 h-3.5 w-px bg-[var(--border-subtle)]" />

          {/* OPERATIONS GROUP */}
          <div className="flex items-center gap-0.5">
            <Link
              to="/alerts"
              className="rounded px-2 py-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              activeProps={{
                className:
                  "bg-[var(--bg-subtle)] text-[var(--brand-primary)] font-bold",
              }}
            >
              Alerts
            </Link>
            <Link
              to="/simulator"
              className="flex items-center gap-1 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-[11px] font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
              activeProps={{
                className:
                  "border-[var(--brand-primary)] bg-[var(--bg-subtle)] font-extrabold",
              }}
            >
              <span>⚡</span>
              <span>Simulator</span>
            </Link>
          </div>
        </nav>

        {/* Role Controller & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Persona Switcher */}
          <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5">
            <span className="hidden px-1.5 font-mono text-[9px] font-bold text-[var(--text-dim)] uppercase sm:inline">
              Role:
            </span>
            {(["ADMIN", "OPERATOR", "VIEWER"] as Array<UserRole>).map((r) => (
              <button
                key={r}
                disabled={isAuthenticating}
                onClick={() => useDemoPersona(r)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition disabled:opacity-50 ${
                  role === r
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                }`}
                title={`Switch active persona to ${r}`}
              >
                {isAuthenticating && role === r ? "..." : r}
              </button>
            ))}
          </div>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
