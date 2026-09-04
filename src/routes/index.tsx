import {
  IconActivity,
  IconAlertTriangle,
  IconBuildingFactory2,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconCpu,
  IconDroplet,
  IconFilter,
  IconGauge,
  IconShieldCheck,
  IconShieldX,
  IconSparkles,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { FlowBalanceBarChart } from "@/components/charts/FlowBalanceBarChart";
import { PurificationHealthChart } from "@/components/charts/PurificationHealthChart";
import { TelemetrySparkline } from "@/components/charts/TelemetrySparkline";
import { WaterQualityAreaChart } from "@/components/charts/WaterQualityAreaChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import { FEATURES, isSensorKeyEnabled } from "../lib/feature-flags";
import type {
  DashboardOverview,
  FlowHistoryPoint,
  WaterQualityHistoryPoint,
} from "../lib/types";
import { useSSE } from "../lib/use-sse";

export const Route = createFileRoute("/")({ component: DashboardPage });

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="border-border/80 flex items-center justify-between border-b pb-4">
        <Skeleton className="h-8 w-64 rounded-xl" />
        <Skeleton className="h-8 w-36 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </main>
  );
}

function DashboardPage() {
  const {
    token,
    activeSiteId,
    sites,
    role,
    isLoading: isAuthLoading,
    isAuthenticating,
    useDemoPersona,
  } = useAuth();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [wqHistory, setWqHistory] = useState<Array<WaterQualityHistoryPoint>>(
    [],
  );
  const [flowHistory, setFlowHistory] = useState<Array<FlowHistoryPoint>>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [isTelemetryExpanded, setIsTelemetryExpanded] = useState<boolean>(true);

  const [hoveredTemp, setHoveredTemp] = useState<{
    value: number;
    time?: string;
  } | null>(null);
  const [hoveredTurb, setHoveredTurb] = useState<{
    value: number;
    time?: string;
  } | null>(null);
  const [hoveredInlet, setHoveredInlet] = useState<{
    value: number;
    time?: string;
  } | null>(null);
  const [hoveredMismatch, setHoveredMismatch] = useState<{
    value: number;
    time?: string;
  } | null>(null);
  const [hoveredPh, setHoveredPh] = useState<{
    value: number;
    time?: string;
  } | null>(null);
  const [hoveredTds, setHoveredTds] = useState<{
    value: number;
    time?: string;
  } | null>(null);

  const handleHoverTemp = useCallback(
    (pt: { value: number; time?: string } | null) => setHoveredTemp(pt),
    [],
  );
  const handleHoverTurb = useCallback(
    (pt: { value: number; time?: string } | null) => setHoveredTurb(pt),
    [],
  );
  const handleHoverInlet = useCallback(
    (pt: { value: number; time?: string } | null) => setHoveredInlet(pt),
    [],
  );
  const handleHoverMismatch = useCallback(
    (pt: { value: number; time?: string } | null) => setHoveredMismatch(pt),
    [],
  );
  const handleHoverPh = useCallback(
    (pt: { value: number; time?: string } | null) => setHoveredPh(pt),
    [],
  );
  const handleHoverTds = useCallback(
    (pt: { value: number; time?: string } | null) => setHoveredTds(pt),
    [],
  );

  const fetchOverview = useCallback(async () => {
    if (!activeSiteId) {
      setIsLoadingData(false);
      return;
    }

    try {
      const [overview, wq, fl] = await Promise.all([
        api.getDashboardOverview(activeSiteId),
        api
          .getWaterQualityHistory(activeSiteId, { interval: "5m" })
          .catch(() => []),
        api.getFlowHistory(activeSiteId, { interval: "5m" }).catch(() => []),
      ]);
      setData(overview);
      setWqHistory(wq);
      setFlowHistory(fl);
      setError(null);
    } catch (err: unknown) {
      setData((current) => {
        if (!current) {
          setError(
            err instanceof Error ? err.message : "Failed to load telemetry",
          );
        }
        return current;
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [activeSiteId, token]);

  useEffect(() => {
    if (activeSiteId) {
      setIsLoadingData(true);
      fetchOverview();
    } else if (!isAuthLoading && !isAuthenticating) {
      setIsLoadingData(false);
    }
  }, [activeSiteId, token, fetchOverview, isAuthLoading, isAuthenticating]);

  // Reactive SSE update listener with immediate optimistic state update + server reconciliation
  useSSE({
    siteId: activeSiteId,
    token,
    onEvent: (type: string, eventData: any) => {
      // 1. Instant local state updates
      if (type === "water-quality.updated" && eventData?.reading) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            latestReading: eventData.reading,
            lastUpdated: new Date().toISOString(),
          };
        });
        setWqHistory((prev) => {
          const newPoint: WaterQualityHistoryPoint = {
            timestamp: new Date().toISOString(),
            ...eventData.reading,
          };
          return [...prev.slice(-29), newPoint];
        });
      } else if (type === "water-safety.updated" && eventData?.safety) {
        setData((prev) => {
          if (!prev) return prev;
          const isBlocked = eventData.safety.waterRelease === "BLOCKED";
          return {
            ...prev,
            safety: eventData.safety,
            flow: {
              ...prev.flow,
              valveStatus: isBlocked ? "CLOSED" : prev.flow.valveStatus,
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      } else if (type === "quality-gate.changed" && eventData) {
        setData((prev) => {
          if (!prev) return prev;
          const isBlocked = eventData.waterRelease === "BLOCKED";
          return {
            ...prev,
            safety: {
              ...prev.safety,
              qualityGate: eventData.qualityGate ?? prev.safety.qualityGate,
              waterRelease: eventData.waterRelease ?? prev.safety.waterRelease,
            },
            flow: {
              ...prev.flow,
              valveStatus: isBlocked ? "CLOSED" : prev.flow.valveStatus,
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      } else if (type === "flow.updated" && eventData?.flow) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            flow: {
              flowRate: eventData.flow.flowRate ?? prev.flow.flowRate,
              nominalFlowRate:
                eventData.flow.nominalFlowRate ??
                prev.flow.nominalFlowRate ??
                45.0,
              mismatchPercent:
                eventData.flow.mismatchPercent ?? prev.flow.mismatchPercent,
              leakStatus: eventData.flow.leakStatus ?? prev.flow.leakStatus,
              valveStatus: eventData.flow.valveStatus ?? prev.flow.valveStatus,
            },
            lastUpdated: new Date().toISOString(),
          };
        });
        setFlowHistory((prev) => {
          const newPoint: FlowHistoryPoint = {
            timestamp: new Date().toISOString(),
            flowRate: eventData.flow.flowRate ?? 33.0,
            differencePercent: eventData.flow.mismatchPercent ?? 0.0,
          };
          return [...prev.slice(-29), newPoint];
        });
      } else if (type === "leak.detected") {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            flow: {
              ...prev.flow,
              mismatchPercent: eventData?.mismatchPercent ?? 30.0,
              leakStatus: "LEAK_DETECTED",
              valveStatus: "CLOSED",
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      } else if (type === "alert.created" && eventData?.alert) {
        setData((prev) => {
          if (!prev) return prev;
          const exists = prev.activeAlerts.some(
            (a) => a.id === eventData.alert.id,
          );
          const activeAlerts = exists
            ? prev.activeAlerts.map((a) =>
                a.id === eventData.alert.id ? eventData.alert : a,
              )
            : [eventData.alert, ...prev.activeAlerts];
          return {
            ...prev,
            activeAlerts,
            lastUpdated: new Date().toISOString(),
          };
        });
      } else if (type === "alert.acknowledged" && eventData?.alertId) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeAlerts: prev.activeAlerts.filter(
              (a) => a.id !== eventData.alertId,
            ),
            lastUpdated: new Date().toISOString(),
          };
        });
      }

      // 2. Authoritative server reconciliation
      fetchOverview();
    },
  });

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!activeSiteId) return;
    setAcknowledgingId(alertId);
    try {
      await api.acknowledgeAlert(activeSiteId, alertId);
      await fetchOverview();
    } catch {
      // ignore
    } finally {
      setAcknowledgingId(null);
    }
  };

  // 1. Loading state while authenticating or bootstrapping
  if ((isAuthLoading || isAuthenticating) && sites.length === 0) {
    return <DashboardSkeleton />;
  }

  // 2. Unauthenticated or empty site state
  if (!activeSiteId && sites.length === 0 && !isLoadingData) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Card className="mx-auto max-w-md text-center shadow-md">
          <CardHeader className="space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] dark:bg-[var(--brand-secondary)]/20 dark:text-[var(--brand-secondary)]">
              <IconBuildingFactory2 className="size-6" />
            </div>
            <span className="text-xs font-bold tracking-wider text-[var(--brand-secondary)] uppercase">
              HydroGrid Operations
            </span>
            <CardTitle className="text-lg font-bold">
              No Active Station Membership
            </CardTitle>
            <CardDescription className="text-xs">
              Connect to the local water station console using the
              pre-configured administrator demo credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Button
              onClick={() => useDemoPersona("ADMIN")}
              className="font-semibold"
            >
              Connect as Administrator Demo
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // 3. Loading state for telemetry inside station
  if (isLoadingData && !data) {
    return <DashboardSkeleton />;
  }

  // 5. Error fallback state
  if (error && !data) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Alert variant="destructive" className="mx-auto max-w-md">
          <IconAlertTriangle className="size-4" />
          <AlertTitle className="font-bold">
            Telemetry Connection Interrupted
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs">{error}</AlertDescription>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={fetchOverview}>
              Retry Telemetry Sync
            </Button>
          </div>
        </Alert>
      </main>
    );
  }

  if (!data) return null;

  const {
    site,
    safety,
    latestReading,
    purification,
    flow,
    activeAlerts,
    recentEvents,
    devices,
  } = data;

  const isGatePass = safety.qualityGate === "PASS";
  const isReleaseAllowed = safety.waterRelease === "ALLOWED";
  const isLeak = flow.leakStatus === "LEAK_DETECTED";
  const isPumpRunning = purification.pump === "RUNNING";
  const isValveOpen = flow.valveStatus === "OPEN";

  const isSafeSystem = isGatePass && isReleaseAllowed && !isLeak;

  const assessmentPoints = isSafeSystem
    ? [
        "All 9 physicochemical water quality parameters within standard operating limits",
        "4-stage physical, chemical, and UV-C treatment units operating normally",
        "Hydraulic differential within permissible 15.0% tolerance (no pipeline leak)",
        "Automated Quality Gate satisfied: Water distribution is ALLOWED",
      ]
    : [
        ...(safety.reasons && safety.reasons.length > 0
          ? safety.reasons
          : ["Quality Gate decision returned FAIL due to threshold violation"]),
        isLeak
          ? `Pipeline mass-balance differential (${flow.mismatchPercent.toFixed(1)}%) exceeded 15.0% trip limit`
          : null,
        !isReleaseAllowed
          ? "Automated shutoff engaged: Water release is BLOCKED"
          : null,
      ].filter((p): p is string => Boolean(p));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* 1. Station Context & Status Bar */}
      <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${
                site.status === "ONLINE"
                  ? "animate-pulse bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : "bg-rose-500"
              }`}
            />
            <h1 className="font-display text-foreground text-lg font-extrabold tracking-tight">
              {site.name} Overview
            </h1>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-muted-foreground text-xs">
            {site.location ?? "IIIT-Delhi Campus (Okhla), South East Delhi"}
          </span>
        </div>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>
            Telemetry Sync:{" "}
            <strong className="text-foreground">
              {new Date(data.lastUpdated).toLocaleTimeString()}
            </strong>
          </span>
          <Link
            to="/simulator"
            className={cn(
              buttonVariants({ variant: "outline", size: "xs" }),
              "h-7 gap-1 font-semibold",
            )}
          >
            <IconSparkles className="size-3 text-amber-500" />
            <span>Test Scenarios</span>
          </Link>
        </div>
      </div>

      {/* 2. Executive Decision Hero Banner */}
      <Card
        className={`border transition-colors ${
          isSafeSystem
            ? "border-emerald-500/40 bg-emerald-500/5 dark:border-emerald-500/30 dark:bg-emerald-950/20"
            : "border-rose-500/40 bg-rose-500/5 dark:border-rose-500/30 dark:bg-rose-950/20"
        }`}
      >
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            {/* Safety Score & Status */}
            <div className="space-y-3 lg:col-span-6">
              <div className="flex items-center gap-2">
                <Badge
                  variant={isSafeSystem ? "default" : "destructive"}
                  className={`gap-1.5 px-3 py-1 text-xs font-bold ${
                    isSafeSystem
                      ? "bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500"
                      : ""
                  }`}
                >
                  {isSafeSystem ? (
                    <IconShieldCheck className="size-4" />
                  ) : (
                    <IconShieldX className="size-4" />
                  )}
                  <span>
                    {isSafeSystem
                      ? "SAFE TO RELEASE"
                      : "SAFETY LOCKOUT ENGAGED"}
                  </span>
                </Badge>
                <Badge variant="outline" className="text-xs font-semibold">
                  Gate: {safety.qualityGate}
                </Badge>
              </div>

              <div className="flex items-baseline gap-4">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`telemetry-val text-6xl font-black ${
                      safety.score >= 80
                        ? "text-emerald-700 dark:text-emerald-400"
                        : safety.score >= 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {safety.score}
                  </span>
                  <span className="text-muted-foreground text-sm font-semibold">
                    / 100
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Water Release:
                    </span>
                    <Badge
                      variant={isReleaseAllowed ? "default" : "destructive"}
                      className={`text-xs font-extrabold ${
                        isReleaseAllowed
                          ? "bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500"
                          : ""
                      }`}
                    >
                      {safety.waterRelease}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="telemetry-val text-foreground font-bold">
                      {safety.confidence}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress gauge */}
              <div className="w-full max-w-sm pt-1">
                <Progress
                  value={safety.score}
                  className="h-2.5 w-full"
                  indicatorClassName={
                    safety.score >= 80
                      ? "bg-emerald-600 dark:bg-emerald-500"
                      : safety.score >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }
                />
              </div>
            </div>

            {/* Actuators & Edge Fleet States */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-6">
              <Card className="border-border/80 bg-background/80 shadow-2xs">
                <CardHeader className="p-3 pb-1">
                  <CardDescription className="text-[11px] font-semibold uppercase">
                    Feed Pump
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <span
                    className={`text-sm font-bold ${
                      isPumpRunning
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "font-extrabold text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {purification.pump}
                  </span>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-background/80 shadow-2xs">
                <CardHeader className="p-3 pb-1">
                  <CardDescription className="text-[11px] font-semibold uppercase">
                    Isolation Valve
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <span
                    className={`text-sm font-bold ${
                      isValveOpen
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "font-extrabold text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {flow.valveStatus}
                  </span>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-background/80 shadow-2xs">
                <CardHeader className="p-3 pb-1">
                  <CardDescription className="text-[11px] font-semibold uppercase">
                    Edge Nodes
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <span className="text-foreground text-sm font-bold">
                    {devices.filter((d) => d.status === "ONLINE").length}/
                    {devices.length} Online
                  </span>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-background/80 shadow-2xs">
                <CardHeader className="p-3 pb-1">
                  <CardDescription className="text-[11px] font-semibold uppercase">
                    Data Integrity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <span className="telemetry-val text-foreground text-sm font-bold">
                    {safety.confidence}% Valid
                  </span>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2.5 At-A-Glance Critical KPI Sparkline Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.ALL_SENSORS
          ? /* pH Potability Card (Full suite) */
            (() => {
              const isHovered = hoveredPh !== null;
              const val = isHovered ? hoveredPh.value : latestReading.ph;
              const isOptimal = val >= 6.5 && val <= 8.5;
              return (
                <Card
                  className="border-border/80 overflow-hidden shadow-2xs"
                  onMouseLeave={() => handleHoverPh(null)}
                >
                  <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardDescription className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                          pH Potability Level
                        </CardDescription>
                        {isHovered && (
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            ({hoveredPh.time})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="telemetry-val text-foreground text-xl font-black">
                          {val.toFixed(2)}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {isOptimal ? "✓ Optimal" : "⚠ Outside Band"}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      6.5–8.5
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <TelemetrySparkline
                      data={
                        wqHistory.length
                          ? wqHistory.map((p) => {
                              const d = new Date(p.timestamp);
                              return {
                                value: p.ph,
                                time: d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                                timestamp: p.timestamp,
                              };
                            })
                          : [
                              { value: 7.3, time: "11:30" },
                              { value: 7.35, time: "11:32" },
                              { value: 7.32, time: "11:34" },
                              { value: latestReading.ph, time: "11:35" },
                            ]
                      }
                      color="#10b981"
                      gradientId="spark-ph"
                      unit=""
                      onHoverChange={handleHoverPh}
                      height={36}
                    />
                  </CardContent>
                </Card>
              );
            })()
          : /* Water Temperature Card (Node Zero Prototype) */
            (() => {
              const isHovered = hoveredTemp !== null;
              const val = isHovered
                ? hoveredTemp.value
                : latestReading.temperature;
              const isAmbient = val >= 15 && val <= 35;
              return (
                <Card
                  className="border-border/80 overflow-hidden shadow-2xs"
                  onMouseLeave={() => handleHoverTemp(null)}
                >
                  <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardDescription className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                          Water Temperature
                        </CardDescription>
                        {isHovered && (
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            ({hoveredTemp.time})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="telemetry-val text-foreground text-xl font-black">
                          {val.toFixed(1)}{" "}
                          <span className="text-muted-foreground text-xs font-semibold">
                            °C
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                          {isAmbient ? "✓ Ambient Potable" : "⚠ Thermal Drift"}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-orange-500/30 bg-orange-500/10 text-[10px] font-bold text-orange-700 dark:text-orange-400"
                    >
                      15–35 °C
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <TelemetrySparkline
                      data={
                        wqHistory.length
                          ? wqHistory.map((p) => {
                              const d = new Date(p.timestamp);
                              return {
                                value: p.temperature,
                                time: d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                                timestamp: p.timestamp,
                              };
                            })
                          : [
                              { value: 23.5, time: "11:30" },
                              { value: 24.0, time: "11:32" },
                              { value: 24.2, time: "11:34" },
                              {
                                value: latestReading.temperature,
                                time: "11:35",
                              },
                            ]
                      }
                      color="#f97316"
                      gradientId="spark-temp"
                      unit="°C"
                      onHoverChange={handleHoverTemp}
                      height={36}
                    />
                  </CardContent>
                </Card>
              );
            })()}

        {/* Optical Turbidity Card (Active in both full & prototype) */}
        {(() => {
          const isHovered = hoveredTurb !== null;
          const val = isHovered ? hoveredTurb.value : latestReading.turbidity;
          const isClear = val < 5.0;
          return (
            <Card
              className="border-border/80 overflow-hidden shadow-2xs"
              onMouseLeave={() => handleHoverTurb(null)}
            >
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    <CardDescription className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                      Optical Turbidity
                    </CardDescription>
                    {isHovered && (
                      <span className="text-muted-foreground text-[10px] font-semibold">
                        ({hoveredTurb.time})
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="telemetry-val text-foreground text-xl font-black">
                      {val.toFixed(2)}{" "}
                      <span className="text-muted-foreground text-xs font-semibold">
                        NTU
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                      {isClear ? "✓ Clear" : "⚠ High Silt"}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-cyan-500/30 bg-cyan-500/10 text-[10px] font-bold text-cyan-700 dark:text-cyan-400"
                >
                  &lt; 5.0 NTU
                </Badge>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <TelemetrySparkline
                  data={
                    wqHistory.length
                      ? wqHistory.map((p) => {
                          const d = new Date(p.timestamp);
                          return {
                            value: p.turbidity,
                            time: d.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            }),
                            timestamp: p.timestamp,
                          };
                        })
                      : [
                          { value: 1.1, time: "11:30" },
                          { value: 0.9, time: "11:32" },
                          { value: 0.85, time: "11:34" },
                          { value: latestReading.turbidity, time: "11:35" },
                        ]
                  }
                  color="#06b6d4"
                  gradientId="spark-turb"
                  unit="NTU"
                  onHoverChange={handleHoverTurb}
                  height={36}
                />
              </CardContent>
            </Card>
          );
        })()}

        {FEATURES.ALL_SENSORS
          ? /* Total Dissolved Solids Card (Full suite) */
            (() => {
              const isHovered = hoveredTds !== null;
              const val = isHovered ? hoveredTds.value : latestReading.tds;
              const isSafe = val < 500;
              return (
                <Card
                  className="border-border/80 overflow-hidden shadow-2xs"
                  onMouseLeave={() => handleHoverTds(null)}
                >
                  <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardDescription className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                          Mineral TDS Load
                        </CardDescription>
                        {isHovered && (
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            ({hoveredTds.time})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="telemetry-val text-foreground text-xl font-black">
                          {Math.round(val)}{" "}
                          <span className="text-muted-foreground text-xs font-semibold">
                            ppm
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          {isSafe ? "✓ Safe Load" : "⚠ High Solids"}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-400"
                    >
                      &lt; 500 ppm
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <TelemetrySparkline
                      data={
                        wqHistory.length
                          ? wqHistory.map((p) => {
                              const d = new Date(p.timestamp);
                              return {
                                value: p.tds,
                                time: d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                                timestamp: p.timestamp,
                              };
                            })
                          : [
                              { value: 150, time: "11:30" },
                              { value: 145, time: "11:32" },
                              { value: 148, time: "11:34" },
                              { value: latestReading.tds, time: "11:35" },
                            ]
                      }
                      color="#f59e0b"
                      gradientId="spark-tds"
                      unit="ppm"
                      onHoverChange={handleHoverTds}
                      height={36}
                    />
                  </CardContent>
                </Card>
              );
            })()
          : /* Node Zero Flow Rate Card (Single Transducer) */
            (() => {
              const isHovered = hoveredInlet !== null;
              const val = isHovered ? hoveredInlet.value : flow.flowRate;
              return (
                <Card
                  className="border-border/80 overflow-hidden shadow-2xs"
                  onMouseLeave={() => handleHoverInlet(null)}
                >
                  <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardDescription className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                          Node Zero Flow Rate
                        </CardDescription>
                        {isHovered && (
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            ({hoveredInlet.time})
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="telemetry-val text-foreground text-xl font-black">
                          {val.toFixed(1)}{" "}
                          <span className="text-muted-foreground text-xs font-semibold">
                            L/min
                          </span>
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Node Zero Active
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
                    >
                      30–50 L/min
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <TelemetrySparkline
                      data={
                        flowHistory.length
                          ? flowHistory.map((p) => {
                              const d = new Date(p.timestamp);
                              return {
                                value: p.flowRate,
                                time: d.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                                timestamp: p.timestamp,
                              };
                            })
                          : [
                              { value: 31.5, time: "11:30" },
                              { value: 33.0, time: "11:32" },
                              { value: 34.2, time: "11:34" },
                              { value: flow.flowRate, time: "11:35" },
                            ]
                      }
                      color="#10b981"
                      gradientId="spark-inlet-flow"
                      unit="L/min"
                      onHoverChange={handleHoverInlet}
                      height={36}
                    />
                  </CardContent>
                </Card>
              );
            })()}

        {/* Differential Flow Mismatch & Shutoff Valve Card */}
        {(() => {
          const isHovered = hoveredMismatch !== null;
          const val = isHovered ? hoveredMismatch.value : flow.mismatchPercent;
          const cardLeak = flow.flowRate > 47.25 || val > 5.0 || isLeak;
          return (
            <Card
              className="border-border/80 overflow-hidden shadow-2xs"
              onMouseLeave={() => handleHoverMismatch(null)}
            >
              <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    <CardDescription className="text-muted-foreground text-[11px] font-bold tracking-wider uppercase">
                      {FEATURES.ALL_SENSORS
                        ? "Differential Flow Mismatch"
                        : "Leak Detection & Solenoid Valve"}
                    </CardDescription>
                    {isHovered && (
                      <span className="text-muted-foreground text-[10px] font-semibold">
                        ({hoveredMismatch.time})
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span
                      className={`telemetry-val text-xl font-black ${
                        cardLeak
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground"
                      }`}
                    >
                      {val > 0 ? `+${val.toFixed(1)}%` : "0.0%"}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        cardLeak
                          ? "font-bold text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {cardLeak
                        ? "⚠ Leak (Valve Closed)"
                        : `✓ Valve ${flow.valveStatus}`}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    cardLeak
                      ? "border-red-500/30 bg-red-500/10 text-red-700"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  Limit: 47.25 L/min
                </Badge>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <TelemetrySparkline
                  data={
                    flowHistory.length
                      ? flowHistory.map((p) => {
                          const d = new Date(p.timestamp);
                          return {
                            value: p.differencePercent,
                            time: d.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            }),
                            timestamp: p.timestamp,
                          };
                        })
                      : [
                          { value: 0, time: "11:30" },
                          { value: 0.1, time: "11:32" },
                          { value: 0, time: "11:34" },
                          { value: flow.mismatchPercent, time: "11:35" },
                        ]
                  }
                  color={cardLeak ? "#ef4444" : "#10b981"}
                  gradientId="spark-flow"
                  unit="%"
                  onHoverChange={handleHoverMismatch}
                  height={36}
                />
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* 2.6 Primary Real-Time Visual Analytics Section (shadcn Charts) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <WaterQualityAreaChart
            history={wqHistory}
            currentReading={latestReading}
            className="h-full shadow-2xs"
          />
        </div>
        <div className="lg:col-span-5">
          <FlowBalanceBarChart
            flow={data.flow}
            history={flowHistory}
            className="h-full shadow-2xs"
          />
        </div>
      </div>

      {/* 2.7 4-Stage Purification Multi-Barrier Performance */}
      {FEATURES.PURIFICATION && (
        <PurificationHealthChart
          purification={data.purification}
          className="shadow-2xs"
        />
      )}

      {/* 3. Operational Lifecycle & Verification Chain */}
      <Card className="shadow-2xs">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground text-xs font-bold tracking-wider uppercase">
              Autonomous Decision & Verification Lifecycle
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">
              Continuous Monitoring
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <div className="border-border/80 bg-muted/40 space-y-1 rounded-xl border p-3">
              <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                1. Intake
              </span>
              <span className="text-foreground block text-xs font-bold">
                Raw Source
              </span>
              <span className="text-muted-foreground block text-[11px]">
                Well extraction
              </span>
            </div>

            <Link
              to="/water-quality"
              className="group border-border/80 bg-muted/40 hover:bg-muted/70 block space-y-1 rounded-xl border p-3 transition hover:border-[var(--brand-secondary)]"
            >
              <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                2. Sensing
              </span>
              <span
                className={`block text-xs font-bold ${
                  isGatePass
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {FEATURES.ALL_SENSORS ? "9 Channels" : "3 Sensors"}{" "}
                {isGatePass ? "✓" : "▲"}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                Physicochemical
              </span>
            </Link>

            {FEATURES.PURIFICATION && (
              <Link
                to="/purification"
                className="group border-border/80 bg-muted/40 hover:bg-muted/70 block space-y-1 rounded-xl border p-3 transition hover:border-[var(--brand-secondary)]"
              >
                <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                  3. Treatment
                </span>
                <span
                  className={`block text-xs font-bold ${
                    purification.mode === "NORMAL"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  4 Stages {purification.mode === "NORMAL" ? "✓" : "◆"}
                </span>
                <span className="text-muted-foreground block text-[11px]">
                  Filtration train
                </span>
              </Link>
            )}

            <Link
              to="/flow"
              className="group border-border/80 bg-muted/40 hover:bg-muted/70 block space-y-1 rounded-xl border p-3 transition hover:border-[var(--brand-secondary)]"
            >
              <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                4. Hydraulics
              </span>
              <span
                className={`block text-xs font-bold ${
                  !isLeak
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                Diff {flow.mismatchPercent.toFixed(1)}% {!isLeak ? "✓" : "▲"}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                Mass-balance
              </span>
            </Link>

            <div className="border-border/80 bg-muted/40 space-y-1 rounded-xl border p-3">
              <span className="text-muted-foreground block text-[10px] font-bold uppercase">
                5. Quality Gate
              </span>
              <span
                className={`block text-xs font-bold ${
                  isGatePass
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {safety.qualityGate}
              </span>
              <span className="text-muted-foreground block text-[11px]">
                Rule evaluation
              </span>
            </div>

            <div
              className={`space-y-1 rounded-xl border p-3 ${
                isReleaseAllowed
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 font-bold text-rose-800 dark:text-rose-300"
              }`}
            >
              <span className="block text-[10px] font-bold uppercase opacity-80">
                6. Distribution
              </span>
              <span className="block text-xs font-bold">
                {safety.waterRelease}
              </span>
              <span className="block text-[11px] opacity-80">Supply valve</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Assessment Bulletins */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${
                isSafeSystem ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <CardTitle className="text-foreground text-xs font-bold tracking-wider uppercase">
              Operational Assessment Diagnostics
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <ul className="text-muted-foreground space-y-1.5 text-xs">
            {assessmentPoints.map((pt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span
                  className={`mt-0.5 font-bold ${isSafeSystem ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {isSafeSystem ? "✓" : "▲"}
                </span>
                <span className="text-foreground">{pt}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 5. Subsystem Hub Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Water Quality Card */}
        <Card className="flex flex-col justify-between shadow-2xs transition-all hover:border-[var(--brand-secondary)]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconDroplet className="size-4 text-sky-600 dark:text-sky-400" />
                <CardTitle className="text-foreground text-sm font-bold">
                  Water Quality
                </CardTitle>
              </div>
              <Badge
                variant={isGatePass ? "default" : "destructive"}
                className={
                  isGatePass
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                    : ""
                }
              >
                {isGatePass ? "Safe" : "Exceeded"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              9 physicochemical parameters monitored continuously against WHO
              potability limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-muted-foreground text-xs font-medium">
              <span>
                pH{" "}
                <strong className="telemetry-val text-foreground">
                  {latestReading.ph.toFixed(2)}
                </strong>
              </span>{" "}
              ·{" "}
              <span>
                Turbidity{" "}
                <strong className="telemetry-val text-foreground">
                  {latestReading.turbidity.toFixed(1)} NTU
                </strong>
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-border/60 border-t p-3 pt-2">
            <Link
              to="/water-quality"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hover:text-foreground w-full justify-between px-2 text-xs font-semibold text-[var(--brand-secondary)]",
              )}
            >
              <span>Inspect Evidence</span>
              <IconChevronRight className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>

        {/* Purification Card (Hidden under feature flag in prototype profile) */}
        {FEATURES.PURIFICATION && (
          <Card className="flex flex-col justify-between shadow-2xs transition-all hover:border-[var(--brand-secondary)]">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconFilter className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle className="text-foreground text-sm font-bold">
                    Purification
                  </CardTitle>
                </div>
                <Badge
                  variant={
                    purification.mode === "NORMAL" ? "default" : "secondary"
                  }
                  className={
                    purification.mode === "NORMAL"
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      : ""
                  }
                >
                  {purification.mode}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                4 sequential physical, chemical, and UV-C stages with active
                media lifecycle monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-muted-foreground text-xs font-medium">
                <span>
                  Carbon Filter{" "}
                  <strong className="telemetry-val text-foreground">
                    {purification.filters.carbon.lifePercent}%
                  </strong>
                </span>{" "}
                ·{" "}
                <span>
                  Pump{" "}
                  <strong className="text-foreground">
                    {purification.pump}
                  </strong>
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-border/60 border-t p-3 pt-2">
              <Link
                to="/purification"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hover:text-foreground w-full justify-between px-2 text-xs font-semibold text-[var(--brand-secondary)]",
                )}
              >
                <span>Inspect Stages</span>
                <IconChevronRight className="size-3.5" />
              </Link>
            </CardFooter>
          </Card>
        )}

        {/* Hydraulics Card */}
        <Card className="flex flex-col justify-between shadow-2xs transition-all hover:border-[var(--brand-secondary)]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconGauge className="size-4 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-foreground text-sm font-bold">
                  Hydraulics
                </CardTitle>
              </div>
              <Badge
                variant={!isLeak ? "default" : "destructive"}
                className={
                  !isLeak
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                    : ""
                }
              >
                {!isLeak ? "Normal" : "Leak"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Node Zero baseline differential monitoring with automated pipeline
              isolation valve.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-muted-foreground text-xs font-medium">
              <span>
                Flow{" "}
                <strong className="telemetry-val text-foreground">
                  {flow.flowRate.toFixed(1)} L/min
                </strong>
              </span>{" "}
              ·{" "}
              <span>
                Mismatch{" "}
                <strong className="telemetry-val text-foreground">
                  {flow.mismatchPercent.toFixed(1)}%
                </strong>
              </span>
            </div>
          </CardContent>
          <CardFooter className="border-border/60 border-t p-3 pt-2">
            <Link
              to="/flow"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hover:text-foreground w-full justify-between px-2 text-xs font-semibold text-[var(--brand-secondary)]",
              )}
            >
              <span>Inspect Hydraulics</span>
              <IconChevronRight className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>

        {/* Hardware Nodes Card */}
        <Card className="flex flex-col justify-between shadow-2xs transition-all hover:border-[var(--brand-secondary)]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCpu className="size-4 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-foreground text-sm font-bold">
                  Edge Fleet
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {devices.filter((d) => d.status === "ONLINE").length}/
                {devices.length} Online
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Hardware microcontroller telemetry nodes, probe calibrations, and
              health diagnostics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-muted-foreground text-xs font-medium">
              <span>Station Master Node Synced</span>
            </div>
          </CardContent>
          <CardFooter className="border-border/60 border-t p-3 pt-2">
            <Link
              to="/devices"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hover:text-foreground w-full justify-between px-2 text-xs font-semibold text-[var(--brand-secondary)]",
              )}
            >
              <span>Inspect Nodes</span>
              <IconChevronRight className="size-3.5" />
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* 6. 9-Parameter Real-Time Telemetry Grid */}
      <Collapsible
        open={isTelemetryExpanded}
        onOpenChange={setIsTelemetryExpanded}
        className="border-border/80 bg-card rounded-2xl border shadow-2xs"
      >
        <div className="flex items-center justify-between p-4 pb-3">
          <div>
            <h2 className="text-foreground text-sm font-bold tracking-tight">
              {FEATURES.ALL_SENSORS
                ? "Detailed Sensor Channels (9 Ingestion Probes)"
                : "Active Prototype Sensor Channels (Node Zero)"}
            </h2>
            <p className="text-muted-foreground text-xs">
              {FEATURES.ALL_SENSORS
                ? "Calibrated physicochemical readings from edge microcontroller node"
                : "Calibrated readings from physical Turbidity, Temperature, and Flow sensors (IIITD deployment)"}
            </p>
          </div>
          <CollapsibleTrigger
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1 text-xs font-semibold",
            )}
          >
            <span>{isTelemetryExpanded ? "Collapse" : "Expand"}</span>
            {isTelemetryExpanded ? (
              <IconChevronUp className="size-4" />
            ) : (
              <IconChevronDown className="size-4" />
            )}
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <Separator />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">Parameter Channel</TableHead>
                <TableHead className="w-[180px]">Current Telemetry</TableHead>
                <TableHead>WHO Potability Range</TableHead>
                <TableHead className="w-[120px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* pH */}
              {isSensorKeyEnabled("ph") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-emerald-500 ring-2" />
                      <span className="text-foreground font-bold">
                        pH Acidity
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="telemetry-val text-foreground text-sm font-black">
                      {latestReading.ph.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    6.50 – 8.50 pH
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        latestReading.ph >= 6.5 && latestReading.ph <= 8.5
                          ? "outline"
                          : "destructive"
                      }
                      className={
                        latestReading.ph >= 6.5 && latestReading.ph <= 8.5
                          ? "border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                          : "font-semibold"
                      }
                    >
                      <span
                        className={`mr-1.5 size-1.5 rounded-full ${
                          latestReading.ph >= 6.5 && latestReading.ph <= 8.5
                            ? "animate-pulse bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      />
                      {latestReading.ph >= 6.5 && latestReading.ph <= 8.5
                        ? "Normal"
                        : "Out of Range"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Turbidity */}
              {isSensorKeyEnabled("turbidity") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-cyan-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Turbidity
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.turbidity.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        NTU
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    Max 5.0 NTU
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        latestReading.turbidity <= 5.0
                          ? "outline"
                          : "destructive"
                      }
                      className={
                        latestReading.turbidity <= 5.0
                          ? "border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                          : "font-semibold"
                      }
                    >
                      <span
                        className={`mr-1.5 size-1.5 rounded-full ${
                          latestReading.turbidity <= 5.0
                            ? "animate-pulse bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      />
                      {latestReading.turbidity <= 5.0 ? "Normal" : "Exceeded"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Heavy Metals */}
              {isSensorKeyEnabled("heavyMetals") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-rose-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Heavy Metals (Lead/Cadmium)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.heavyMetals.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        ppm
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    Max 0.10 ppm
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        latestReading.heavyMetals <= 0.1
                          ? "outline"
                          : "destructive"
                      }
                      className={
                        latestReading.heavyMetals <= 0.1
                          ? "border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                          : "font-semibold"
                      }
                    >
                      <span
                        className={`mr-1.5 size-1.5 rounded-full ${
                          latestReading.heavyMetals <= 0.1
                            ? "animate-pulse bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      />
                      {latestReading.heavyMetals <= 0.1 ? "Normal" : "Hazard"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* TDS */}
              {isSensorKeyEnabled("tds") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-amber-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Total Dissolved Solids (TDS)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.tds.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        ppm
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    Max 500 ppm
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        latestReading.tds <= 500 ? "outline" : "destructive"
                      }
                      className={
                        latestReading.tds <= 500
                          ? "border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                          : "font-semibold"
                      }
                    >
                      <span
                        className={`mr-1.5 size-1.5 rounded-full ${
                          latestReading.tds <= 500
                            ? "animate-pulse bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      />
                      {latestReading.tds <= 500 ? "Normal" : "Exceeded"}
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Dissolved Oxygen */}
              {isSensorKeyEnabled("dissolvedOxygen") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-violet-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Dissolved Oxygen
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.dissolvedOxygen.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        mg/L
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    &gt; 6.5 mg/L
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Normal
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Electrical Conductivity */}
              {isSensorKeyEnabled("electricalConductivity") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-blue-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Electrical Conductivity
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.electricalConductivity.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        µS/cm
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    Observational
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Normal
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Total Hardness */}
              {isSensorKeyEnabled("hardness") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-purple-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Total Hardness
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.hardness.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        mg/L
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    Max 300 mg/L
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Normal
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Water Temperature */}
              {isSensorKeyEnabled("temperature") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-orange-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Water Temperature
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.temperature.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        °C
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    15.0 – 35.0 °C
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Normal
                    </Badge>
                  </TableCell>
                </TableRow>
              )}

              {/* Discharge Flow */}
              {isSensorKeyEnabled("flowRate") && (
                <TableRow className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="ring-background size-2 rounded-full bg-teal-500 ring-2" />
                      <span className="text-foreground font-bold">
                        Intake Discharge Flow
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-baseline gap-1">
                      <span className="telemetry-val text-foreground text-sm font-black">
                        {latestReading.flowRate.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        L/min
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    Rated 45.0 L/min
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Normal
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CollapsibleContent>
      </Collapsible>

      {/* 7. Alarms Queue & Audit Log Stream */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Active Alarms */}
        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconAlertTriangle className="size-4 text-rose-600" />
                <CardTitle className="text-foreground text-sm font-bold">
                  Active Alarms Queue ({activeAlerts.length})
                </CardTitle>
              </div>
              <Link
                to="/alerts"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "xs" }),
                  "h-6 text-xs font-semibold text-[var(--brand-secondary)]",
                )}
              >
                All Alerts &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {activeAlerts.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-xs">
                <IconCheck className="mx-auto mb-1.5 size-5 text-emerald-600" />
                <span>
                  All parameters operating within safe tolerance boundaries.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeAlerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    variant={
                      alert.severity === "CRITICAL" ? "destructive" : "default"
                    }
                    className="p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              alert.severity === "CRITICAL"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px] font-bold"
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-foreground text-xs font-bold">
                            {alert.type}
                          </span>
                        </div>
                        <AlertDescription className="text-foreground text-xs">
                          {alert.message}
                        </AlertDescription>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>

                      {alert.status === "UNREAD" && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={
                            role === "VIEWER" || acknowledgingId === alert.id
                          }
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="shrink-0 text-[11px] font-bold"
                        >
                          {acknowledgingId === alert.id
                            ? "Saving..."
                            : "Acknowledge"}
                        </Button>
                      )}
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log Stream */}
        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconActivity className="size-4 text-[var(--brand-secondary)]" />
                <CardTitle className="text-foreground text-sm font-bold">
                  Operational Event Audit Log
                </CardTitle>
              </div>
              <Link
                to="/alerts"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "xs" }),
                  "h-6 text-xs font-semibold text-[var(--brand-secondary)]",
                )}
              >
                Full History &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            {recentEvents.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-xs">
                No recent system events logged.
              </div>
            ) : (
              <div className="divide-border/60 divide-y">
                {recentEvents.slice(0, 5).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${
                          evt.severity === "CRITICAL"
                            ? "bg-rose-500"
                            : evt.severity === "WARNING"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                      />
                      <span className="text-foreground font-bold">
                        {evt.type}:
                      </span>
                      <span className="text-muted-foreground truncate">
                        {evt.message}
                      </span>
                    </div>
                    <span className="telemetry-val text-muted-foreground shrink-0 text-[11px]">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
