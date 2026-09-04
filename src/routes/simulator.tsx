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

import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import { FEATURES } from "../lib/feature-flags";
import type { SimulatorExecutionResult } from "../lib/types";

export const Route = createFileRoute("/simulator")({
  component: SimulatorPage,
});

interface ScenarioMeta {
  name: string;
  badgeVariant: "default" | "destructive" | "secondary" | "outline";
  badgeClass?: string;
  title: string;
  category:
    | "Node Zero Sensors"
    | "Hydraulics & Actuators"
    | "Edge Diagnostics"
    | "Maintenance & Reset"
    | "Extended Facility Suite";
  description: string;
  expectedState: string;
  prototypeActive: boolean;
}

function SimulatorPage() {
  const { activeSiteId, role } = useAuth();
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SimulatorExecutionResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canMutate = role === "ADMIN" || role === "OPERATOR";

  const scenarios: Array<ScenarioMeta> = [
    {
      name: "NORMAL",
      badgeVariant: "default",
      badgeClass:
        "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
      title: "1. Baseline Nominal Operation (Node Zero — IIITD)",
      category: "Node Zero Sensors",
      description:
        "Injects nominal prototype telemetry (Turbidity 1.2 NTU, Temperature 24.0°C, Flow 45 L/min). Solenoid valve OPEN.",
      expectedState:
        "Score: 100 | Gate: PASS | Release: ALLOWED | Solenoid: OPEN | Alarms: None",
      prototypeActive: true,
    },
    {
      name: "UNSAFE_TURBIDITY",
      badgeVariant: "destructive",
      title: "2. Turbidity Spill & Automated Solenoid Lockout",
      category: "Node Zero Sensors",
      description:
        "Injects high optical turbidity (28.5 NTU > 5.0 NTU threshold). Autonomous gatekeeper trips physical 12V shutoff valve.",
      expectedState:
        "Score: 35 | Gate: FAIL | Release: BLOCKED | Solenoid Valve: CLOSED | Alert: CRITICAL",
      prototypeActive: true,
    },
    {
      name: "UNSAFE_TEMPERATURE",
      badgeVariant: "secondary",
      badgeClass:
        "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
      title: "3. Thermal Inflow Anomaly",
      category: "Node Zero Sensors",
      description:
        "Injects elevated fluid temperature (43.5°C > 35.0°C maximum limit) on precision temperature probe.",
      expectedState:
        "Temp: 43.5°C | Gate: PASS (Warning) | Alert: WARNING (Thermal Inflow Envelope)",
      prototypeActive: true,
    },
    {
      name: "LEAK",
      badgeVariant: "destructive",
      title: "4. Pipeline Leak Surge Detection (Trip: > 47.25 L/min / 5%)",
      category: "Hydraulics & Actuators",
      description:
        "Simulates pipe breach flow surge to 58.5 L/min (+30.0% above 45.0 L/min rated capacity). Leak trip threshold is >47.25 L/min (5% above rated). Node Zero emergency solenoid isolation.",
      expectedState:
        "Flow: 58.5 L/min | Surge: +30% | Leak: DETECTED | Gate: FAIL | Solenoid: CLOSED | Alert: CRITICAL",
      prototypeActive: true,
    },
    {
      name: "SENSOR_DRIFT",
      badgeVariant: "secondary",
      badgeClass:
        "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
      title: "5. Optical Turbidity Nephelometer Drift",
      category: "Edge Diagnostics",
      description:
        "Simulates probe optical degradation (+3.6 NTU drift). Reduces confidence rating and flags calibration requirement.",
      expectedState:
        "Probe: DEGRADED | Confidence drops to 73% | Alert: WARNING (Calibration Required)",
      prototypeActive: true,
    },
    {
      name: "DEVICE_OFFLINE",
      badgeVariant: "destructive",
      title: "6. Node Zero (IIITD) Power / Heartbeat Timeout",
      category: "Edge Diagnostics",
      description:
        "Simulates edge node power disconnection or telemetry timeout at IIITD.",
      expectedState:
        "Device: OFFLINE | Gate: FAIL | Release: BLOCKED | Solenoid: CLOSED | Alert: CRITICAL",
      prototypeActive: true,
    },
    {
      name: "DEVICE_ONLINE",
      badgeVariant: "default",
      badgeClass:
        "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
      title: "7. Node Zero (IIITD) Heartbeat Restored",
      category: "Edge Diagnostics",
      description: "Restores Node Zero telemetry heartbeat and streaming.",
      expectedState: "Device: ONLINE | Event: SYSTEM_RECOVERED",
      prototypeActive: true,
    },
    {
      name: "RESET",
      badgeVariant: "outline",
      title: "8. Full System Baseline Reset",
      category: "Maintenance & Reset",
      description:
        "Clears active faults, opens solenoid valve, and restores clean nominal score (100).",
      expectedState:
        "System Clean: Score 100, Gate PASS, Release ALLOWED, Valve OPEN",
      prototypeActive: true,
    },
    {
      name: "UNSAFE_HEAVY_METALS",
      badgeVariant: "destructive",
      title: "9. Heavy Metals Contamination (AMD Runoff)",
      category: "Extended Facility Suite",
      description:
        "Injects toxic heavy metals reading (0.85 ppm > 0.10 limit) simulating industrial Acid Mine Drainage.",
      expectedState:
        "Score: 55 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Alert: CRITICAL",
      prototypeActive: false,
    },
    {
      name: "UNSAFE_PH",
      badgeVariant: "destructive",
      title: "10. Severe Acid Mine Drainage (Low pH)",
      category: "Extended Facility Suite",
      description: "Injects acidic pH 4.2 (< 6.5 threshold limit).",
      expectedState:
        "Score: 65 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Alert: CRITICAL",
      prototypeActive: false,
    },
    {
      name: "UNSAFE_TDS",
      badgeVariant: "secondary",
      badgeClass:
        "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
      title: "11. High Total Dissolved Solids (TDS Breach)",
      category: "Extended Facility Suite",
      description: "Injects elevated TDS (850 ppm > 500 ppm standard limit).",
      expectedState: "Score: 80 | Gate: PASS (Warning) | Alert: WARNING",
      prototypeActive: false,
    },
    ...(FEATURES.PURIFICATION
      ? [
          {
            name: "FILTER_WARNING" as const,
            badgeVariant: "secondary" as const,
            badgeClass:
              "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
            title: "12. Activated Carbon Filter Life Warning",
            category: "Extended Facility Suite" as const,
            description:
              "Reduces Stage 2 GAC activated carbon filter life to 18%.",
            expectedState:
              "Carbon Life: 18% | Mode: MAINTENANCE | Alert: WARNING",
            prototypeActive: false,
          },
        ]
      : []),
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
        <div>
          <h2 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Node Zero Prototype Scenarios (IIITD Pilot)
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Hardware-backed tests for Node Zero's Optical Turbidity sensor,
            Precision Temperature probe, Flow Turbine, and 12V Solenoid Shutoff
            valve.
          </p>
        </div>

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
                  Solenoid Valve
                </span>
                <span className="text-foreground text-lg font-bold">
                  {lastResult.flow.valveStatus}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Node Zero Scenarios Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios
          .filter((sc) => sc.prototypeActive)
          .map((sc) => (
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

      {/* Extended Facility Scenarios Section */}
      <div className="border-border/80 mt-8 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Extended Multi-Stage Facility Suite
            </h2>
            <Badge variant="outline" className="text-[10px]">
              AMD & Multi-Barrier
            </Badge>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Simulates industrial acid mine drainage, chemical runoff, and
            purification media degradation beyond the Node Zero single-node
            hardware payload.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios
          .filter((sc) => !sc.prototypeActive)
          .map((sc) => (
            <Card
              key={sc.name}
              className="border-border/60 bg-muted/15 flex flex-col justify-between shadow-2xs transition hover:border-[var(--brand-secondary)]"
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
                  variant="outline"
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
