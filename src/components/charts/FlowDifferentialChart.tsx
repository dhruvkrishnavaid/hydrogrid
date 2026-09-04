import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
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

import type { FlowHistoryPoint } from "../../lib/types";

interface FlowDifferentialChartProps {
  history: Array<FlowHistoryPoint>;
  currentMismatch?: number;
  isLeak?: boolean;
  onHoverChange?: (
    point: {
      flowRate: number;
      difference: number;
      time: string;
      timestamp: string;
    } | null,
  ) => void;
  className?: string;
}

export function FlowDifferentialChart({
  history,
  currentMismatch: _currentMismatch = 0.0,
  isLeak = false,
  onHoverChange,
  className,
}: FlowDifferentialChartProps) {
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    time: string;
    mismatch: number;
  } | null>(null);

  const lastHoveredRef = React.useRef<string | null>(null);

  const handleHoverSync = React.useCallback(
    (
      pt: {
        flowRate: number;
        difference: number;
        time: string;
        timestamp: string;
      } | null,
    ) => {
      const key = pt ? `${pt.time}-${pt.timestamp}` : null;
      if (lastHoveredRef.current === key) return;
      lastHoveredRef.current = key;
      setHoveredPoint(pt ? { time: pt.time, mismatch: pt.difference } : null);
      onHoverChange?.(pt);
    },
    [onHoverChange],
  );

  const chartConfig = {
    mismatch: {
      label: "Mismatch Differential (%)",
      color: "#10b981",
    },
  } satisfies ChartConfig;

  const chartData = (history.length > 0 ? history : []).map((point) => {
    const d = new Date(point.timestamp);
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const val = Number(point.differencePercent.toFixed(1));
    return {
      time: timeStr,
      timestamp: point.timestamp,
      flowRate: Number(point.flowRate.toFixed(1)),
      difference: val,
      mismatch: val,
      color: val >= 15.0 ? "#ef4444" : val >= 6.0 ? "#f59e0b" : "#10b981",
    };
  });

  const isHovered = hoveredPoint !== null;
  const dispMismatch = isHovered ? hoveredPoint.mismatch : _currentMismatch;
  const dispIsLeak = dispMismatch >= 15.0 || isLeak;

  return (
    <Card
      className={className}
      onMouseLeave={() => {
        handleHoverSync(null);
      }}
    >
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  dispIsLeak
                    ? "animate-ping bg-red-500"
                    : "animate-pulse bg-emerald-500"
                }`}
              />
              <CardTitle className="text-foreground text-sm font-bold">
                Surge Differential & Automated Trip Envelope
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Surge calculation: Flow &gt; 45.0 L/min assumed leak condition
              (Lower flow is not a leak threat)
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`rounded-lg border px-2.5 py-1 text-right transition-colors ${
                isHovered
                  ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-border/80 bg-muted/40"
              }`}
            >
              <span className="text-muted-foreground flex items-center justify-end gap-1 text-[9px] font-bold uppercase">
                {isHovered ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                    Mismatch ({hoveredPoint.time})
                  </>
                ) : (
                  "Current Mismatch"
                )}
              </span>
              <span
                className={`telemetry-val font-black ${
                  dispMismatch >= 15.0
                    ? "text-red-600 dark:text-red-400"
                    : dispMismatch >= 6.0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {dispMismatch.toFixed(1)}%
              </span>
            </div>

            <Badge
              variant={dispIsLeak ? "destructive" : "outline"}
              className={
                !dispIsLeak
                  ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
                  : "text-[10px] font-bold"
              }
            >
              {dispIsLeak
                ? "⚠ PIPELINE BREACH DETECTED"
                : "✓ INTEGRITY INTACT (< 15.0%)"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onMouseMove={(state: any) => {
              const idx =
                typeof state?.activeTooltipIndex === "number"
                  ? state.activeTooltipIndex
                  : typeof state?.activeIndex === "number"
                    ? state.activeIndex
                    : -1;
              const p =
                (state?.activePayload && state.activePayload[0]?.payload) ||
                (idx >= 0 && idx < chartData.length ? chartData[idx] : null);

              if (p) {
                handleHoverSync({
                  time: String(p.time),
                  timestamp: String(p.timestamp),
                  flowRate: Number(p.flowRate ?? 45.0),
                  difference: Number(p.difference ?? p.mismatch ?? 0.0),
                });
              }
            }}
            onMouseLeave={() => {
              handleHoverSync(null);
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/50"
            />
            <XAxis
              dataKey="time"
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, 20]}
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(val: any, _: any, item: any) => (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4 font-bold">
                        <span>Differential Mismatch:</span>
                        <span
                          className="telemetry-val"
                          style={{ color: item?.payload?.color }}
                        >
                          {val}%
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        Safe Threshold: &lt; 15.0%
                      </div>
                    </div>
                  )}
                />
              }
            />
            <ReferenceLine
              y={15.0}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: "15.0% Emergency Trip Threshold",
                fill: "#ef4444",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
            <Bar dataKey="mismatch" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Legend */}
        <div className="border-border/60 mt-3 flex flex-wrap items-center justify-center gap-5 border-t pt-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#10b981]" />
            <span className="text-muted-foreground">
              Nominal Flow (&lt; 6.0%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-muted-foreground">
              Hydraulic Drift (6.0% – 15.0%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-muted-foreground font-bold text-rose-600 dark:text-rose-400">
              Trip Lockdown (&gt; 15.0%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
