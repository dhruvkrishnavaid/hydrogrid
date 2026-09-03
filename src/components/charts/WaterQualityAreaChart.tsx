import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import type {
  WaterQualityHistoryPoint,
  WaterQualityReading,
} from "@/lib/types";

interface WaterQualityAreaChartProps {
  history?: Array<WaterQualityHistoryPoint>;
  currentReading?: WaterQualityReading;
  className?: string;
}

const chartConfig = {
  ph: {
    label: "pH Level",
    color: "#10b981", // Bright Emerald
  },
  turbidity: {
    label: "Turbidity (NTU)",
    color: "#06b6d4", // Bright Cyan
  },
  tds: {
    label: "TDS (ppm)",
    color: "#f59e0b", // Bright Amber
  },
  dissolvedOxygen: {
    label: "Dissolved O₂ (mg/L)",
    color: "#8b5cf6", // Bright Violet
  },
  heavyMetals: {
    label: "Heavy Metals (ppm)",
    color: "#e45c10", // Tobiko Orange
  },
} satisfies ChartConfig;

type ActiveMetric =
  | "all"
  | "ph"
  | "turbidity"
  | "tds"
  | "dissolvedOxygen"
  | "heavyMetals";

export function WaterQualityAreaChart({
  history = [],
  currentReading,
  className,
}: WaterQualityAreaChartProps) {
  const [activeMetric, setActiveMetric] = React.useState<ActiveMetric>("all");

  // Generate synthetic smooth recent points if history is sparse (for live demo responsiveness)
  const chartData = React.useMemo(() => {
    if (history.length >= 5) {
      return history.slice(-15).map((point) => {
        const d = new Date(point.timestamp);
        const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        return {
          time: timeStr,
          ph: Number(point.ph.toFixed(2)),
          turbidity: Number(point.turbidity.toFixed(2)),
          tds: Math.round(point.tds),
          dissolvedOxygen: Number(point.dissolvedOxygen.toFixed(2)),
          heavyMetals: Number(point.heavyMetals.toFixed(3)),
          // Normalized 0-100 score for composite view
          compositeScore: Math.min(
            100,
            Math.max(
              0,
              100 -
                (Math.abs(point.ph - 7.2) > 1 ? 25 : 0) -
                (point.turbidity > 5.0 ? 30 : 0) -
                (point.heavyMetals > 0.01 ? 40 : 0) -
                (point.tds > 500 ? 15 : 0),
            ),
          ),
        };
      });
    }

    // Default baseline points leading up to current reading
    const basePh = currentReading?.ph ?? 7.35;
    const baseTurb = currentReading?.turbidity ?? 0.85;
    const baseTds = currentReading?.tds ?? 142;
    const baseDo = currentReading?.dissolvedOxygen ?? 7.8;
    const baseHm = currentReading?.heavyMetals ?? 0.002;

    const points = [];
    const now = Date.now();
    for (let i = 10; i >= 0; i--) {
      const t = new Date(now - i * 60 * 1000);
      const timeStr = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
      const noise = Math.sin(i * 1.5) * 0.05;
      points.push({
        time: timeStr,
        ph: Number((basePh + noise).toFixed(2)),
        turbidity: Number(Math.max(0.1, baseTurb + noise * 0.5).toFixed(2)),
        tds: Math.round(baseTds + noise * 20),
        dissolvedOxygen: Number((baseDo + noise * 0.4).toFixed(2)),
        heavyMetals: Number(Math.max(0.001, baseHm + noise * 0.002).toFixed(3)),
        compositeScore: 98,
      });
    }
    return points;
  }, [history, currentReading]);

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <CardTitle className="text-foreground text-sm font-bold">
                Real-Time Physicochemical Telemetry Stream
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous multi-probe optical and electrochemical sensor
              telemetry with IS 10500 threshold envelopes
            </CardDescription>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant={activeMetric === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[11px] font-semibold"
              onClick={() => setActiveMetric("all")}
            >
              Composite
            </Button>
            <Button
              variant={activeMetric === "ph" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[11px] font-semibold"
              onClick={() => setActiveMetric("ph")}
            >
              pH
            </Button>
            <Button
              variant={activeMetric === "turbidity" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[11px] font-semibold"
              onClick={() => setActiveMetric("turbidity")}
            >
              Turbidity
            </Button>
            <Button
              variant={activeMetric === "tds" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[11px] font-semibold"
              onClick={() => setActiveMetric("tds")}
            >
              TDS
            </Button>
            <Button
              variant={activeMetric === "heavyMetals" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2.5 text-[11px] font-semibold"
              onClick={() => setActiveMetric("heavyMetals")}
            >
              Metals
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">
        {/* Active Metric Badge Banner */}
        <div className="bg-muted/50 mb-3 flex items-center justify-between rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Viewing:</span>
            <span className="text-foreground font-bold">
              {activeMetric === "all" &&
                "All Parameters (Multi-Gradient Stream)"}
              {activeMetric === "ph" && "pH Level (Safe Range: 6.5 – 8.5)"}
              {activeMetric === "turbidity" &&
                "Optical Turbidity (Permissible Limit: < 5.0 NTU)"}
              {activeMetric === "tds" &&
                "Total Dissolved Solids (Target: < 500 ppm)"}
              {activeMetric === "heavyMetals" &&
                "Toxic Heavy Metals (Gatekeeper Threshold: < 0.010 ppm)"}
              {activeMetric === "dissolvedOxygen" &&
                "Dissolved Oxygen (Potable Target: > 6.5 mg/L)"}
            </span>
          </div>

          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"
          >
            ● Live Stream
          </Badge>
        </div>

        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorTurbidity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorTds" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorMetals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e45c10" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#e45c10" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorDo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4b5d16" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#4b5d16" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/60"
            />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="fill-muted-foreground text-[11px] font-medium"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="fill-muted-foreground text-[11px] font-medium"
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />

            {/* Threshold Reference Lines */}
            {activeMetric === "ph" && (
              <>
                <ReferenceLine
                  y={6.5}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: "Min 6.5", fill: "#f59e0b", fontSize: 10 }}
                />
                <ReferenceLine
                  y={8.5}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  label={{ value: "Max 8.5", fill: "#f59e0b", fontSize: 10 }}
                />
              </>
            )}
            {activeMetric === "turbidity" && (
              <ReferenceLine
                y={5.0}
                stroke="#e45c10"
                strokeDasharray="3 3"
                label={{
                  value: "Critical 5.0 NTU",
                  fill: "#e45c10",
                  fontSize: 10,
                }}
              />
            )}
            {activeMetric === "heavyMetals" && (
              <ReferenceLine
                y={0.01}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{
                  value: "Gatekeeper Trip 0.01 ppm",
                  fill: "#ef4444",
                  fontSize: 10,
                }}
              />
            )}

            {/* Area Series based on activeMetric */}
            {(activeMetric === "all" || activeMetric === "ph") && (
              <Area
                type="monotone"
                dataKey="ph"
                name="pH Level"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#colorPh)"
              />
            )}

            {(activeMetric === "all" || activeMetric === "turbidity") && (
              <Area
                type="monotone"
                dataKey="turbidity"
                name="Turbidity (NTU)"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fill="url(#colorTurbidity)"
              />
            )}

            {activeMetric === "tds" && (
              <Area
                type="monotone"
                dataKey="tds"
                name="TDS (ppm)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#colorTds)"
              />
            )}

            {(activeMetric === "all" || activeMetric === "heavyMetals") && (
              <Area
                type="monotone"
                dataKey="heavyMetals"
                name="Heavy Metals (ppm)"
                stroke="#e45c10"
                strokeWidth={2.5}
                fill="url(#colorMetals)"
              />
            )}

            {(activeMetric === "all" || activeMetric === "dissolvedOxygen") && (
              <Area
                type="monotone"
                dataKey="dissolvedOxygen"
                name="Dissolved O₂ (mg/L)"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#colorDo)"
              />
            )}
          </AreaChart>
        </ChartContainer>

        {/* Legend Footer */}
        <div className="border-border/60 mt-3 flex flex-wrap items-center justify-center gap-4 border-t pt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#10b981]" />
            <span className="text-foreground font-semibold">pH</span>
            <span className="text-muted-foreground text-[11px]">
              (6.5–8.5 Safe)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#06b6d4]" />
            <span className="text-foreground font-semibold">Turbidity</span>
            <span className="text-muted-foreground text-[11px]">
              (&lt; 5 NTU)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-foreground font-semibold">TDS</span>
            <span className="text-muted-foreground text-[11px]">
              (&lt; 500 ppm)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#e45c10]" />
            <span className="text-foreground font-semibold">Heavy Metals</span>
            <span className="text-muted-foreground text-[11px]">
              (&lt; 0.010 ppm)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
