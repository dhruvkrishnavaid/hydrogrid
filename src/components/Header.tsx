import {
  IconAlertTriangle,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconCpu,
  IconDropletFilled,
  IconFilter,
  IconGauge,
  IconLayoutDashboard,
  IconUser,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useAuth } from "../lib/auth-context";
import { FEATURES } from "../lib/feature-flags";
import type { UserRole } from "../lib/types";
import { useSSE } from "../lib/use-sse";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const {
    role,
    activeSite,
    activeSiteId,
    token,
    useDemoPersona,
    isAuthenticating,
  } = useAuth();
  const { connectionState } = useSSE({ siteId: activeSiteId, token });

  return (
    <header className="border-border/80 bg-background/90 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2.5 px-4 py-2.5 sm:px-6">
        {/* Brand & Active Station */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white shadow-xs">
              <IconDropletFilled className="size-4.5 text-[var(--color-brand-sneeze)]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-foreground text-sm font-extrabold tracking-tight">
                HydroGrid
              </span>
              <span className="text-muted-foreground text-[10px] font-semibold tracking-wide">
                Autonomous Water Intelligence
              </span>
            </div>
          </Link>

          {/* Station Context Badge (Node Zero / Active Edge Node) */}
          <div className="border-border/80 flex items-center gap-2 border-l pl-3">
            <div className="flex flex-col">
              <span className="text-foreground text-xs font-bold">
                {activeSite?.name ?? "Node Zero — IIITD Pilot"}
              </span>
              <span className="text-muted-foreground hidden text-[10px] md:inline">
                {activeSite?.location ?? "IIIT-Delhi Campus (Okhla)"}
              </span>
            </div>
          </div>

          {/* Real-time SSE Telemetry Status Badge */}
          <Badge
            variant="outline"
            className="border-border/80 bg-card/60 hidden items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold sm:flex"
            title={`Real-Time Telemetry: ${connectionState}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connectionState === "connected"
                  ? "animate-pulse bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : connectionState === "connecting"
                    ? "animate-ping bg-amber-500"
                    : "bg-rose-500"
              }`}
            />
            <span className="text-muted-foreground">
              {connectionState === "connected"
                ? "Live Telemetry"
                : connectionState === "connecting"
                  ? "Reconnecting..."
                  : "Telemetry Offline"}
            </span>
          </Badge>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-0.5 text-xs font-medium">
          <Link
            to="/"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition"
            activeProps={{
              className: "bg-muted font-bold text-foreground shadow-2xs",
            }}
          >
            <IconLayoutDashboard className="size-3.5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/water-quality"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition"
            activeProps={{
              className: "bg-muted font-bold text-foreground shadow-2xs",
            }}
          >
            <IconDropletFilled className="size-3.5 text-sky-600 dark:text-sky-400" />
            <span>Water Quality</span>
          </Link>

          {/* Purification Module (Commented out / Hidden under feature flag in prototype profile) */}
          {FEATURES.PURIFICATION && (
            <Link
              to="/purification"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition"
              activeProps={{
                className: "bg-muted font-bold text-foreground shadow-2xs",
              }}
            >
              <IconFilter className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Purification</span>
            </Link>
          )}

          <Link
            to="/flow"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition"
            activeProps={{
              className: "bg-muted font-bold text-foreground shadow-2xs",
            }}
          >
            <IconGauge className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>Flow & Leaks</span>
          </Link>

          <Link
            to="/devices"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition"
            activeProps={{
              className: "bg-muted font-bold text-foreground shadow-2xs",
            }}
          >
            <IconCpu className="size-3.5" />
            <span>Devices</span>
          </Link>

          <Link
            to="/alerts"
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition"
            activeProps={{
              className: "bg-muted font-bold text-foreground shadow-2xs",
            }}
          >
            <IconAlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
            <span>Alerts</span>
          </Link>

          <Link
            to="/simulator"
            className="border-border/80 bg-card text-foreground hover:bg-muted ml-1 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold transition"
            activeProps={{
              className:
                "border-[var(--brand-primary)] bg-muted font-bold text-foreground shadow-2xs",
            }}
          >
            <IconBolt className="size-3.5 text-amber-500" />
            <span>Simulator Lab</span>
          </Link>
        </nav>

        {/* User Persona & Theme */}
        <div className="flex items-center gap-2">
          {/* Persona Switcher Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-border/80 bg-background/80 h-8 gap-1.5 px-2.5 text-xs font-semibold shadow-xs cursor-pointer",
              )}
              disabled={isAuthenticating}
            >
              <IconUser className="size-3.5 text-[var(--brand-secondary)]" />
              <span>{role}</span>
              <IconChevronDown className="text-muted-foreground size-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Demo Persona / Role
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(["ADMIN", "OPERATOR", "VIEWER"] as Array<UserRole>).map(
                  (r) => (
                    <DropdownMenuItem
                      key={r}
                      onClick={() => useDemoPersona(r)}
                      className="flex items-center justify-between text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            r === "ADMIN"
                              ? "bg-purple-500"
                              : r === "OPERATOR"
                                ? "bg-blue-500"
                                : "bg-stone-400"
                          }`}
                        />
                        <span>{r}</span>
                      </div>
                      {role === r && (
                        <IconCheck className="size-3.5 text-[var(--brand-secondary)]" />
                      )}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
