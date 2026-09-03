import { IconAlertTriangle, IconGauge, IconLoader2 } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { FlowDifferentialChart } from "../components/charts/FlowDifferentialChart";
import { FlowTelemetryDualChart } from "../components/charts/FlowTelemetryDualChart";
import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { FlowHistoryPoint } from "../lib/types";

export const Route = createFileRoute("/flow")({
  component: FlowPage,
});

interface FlowCurrentData {
  inlet: number;
  outlet: number;
  differencePercent: number;
  thresholdPercent: number;
  status: string;
  isolationValve: string;
}

function FlowPage() {
  const {
    activeSiteId,
    isStationEntered,
    isLoading: isAuthLoading,
  } = useAuth();
  const [flowCurrent, setFlowCurrent] = useState<FlowCurrentData | null>(null);
  const [history, setHistory] = useState<Array<FlowHistoryPoint>>([]);
  const [interval, setInterval] = useState<string>("5m");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeSiteId || !isStationEntered) {
      if (!isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);

    Promise.all([
      api.getFlowCurrent(activeSiteId),
      api.getFlowHistory(activeSiteId, { interval }),
    ])
      .then(([curr, hist]) => {
        setFlowCurrent({
          inlet: curr.inlet ?? 45.0,
          outlet: curr.outlet ?? curr.outletFlowRate ?? 45.0,
          differencePercent:
            curr.differencePercent ?? curr.mismatchPercent ?? 0.0,
          thresholdPercent: curr.thresholdPercent ?? 15.0,
          status: curr.leakStatus ?? "NORMAL",
          isolationValve: curr.isolationValve ?? curr.valveStatus ?? "OPEN",
        });
        setHistory(hist);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [activeSiteId, interval, isAuthLoading, isStationEntered]);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="Hydraulic Flow & Leak Protection" />;
  }

  const isLeak =
    flowCurrent?.status === "LEAK_DETECTED" ||
    (flowCurrent?.differencePercent ?? 0) > 15.0;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div>
          <h1 className="font-display text-foreground text-lg font-extrabold tracking-tight">
            Hydraulic Flow & Pipeline Leak Protection
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Continuous mass-balance differential verification: Q₁ (Intake) vs Q₂
            (Distribution)
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs font-semibold">
            History:
          </span>
          {["1m", "5m", "15m", "1h", "1d"].map((int) => (
            <Button
              key={int}
              variant={interval === int ? "default" : "outline"}
              size="xs"
              onClick={() => setInterval(int)}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              {int}
            </Button>
          ))}
        </div>
      </div>

      {/* Critical Leak Alert Banner */}
      {isLeak && (
        <Alert variant="destructive" className="shadow-sm">
          <IconAlertTriangle className="size-5" />
          <AlertTitle className="font-bold tracking-tight uppercase">
            Pipeline Leak Detected — Automated Isolation Engaged
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs leading-relaxed">
            Flow mismatch ({flowCurrent?.differencePercent.toFixed(1)}%)
            exceeded the 15.0% trip limit. The distribution isolation valve has
            been automatically closed to halt downstream loss.
          </AlertDescription>
        </Alert>
      )}

      {/* 1. Mass-Balance Flow Stage Chain */}
      <Card className="shadow-2xs">
        <CardHeader className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
              Mass-Balance Hydraulic Pipeline (Q₁ → Δ → Q₂)
            </CardTitle>
            <Badge variant="outline" className="text-xs font-semibold">
              Trip Threshold: 15.0% Differential
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Intake Node */}
            <Card className="border-border/80 bg-muted/20 shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  <IconGauge className="size-4 text-[var(--brand-secondary)]" />
                  <CardTitle className="text-foreground text-xs font-bold uppercase">
                    1. Intake Inflow (Q₁)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="telemetry-val text-foreground text-4xl font-black">
                    {flowCurrent?.inlet ?? 45.0}
                  </span>
                  <span className="text-muted-foreground text-sm font-semibold">
                    L/min
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Volumetric inflow measured at the primary raw extraction pump.
                </p>
              </CardContent>
            </Card>

            {/* Pipeline Differential Verification */}
            <Card
              className={`border shadow-2xs ${
                isLeak
                  ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20"
                  : "border-border/80 bg-muted/20"
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase">
                    2. Pipeline Differential (Δ)
                  </CardTitle>
                  <Badge
                    variant={!isLeak ? "default" : "destructive"}
                    className={
                      !isLeak
                        ? "border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-800 dark:text-emerald-300"
                        : "text-[10px]"
                    }
                  >
                    {flowCurrent?.status ?? "NORMAL"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`telemetry-val text-4xl font-black ${
                      isLeak
                        ? "font-black text-rose-600 dark:text-rose-400"
                        : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {flowCurrent?.differencePercent.toFixed(1) ?? "0.0"}%
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Mismatch
                  </span>
                </div>

                <div className="mt-2.5">
                  <Progress
                    value={Math.min(
                      100,
                      ((flowCurrent?.differencePercent ?? 0) / 15.0) * 100,
                    )}
                    className="h-2.5 w-full"
                    indicatorClassName={
                      isLeak ? "bg-rose-500" : "bg-emerald-500"
                    }
                  />
                </div>

                <p className="text-muted-foreground mt-2 text-xs">
                  Mass-balance differential: |Q₁ - Q₂| / Q₁ × 100%. Safe trip
                  limit is 15.0%.
                </p>
              </CardContent>
            </Card>

            {/* Distribution Outlet */}
            <Card className="border-border/80 bg-muted/20 shadow-2xs">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-foreground text-xs font-bold uppercase">
                    3. Distribution Meter (Q₂)
                  </CardTitle>
                  <Badge
                    variant={
                      flowCurrent?.isolationValve === "OPEN"
                        ? "default"
                        : "destructive"
                    }
                    className={
                      flowCurrent?.isolationValve === "OPEN"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-800 dark:text-emerald-300"
                        : "text-[10px]"
                    }
                  >
                    Valve: {flowCurrent?.isolationValve ?? "OPEN"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="telemetry-val text-foreground text-4xl font-black">
                    {flowCurrent?.outlet ?? 45.0}
                  </span>
                  <span className="text-muted-foreground text-sm font-semibold">
                    L/min
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Potable water delivered to community distribution network.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 1.5 Real-Time Dual-Flow & Differential Analytics Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FlowTelemetryDualChart
          history={history}
          currentInlet={flowCurrent?.inlet}
          currentOutlet={flowCurrent?.outlet}
          className="h-full shadow-2xs"
        />
        <FlowDifferentialChart
          history={history}
          currentMismatch={flowCurrent?.differencePercent}
          isLeak={isLeak}
          className="h-full shadow-2xs"
        />
      </div>

      {/* 2. Historical Flow Table */}
      <Card className="shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground text-sm font-bold">
              Historical Flow Telemetry Samples ({interval} Window)
            </CardTitle>
            <Badge variant="outline" className="text-xs font-semibold">
              InfluxDB Time-Series
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && history.length === 0 ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-xs">
              <IconLoader2 className="size-4 animate-spin text-[var(--brand-secondary)]" />
              <span>Loading flow history from InfluxDB...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-xs">
              No historical flow samples in the selected window.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[240px]">Timestamp</TableHead>
                  <TableHead className="w-[180px]">Intake Flow (Q₁)</TableHead>
                  <TableHead className="w-[180px]">Outlet Flow (Q₂)</TableHead>
                  <TableHead>Mismatch Differential</TableHead>
                  <TableHead className="w-[140px] text-right">
                    Integrity State
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 10).map((h, i) => {
                  const sampleLeak = h.differencePercent > 15.0;
                  const sampleWarning = h.differencePercent > 6.0;

                  return (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="text-muted-foreground text-xs font-medium">
                        {new Date(h.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-baseline gap-1">
                          <span className="telemetry-val text-sm font-black text-cyan-600 dark:text-cyan-400">
                            {h.inletFlowRate.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground text-xs font-medium">
                            L/min
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-baseline gap-1">
                          <span className="telemetry-val text-sm font-black text-emerald-600 dark:text-emerald-400">
                            {h.outletFlowRate.toFixed(1)}
                          </span>
                          <span className="text-muted-foreground text-xs font-medium">
                            L/min
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`telemetry-val inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${
                            sampleLeak
                              ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                              : sampleWarning
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {h.differencePercent.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={sampleLeak ? "destructive" : "outline"}
                          className={
                            !sampleLeak
                              ? "border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                              : "font-semibold"
                          }
                        >
                          <span
                            className={`mr-1.5 size-1.5 rounded-full ${
                              !sampleLeak
                                ? "animate-pulse bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />
                          {sampleLeak ? "Breach" : "Normal"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
