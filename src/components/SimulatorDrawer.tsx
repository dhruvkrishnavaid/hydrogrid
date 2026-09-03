import {
  IconAlertTriangle,
  IconBolt,
  IconCheck,
  IconChevronDown,
  IconDroplet,
  IconFlame,
  IconLoader2,
  IconRotate2,
  IconTool,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";
import { useState } from "react";
import type React from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import { FEATURES } from "../lib/feature-flags";

export const SimulatorDrawer: React.FC = () => {
  const { activeSiteId, role } = useAuth();
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const canMutate = role === "ADMIN" || role === "OPERATOR";

  const triggerScenario = async (scenario: string) => {
    if (!activeSiteId) return;
    setLoadingScenario(scenario);
    setIsError(false);
    setLastResult(null);

    try {
      const res = await api.triggerSimulator({
        siteId: activeSiteId,
        scenario,
      });
      setLastResult(
        `✓ [${scenario}] Score: ${res.safety.score} | Gate: ${res.safety.qualityGate} | Valve: ${res.flow.valveStatus}`,
      );
    } catch (err: unknown) {
      setIsError(true);
      const msg = err instanceof Error ? err.message : "Simulation failed";
      setLastResult(`✗ [ERROR] ${msg}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-40">
      <Sheet>
        <SheetTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "border-border/80 bg-background/95 text-foreground hover:bg-muted hover:text-foreground dark:bg-card/90 gap-2 rounded-full border px-3.5 py-2 font-semibold shadow-lg backdrop-blur-md cursor-pointer",
          )}
        >
          <IconBolt className="size-4 fill-amber-500 text-amber-500" />
          <span>Demo Scenarios</span>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-bold"
          >
            Sim
          </Badge>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-88 overflow-y-auto p-6 sm:w-[420px]"
        >
          <SheetHeader className="p-0 pb-4 text-left">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <IconBolt className="size-4" />
              </div>
              <SheetTitle className="text-base font-bold tracking-tight">
                Demo Scenario Injector
              </SheetTitle>
            </div>
            <SheetDescription className="text-muted-foreground text-xs">
              Inject deterministic fault scenarios into Node Zero edge logic and
              observe real-time automated actuator and gatekeeper responses.
            </SheetDescription>
            <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              <span>Node Zero — IIITD Pilot</span>
              <span className="text-[10px] opacity-80">
                Turbidity • Temp • 15% Leak
              </span>
            </div>
          </SheetHeader>

          <Separator className="my-4" />

          {!canMutate && (
            <Alert className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
              <IconAlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs font-medium">
                Switch demo persona to <strong>OPERATOR</strong> or{" "}
                <strong>ADMIN</strong> in the header to trigger simulations.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* 1. Node Zero Physical Sensors */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Node Zero Sensors & Gatekeeper
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Physical Node
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("NORMAL")}
                  className="h-auto justify-start border-emerald-500/30 bg-emerald-500/5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-300"
                >
                  <IconCheck className="mr-1.5 size-3.5 shrink-0 text-emerald-600" />
                  <span>Nominal Safe</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("UNSAFE_TURBIDITY")}
                  className="h-auto justify-start border-rose-500/30 bg-rose-500/5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-500/15 dark:text-rose-300"
                >
                  <IconDroplet className="mr-1.5 size-3.5 shrink-0 text-rose-600" />
                  <span>Turbidity Spill</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("UNSAFE_TEMPERATURE")}
                  className="h-auto justify-start border-amber-500/30 bg-amber-500/5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                >
                  <IconFlame className="mr-1.5 size-3.5 shrink-0 text-amber-600" />
                  <span>Thermal Inflow</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("LEAK")}
                  className="h-auto justify-start border-rose-500/30 bg-rose-500/5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-500/15 dark:text-rose-300"
                >
                  <IconAlertTriangle className="mr-1.5 size-3.5 shrink-0 text-rose-600" />
                  <span>Pipe Leak (30%)</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* 2. Edge Node Diagnostics & Reset */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                  Edge Diagnostics & Reset
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Diagnostics
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("SENSOR_DRIFT")}
                  className="h-auto justify-start border-amber-500/30 bg-amber-500/5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                >
                  <IconTool className="mr-1.5 size-3.5 shrink-0 text-amber-600" />
                  <span>Turbidity Drift</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("RESET")}
                  className="border-border bg-muted/60 text-foreground hover:bg-muted h-auto justify-start py-2 text-xs font-semibold"
                >
                  <IconRotate2 className="text-foreground mr-1.5 size-3.5 shrink-0" />
                  <span>Reset Baseline</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("DEVICE_OFFLINE")}
                  className="h-auto justify-start border-rose-500/30 bg-rose-500/5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-500/15 dark:text-rose-300"
                >
                  <IconWifiOff className="mr-1.5 size-3.5 shrink-0 text-rose-600" />
                  <span>Node Offline</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("DEVICE_ONLINE")}
                  className="h-auto justify-start border-emerald-500/30 bg-emerald-500/5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/15 dark:text-emerald-300"
                >
                  <IconWifi className="mr-1.5 size-3.5 shrink-0 text-emerald-600" />
                  <span>Node Online</span>
                </Button>
              </div>
            </div>

            {/* 3. Extended Facility Suite (Collapsible / Gated) */}
            <Separator />

            <details className="group border-border/70 bg-muted/30 rounded-xl border p-3 text-xs">
              <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <span>Extended Facility Scenarios</span>
                  <Badge variant="outline" className="py-0 text-[9px]">
                    AMD & Multi-Barrier
                  </Badge>
                </span>
                <IconChevronDown className="size-3.5 transition group-open:rotate-180" />
              </summary>
              <div className="border-border/50 mt-3 space-y-2 border-t pt-2">
                <p className="text-muted-foreground text-[11px]">
                  Simulate heavy-metal runoff and multi-stage purification
                  filters.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canMutate || Boolean(loadingScenario)}
                    onClick={() => triggerScenario("UNSAFE_HEAVY_METALS")}
                    className="h-auto justify-start border-rose-500/30 bg-rose-500/5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-500/15 dark:text-rose-300"
                  >
                    <IconDroplet className="mr-1.5 size-3.5 shrink-0 text-rose-600" />
                    <span>Heavy Metals</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canMutate || Boolean(loadingScenario)}
                    onClick={() => triggerScenario("UNSAFE_PH")}
                    className="h-auto justify-start border-rose-500/30 bg-rose-500/5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-500/15 dark:text-rose-300"
                  >
                    <IconAlertTriangle className="mr-1.5 size-3.5 shrink-0 text-rose-600" />
                    <span>Acidic pH (4.2)</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canMutate || Boolean(loadingScenario)}
                    onClick={() => triggerScenario("UNSAFE_TDS")}
                    className="h-auto justify-start border-amber-500/30 bg-amber-500/5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                  >
                    <IconDroplet className="mr-1.5 size-3.5 shrink-0 text-amber-600" />
                    <span>TDS Breach</span>
                  </Button>
                  {FEATURES.PURIFICATION && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canMutate || Boolean(loadingScenario)}
                      onClick={() => triggerScenario("FILTER_WARNING")}
                      className="h-auto justify-start border-amber-500/30 bg-amber-500/5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-500/15 dark:text-amber-300"
                    >
                      <IconTool className="mr-1.5 size-3.5 shrink-0 text-amber-600" />
                      <span>Filter Warning</span>
                    </Button>
                  )}
                </div>
              </div>
            </details>
          </div>

          {loadingScenario && (
            <div className="border-border/80 bg-muted/40 text-muted-foreground mt-4 flex items-center gap-2 rounded-lg border p-2.5 text-xs">
              <IconLoader2 className="size-4 animate-spin text-[var(--brand-secondary)]" />
              <span>Injecting {loadingScenario} telemetry event...</span>
            </div>
          )}

          {lastResult && (
            <Alert
              className={`mt-4 ${
                isError
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              }`}
            >
              {isError ? (
                <IconAlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />
              ) : (
                <IconCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <AlertDescription className="text-xs font-medium break-all">
                {lastResult}
              </AlertDescription>
            </Alert>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
