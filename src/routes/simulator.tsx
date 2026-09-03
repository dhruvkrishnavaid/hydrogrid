import {
  IconAlertTriangle,
  IconBolt,
  IconCheck,
  IconLoader2,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { SimulatorExecutionResult } from "../lib/types";

export const Route = createFileRoute("/simulator")({
  component: SimulatorPage,
});

interface ScenarioMeta {
  name: string;
  badgeVariant: "default" | "destructive" | "secondary" | "outline";
  badgeClass?: string;
  title: string;
  category: "Water Safety" | "Hydraulics & Nodes" | "Maintenance & Reset";
  description: string;
  expectedState: string;
}

function SimulatorPage() {
  const { activeSiteId, isStationEntered, role } = useAuth();
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SimulatorExecutionResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="Hardware & Scenario Injection Lab" />;
  }

  const canMutate = role === "ADMIN" || role === "OPERATOR";

  const scenarios: Array<ScenarioMeta> = [
    {
      name: "NORMAL",
      badgeVariant: "default",
      badgeClass:
        "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
      title: "1. Baseline Safe Operation",
      category: "Water Safety",
      description:
        "Injects nominal water parameters (pH 7.35, Turbidity 1.2 NTU, Heavy Metals 0.02 ppm, TDS 210 ppm).",
      expectedState:
        "Score: 100 | Gate: PASS | Release: ALLOWED | Pump: RUNNING | Alarms: None",
    },
    {
      name: "UNSAFE_HEAVY_METALS",
      badgeVariant: "destructive",
      title: "2. Heavy Metals Contamination (Gate Lockout)",
      category: "Water Safety",
      description:
        "Injects toxic heavy metals reading (0.85 ppm > 0.10 limit) simulating industrial runoff.",
      expectedState:
        "Score: 55 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Pump: STOPPED | Alert: CRITICAL",
    },
    {
      name: "UNSAFE_PH",
      badgeVariant: "destructive",
      title: "3. Severe Acidic Inflow",
      category: "Water Safety",
      description: "Injects acidic pH 4.2 (< 6.5 threshold limit).",
      expectedState:
        "Score: 65 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Alert: CRITICAL",
    },
    {
      name: "UNSAFE_TURBIDITY",
      badgeVariant: "destructive",
      title: "4. High Turbidity Inflow (Silt Spill)",
      category: "Water Safety",
      description: "Injects heavy turbidity (18.5 NTU > 5.0 threshold).",
      expectedState:
        "Score: 78 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Alert: CRITICAL",
    },
    {
      name: "LEAK",
      badgeVariant: "destructive",
      title: "5. Distribution Pipeline Leak",
      category: "Hydraulics & Nodes",
      description:
        "Simulates outlet flow drop to 32 L/min (28.8% mismatch > 15.0% threshold).",
      expectedState:
        "Leak: DETECTED | Gate: FAIL | Valve: CLOSED (ISOLATED) | Alert: CRITICAL",
    },
    {
      name: "SENSOR_DRIFT",
      badgeVariant: "secondary",
      badgeClass:
        "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
      title: "6. pH Probe Degradation & Drift",
      category: "Hydraulics & Nodes",
      description:
        "Simulates calibration loss (+0.85 drift) on primary pH electrode.",
      expectedState:
        "Probe: DEGRADED | Confidence drops to 73% | Alert: WARNING (Calibration Required)",
    },
    {
      name: "DEVICE_OFFLINE",
      badgeVariant: "destructive",
      title: "7. Primary Node Power / Heartbeat Timeout",
      category: "Hydraulics & Nodes",
      description:
        "Simulates power loss or signal failure on Primary Sensor Node.",
      expectedState:
        "Device: OFFLINE | Gate: FAIL | Release: BLOCKED | Alert: CRITICAL",
    },
    {
      name: "DEVICE_ONLINE",
      badgeVariant: "default",
      badgeClass:
        "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
      title: "8. Node Reconnect & Heartbeat Recovery",
      category: "Hydraulics & Nodes",
      description: "Restores primary sensor node connectivity.",
      expectedState: "Device: ONLINE | Event: SYSTEM_RECOVERED",
    },
    {
      name: "FILTER_WARNING",
      badgeVariant: "secondary",
      badgeClass:
        "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
      title: "9. Activated Carbon Filter Life Warning",
      category: "Maintenance & Reset",
      description: "Reduces Stage 2 filter media remaining life to 18%.",
      expectedState: "Carbon Life: 18% | Mode: MAINTENANCE | Alert: WARNING",
    },
    {
      name: "RESET",
      badgeVariant: "outline",
      title: "10. Full System Baseline Reset",
      category: "Maintenance & Reset",
      description:
        "Clears all active faults, restarts feed pump, opens valve, and restores clean 100 score.",
      expectedState:
        "System Clean: Score 100, Gate PASS, Release ALLOWED, Pump RUNNING",
    },
  ];

  const handleExecuteScenario = async (scenario: string) => {
    if (!activeSiteId) return;
    setLoadingScenario(scenario);
    setErrorMessage(null);
    setLastResult(null);

    try {
      const res = await api.triggerSimulator({
        siteId: activeSiteId,
        scenario,
      });
      setLastResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      setErrorMessage(msg);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Sandbox Header Callout */}
      <Card className="bg-card border-[var(--brand-secondary)]/40 shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-[var(--brand-primary)] text-[10px] font-bold text-white">
              DEMO LAB
            </Badge>
            <CardTitle className="text-foreground text-sm font-bold">
              Controlled Scenario & Fault Injection Engine
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Inject deterministic hardware faults, water chemical contamination,
            and hydraulic failure scenarios to verify real-time autonomous node
            reactions across all dashboard tabs.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <h2 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
          Scenario Catalog (10 Scenarios)
        </h2>

        {!canMutate && (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-800 dark:text-amber-300"
          >
            🔒 Switch persona to OPERATOR or ADMIN to inject fault scenarios
          </Badge>
        )}
      </div>

      {/* Execution Feedback Banner */}
      {errorMessage && (
        <Alert variant="destructive" className="shadow-xs">
          <IconAlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-bold uppercase">
            Backend Validation Response
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {lastResult && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs dark:bg-emerald-950/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <IconCheck className="size-4" />
                <span>SCENARIO INJECTED: {lastResult.scenario}</span>
              </div>
              <span className="telemetry-val text-muted-foreground text-xs">
                {new Date(lastResult.simulatedAt).toLocaleTimeString()}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-1">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="border-border/70 bg-card rounded-xl border p-3">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Score / Confidence
                </span>
                <span className="telemetry-val text-foreground text-lg font-black">
                  {lastResult.safety.score} / {lastResult.safety.confidence}%
                </span>
              </div>
              <div className="border-border/70 bg-card rounded-xl border p-3">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Quality Gate
                </span>
                <span className="text-foreground text-lg font-bold">
                  {lastResult.safety.qualityGate}
                </span>
              </div>
              <div className="border-border/70 bg-card rounded-xl border p-3">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Water Release
                </span>
                <span className="text-foreground text-lg font-bold">
                  {lastResult.safety.waterRelease}
                </span>
              </div>
              <div className="border-border/70 bg-card rounded-xl border p-3">
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  Isolation Valve
                </span>
                <span className="text-foreground text-lg font-bold">
                  {lastResult.flow.valveStatus}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios.map((sc) => (
          <Card
            key={sc.name}
            className="flex flex-col justify-between shadow-2xs transition hover:border-[var(--brand-secondary)]"
          >
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <Badge
                  variant={sc.badgeVariant}
                  className={`text-[10px] font-bold uppercase ${sc.badgeClass ?? ""}`}
                >
                  {sc.category}
                </Badge>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  {sc.name}
                </span>
              </div>

              <CardTitle className="text-foreground pt-2 text-sm font-bold">
                {sc.title}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {sc.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-1">
              <div className="border-border/80 bg-muted/30 rounded-xl border p-3 text-xs">
                <span className="text-muted-foreground mb-0.5 block text-[10px] font-bold uppercase">
                  Expected System Reaction:
                </span>
                <span className="text-foreground">{sc.expectedState}</span>
              </div>
            </CardContent>

            <CardFooter className="border-border/60 border-t p-4 pt-3">
              <Button
                disabled={!canMutate || loadingScenario === sc.name}
                onClick={() => handleExecuteScenario(sc.name)}
                className="w-full gap-2 font-semibold"
              >
                {loadingScenario === sc.name ? (
                  <>
                    <IconLoader2 className="size-4 animate-spin" />
                    <span>Injecting Scenario...</span>
                  </>
                ) : (
                  <>
                    <IconPlayerPlay className="size-3.5 fill-current" />
                    <span>Inject: {sc.name}</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Strict Scenario Error Handling Verification Card */}
      <Card className="border-border/80 bg-muted/20 shadow-2xs">
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Strict Input Validation Guard (HTTP 400 Bad Request)
          </CardTitle>
          <CardDescription className="text-xs">
            Demonstrates that unknown or mistyped scenario identifiers are
            strictly rejected with machine-readable HTTP 400 errors without
            silent fallbacks.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <Button
            variant="outline"
            disabled={!canMutate || Boolean(loadingScenario)}
            onClick={() => handleExecuteScenario("UNKNOWN_BOGUS_SCENARIO")}
            className="gap-2 text-xs font-semibold"
          >
            <IconBolt className="size-3.5 text-amber-500" />
            <span>
              Inject Invalid Scenario (&quot;UNKNOWN_BOGUS_SCENARIO&quot;)
            </span>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
