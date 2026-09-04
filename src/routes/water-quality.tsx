import { IconLoader2 } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { WaterQualityChannelChart } from "../components/charts/WaterQualityChannelChart";
import { WaterQualityRadarChart } from "../components/charts/WaterQualityRadarChart";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import { FEATURES, isSensorKeyEnabled } from "../lib/feature-flags";
import type {
  WaterQualityHistoryPoint,
  WaterQualityReading,
} from "../lib/types";
import { useSSE } from "../lib/use-sse";

export const Route = createFileRoute("/water-quality")({
  component: WaterQualityPage,
});

function WaterQualityPage() {
  const { activeSiteId, token } = useAuth();
  const [currentReading, setCurrentReading] =
    useState<WaterQualityReading | null>(null);
  const [history, setHistory] = useState<Array<WaterQualityHistoryPoint>>([]);
  const [selectedParam, setSelectedParam] = useState<keyof WaterQualityReading>(
    FEATURES.ALL_SENSORS ? "ph" : "turbidity",
  );
  const [interval, setInterval] = useState<string>("5m");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useSSE({
    siteId: activeSiteId,
    token,
    onEvent: (type, eventData: any) => {
      if (type === "water-quality.updated" && eventData?.reading) {
        setCurrentReading(eventData.reading);
      }
    },
  });

  useEffect(() => {
    const siteId = activeSiteId ?? "00000000-0000-0000-0000-000000000001";
    setIsLoading(true);

    Promise.all([
      api.getWaterQualityCurrent(siteId),
      api.getWaterQualityHistory(siteId, { interval }),
    ])
      .then(([curr, hist]) => {
        setCurrentReading(curr.reading);
        setHistory(hist);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));

    const pollId = window.setInterval(() => {
      api
        .getWaterQualityCurrent(siteId)
        .then((curr) => {
          setCurrentReading(curr.reading);
        })
        .catch(() => {});
    }, 3000);

    return () => window.clearInterval(pollId);
  }, [activeSiteId, interval]);

  const paramConfig: Record<
    keyof WaterQualityReading,
    {
      label: string;
      unit: string;
      description: string;
      role: string;
      safeMin?: number;
      safeMax?: number;
      whoStandard: string;
    }
  > = {
    ph: {
      label: "pH Level",
      unit: "pH",
      description: "Hydrogen-ion activity / Acidity vs Alkalinity balance",
      role: "Core Potability & Corrosion Metric",
      safeMin: 6.5,
      safeMax: 8.5,
      whoStandard: "6.5 – 8.5 (IS 10500:2012)",
    },
    turbidity: {
      label: "Turbidity",
      unit: "NTU",
      description: "Suspended colloidal matter & silt optical clarity",
      role: "Sediment Filtration Effectiveness",
      safeMax: 5.0,
      whoStandard: "Max 5.0 NTU (IS 10500:2012)",
    },
    heavyMetals: {
      label: "Heavy Metals Concentration",
      unit: "ppm",
      description: "Lead, Cadmium, Arsenic & industrial chemical pollutants",
      role: "Toxicological Safety Gate",
      safeMax: 0.1,
      whoStandard: "Max 0.10 ppm (Toxic Action Limit)",
    },
    dissolvedOxygen: {
      label: "Dissolved Oxygen (DO)",
      unit: "mg/L",
      description: "Dissolved oxygen saturation for microbial resistance",
      role: "Biological Freshness Indicator",
      safeMin: 6.5,
      whoStandard: "> 6.5 mg/L (Potable Freshness)",
    },
    tds: {
      label: "Total Dissolved Solids (TDS)",
      unit: "ppm",
      description: "Inorganic mineral salts and dissolved chemical species",
      role: "Mineralization & Salinity Indicator",
      safeMax: 500,
      whoStandard: "Max 500 ppm (IS 10500:2012)",
    },
    electricalConductivity: {
      label: "Electrical Conductivity (EC)",
      unit: "µS/cm",
      description: "Total ionic concentration in fluid pathway",
      role: "Dissolved Ionic Mobility",
      whoStandard: "Observational (< 1000 µS/cm)",
    },
    temperature: {
      label: "Water Temperature",
      unit: "°C",
      description: "Fluid temperature influencing gas and mineral solubility",
      role: "Physical Baseline Calibration",
      safeMin: 15.0,
      safeMax: 35.0,
      whoStandard: "15.0 – 35.0 °C (Ambient Potable)",
    },
    flowRate: {
      label: "Discharge Flow Rate",
      unit: "L/min",
      description: "Volumetric flow rate entering treatment pipeline",
      role: "Hydraulic Mass-Balance Input",
      safeMin: 30.0,
      safeMax: 50.0,
      whoStandard: "45.0 L/min (Design Rating)",
    },
    hardness: {
      label: "Total Hardness",
      unit: "mg/L",
      description: "Calcium and Magnesium carbonate mineral concentration",
      role: "Mineral Scaling & Palatability",
      safeMax: 300,
      whoStandard: "Max 300 mg/L as CaCO₃",
    },
  };

  const activeParamKeys = (
    Object.keys(paramConfig) as Array<keyof WaterQualityReading>
  ).filter((key) => isSensorKeyEnabled(key));

  const [hoveredPoint, setHoveredPoint] = useState<{
    value: number;
    timestamp: string;
    timeStr: string;
  } | null>(null);

  useEffect(() => {
    setHoveredPoint(null);
  }, [selectedParam]);

  const selectedMeta = paramConfig[selectedParam];
  const isHovered = hoveredPoint !== null;
  const displayedValue = isHovered
    ? hoveredPoint.value
    : currentReading
      ? currentReading[selectedParam]
      : null;

  const isSelectedOutOfRange =
    displayedValue !== null &&
    ((selectedMeta.safeMin !== undefined &&
      displayedValue < selectedMeta.safeMin) ||
      (selectedMeta.safeMax !== undefined &&
        displayedValue > selectedMeta.safeMax));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div>
          <h1 className="font-display text-foreground text-lg font-extrabold tracking-tight">
            Water Quality Telemetry & Evidence Registry
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Continuous analytical evidence supporting the Quality Gate decision
            and water potability index
          </p>
        </div>

        {/* Time Window Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs font-semibold">
            Window:
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

      {/* 1. Parameter Inspector & Time-Series Hub */}
      <Card className="shadow-2xs">
        <CardHeader className="p-4 pb-3">
          <div className="border-border/60 flex flex-wrap items-center gap-1.5 border-b pb-3">
            <span className="text-muted-foreground mr-2 text-xs font-bold tracking-wider uppercase">
              Channels:
            </span>
            {activeParamKeys.map((key) => (
              <Button
                key={key}
                variant={selectedParam === key ? "default" : "ghost"}
                size="xs"
                onClick={() => setSelectedParam(key)}
                className="h-7 text-xs font-semibold"
              >
                {paramConfig[key].label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
            {/* Selected Parameter Details */}
            <div className="space-y-3 lg:col-span-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-foreground text-lg font-bold">
                  {selectedMeta.label}
                </h2>
                {isHovered && (
                  <Badge
                    variant="outline"
                    className="animate-pulse border-[var(--brand-secondary)]/50 bg-[var(--brand-secondary)]/10 text-[10px] font-bold text-[var(--brand-secondary)]"
                  >
                    ● Point {hoveredPoint.timeStr}
                  </Badge>
                )}
                <Badge
                  variant={isSelectedOutOfRange ? "destructive" : "default"}
                  className={
                    !isSelectedOutOfRange
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                      : ""
                  }
                >
                  {isSelectedOutOfRange ? "Exceeded Limit" : "Nominal / Safe"}
                </Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="telemetry-val text-foreground text-5xl font-black transition-all">
                  {displayedValue !== null
                    ? displayedValue.toFixed(
                        selectedParam === "heavyMetals" ? 4 : 2,
                      )
                    : "–"}
                </span>
                <span className="text-muted-foreground text-base font-semibold">
                  {selectedMeta.unit}
                </span>
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed">
                {selectedMeta.description}
              </p>

              <Separator />

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">WHO Standard:</span>
                  <span className="text-foreground font-semibold">
                    {selectedMeta.whoStandard}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Channel Role:</span>
                  <span className="text-foreground font-medium">
                    {selectedMeta.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Time-Series Graph */}
            <div className="lg:col-span-8">
              {isLoading ? (
                <div className="text-muted-foreground border-border/80 bg-muted/30 flex h-64 items-center justify-center gap-2 rounded-xl border text-xs">
                  <IconLoader2 className="size-4 animate-spin text-[var(--brand-secondary)]" />
                  <span>Querying InfluxDB time-series...</span>
                </div>
              ) : (
                <WaterQualityChannelChart
                  history={history}
                  selectedParam={selectedParam}
                  paramMeta={selectedMeta}
                  currentValue={
                    currentReading ? currentReading[selectedParam] : undefined
                  }
                  onHoverChange={setHoveredPoint}
                  className="border-border/80 bg-muted/20 shadow-2xs"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1.5 Multi-Parameter Potability Compliance Radar (Full Sensor Suite) */}
      {FEATURES.ALL_SENSORS && (
        <WaterQualityRadarChart
          reading={currentReading}
          className="shadow-2xs"
        />
      )}

      {/* 2. Comprehensive Regulatory Compliance Registry */}
      <Card className="shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-sm font-bold">
                {FEATURES.ALL_SENSORS
                  ? "Comprehensive Potability Compliance Registry (9 Channels)"
                  : "Active Prototype Sensor Registry (Node Zero)"}
              </CardTitle>
              <CardDescription className="text-xs">
                {FEATURES.ALL_SENSORS
                  ? "Verified continuously against World Health Organization & Indian Standard IS 10500:2012"
                  : "Calibrated physical sensor telemetry active on prototype node at IIIT-Delhi"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground hidden text-xs sm:inline">
                Click any row to inspect historical trend
              </span>
              <Badge variant="outline" className="text-xs font-semibold">
                {activeParamKeys.length}/{activeParamKeys.length} Active Probes
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Parameter Channel</TableHead>
                <TableHead className="w-[180px]">Current Reading</TableHead>
                <TableHead className="w-[220px]">Permissible Range</TableHead>
                <TableHead>Standard Limit</TableHead>
                <TableHead className="w-[120px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeParamKeys.map((key) => {
                const cfg = paramConfig[key];
                const val = currentReading ? currentReading[key] : null;
                const isViolation =
                  val !== null &&
                  ((cfg.safeMin !== undefined && val < cfg.safeMin) ||
                    (cfg.safeMax !== undefined && val > cfg.safeMax));
                const isSelected = selectedParam === key;

                const channelColor =
                  key === "ph"
                    ? "#10b981"
                    : key === "turbidity"
                      ? "#06b6d4"
                      : key === "heavyMetals"
                        ? "#ef4444"
                        : key === "dissolvedOxygen"
                          ? "#8b5cf6"
                          : key === "tds"
                            ? "#f59e0b"
                            : key === "electricalConductivity"
                              ? "#3b82f6"
                              : key === "temperature"
                                ? "#f97316"
                                : key === "flowRate"
                                  ? "#14b8a6"
                                  : "#a855f7";

                return (
                  <TableRow
                    key={key}
                    onClick={() => setSelectedParam(key)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-muted/70 font-semibold shadow-xs"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="ring-background size-2.5 shrink-0 rounded-full ring-2"
                          style={{ backgroundColor: channelColor }}
                        />
                        <div>
                          <span className="text-foreground block leading-tight font-bold">
                            {cfg.label}
                          </span>
                          <span className="text-muted-foreground text-[11px] font-normal">
                            {cfg.role}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-baseline gap-1.5">
                        <span className="telemetry-val text-foreground text-sm font-black">
                          {val !== null ? val.toFixed(2) : "–"}
                        </span>
                        <span className="text-muted-foreground text-xs font-medium">
                          {cfg.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="border-border/60 bg-muted/40 text-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
                        {cfg.safeMin !== undefined && cfg.safeMax !== undefined
                          ? `${cfg.safeMin} – ${cfg.safeMax} ${cfg.unit}`
                          : cfg.safeMax !== undefined
                            ? `Max ${cfg.safeMax} ${cfg.unit}`
                            : "Observational"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {cfg.whoStandard}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={isViolation ? "destructive" : "outline"}
                        className={
                          !isViolation
                            ? "border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                            : "font-semibold"
                        }
                      >
                        <span
                          className={`mr-1.5 size-1.5 rounded-full ${
                            !isViolation
                              ? "animate-pulse bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        />
                        {isViolation ? "Exceeded" : "Normal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
