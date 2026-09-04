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
    difference: {
      label: "Differential from Threshold (± L/min)",
      color: "#10b981",
    },
  } satisfies ChartConfig;

  const chartData = (history.length > 0 ? history : []).map((point) => {
    const d = new Date(point.timestamp);
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    // Mathematical approach directly from flow rate:
    // Trip threshold: 45.0 * 1.05 = 47.25 L/min (+5%)
    // Difference from threshold = 47.25 - flowRate (<0 = leakage, >0 = flow < threshold)
    // Inverted for +- reading scale on the graph: flowRate - 47.25
    const invertedDiff = Number((point.flowRate - 47.25).toFixed(1));
    const isLeakPoint = invertedDiff > 0;
    const isNearLimit = invertedDiff >= -3.0 && invertedDiff <= 0;

    return {
      time: timeStr,
      timestamp: point.timestamp,
      flowRate: Number(point.flowRate.toFixed(1)),
      difference: invertedDiff,
      mismatch: invertedDiff,
      color: isLeakPoint ? "#ef4444" : isNearLimit ? "#f59e0b" : "#10b981",
    };
  });

  const isHovered = hoveredPoint !== null;
  const latestHistPoint =
    history.length > 0 ? history[history.length - 1] : null;
  const latestHistDiff = latestHistPoint
    ? Number((latestHistPoint.flowRate - 47.25).toFixed(1))
    : _currentMismatch;
  const dispMismatch = isHovered ? hoveredPoint.mismatch : latestHistDiff;
  const dispIsLeak = dispMismatch > 0.0 || isLeak;

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
              Mathematical differential: Flow subtracted from 45.0×1.05 (47.25
              L/min). Inverted ± scale (Negative = safe margin, Positive =
              leakage).
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
                    Diff ({hoveredPoint.time})
                  </>
                ) : (
                  "Differential (± Scale)"
                )}
              </span>
              <span
                className={`telemetry-val font-black ${
                  dispMismatch > 0.0
                    ? "text-red-600 dark:text-red-400"
                    : dispMismatch >= -3.0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {dispMismatch > 0
                  ? `+${dispMismatch.toFixed(1)}`
                  : dispMismatch.toFixed(1)}{" "}
                L/min
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
                ? `⚠ PIPELINE BREACH (+${dispMismatch.toFixed(1)} L/min)`
                : `✓ INTEGRITY INTACT (${dispMismatch.toFixed(1)} L/min)`}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 8, bottom: 0 }}
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
              dataKey="timestamp"
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(iso) => {
                const d = new Date(iso);
                return d.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }}
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={54}
              domain={[-25, 10]}
              ticks={[-25, -20, -15, -10, -5, 0, 5, 10]}
              tickFormatter={(v) => `${v > 0 ? `+${v}` : v} L/m`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(val: any, _: any, item: any) => (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4 font-bold">
                        <span>Differential (±):</span>
                        <span
                          className="telemetry-val"
                          style={{ color: item?.payload?.color }}
                        >
                          {Number(val) > 0 ? `+${val}` : val} L/min
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        Flow: {item?.payload?.flowRate} L/min | Trip Limit:
                        47.25 L/min (45.0 + 5%)
                      </div>
                    </div>
                  )}
                />
              }
            />
            <ReferenceLine
              y={0}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: "0.0 L/min Trip Threshold (47.25 L/min)",
                fill: "#ef4444",
                fontSize: 10,
                position: "insideTopLeft",
              }}
            />
            <Bar dataKey="difference" radius={[2, 2, 2, 2]} minPointSize={2}>
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
              Nominal Flow (&lt; -3.0 L/min Margin)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-muted-foreground">
              Hydraulic Drift (-3.0 to 0.0 L/min Margin)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ef4444]" />
            <span className="text-muted-foreground font-bold text-rose-600 dark:text-rose-400">
              Trip Lockdown (&gt; 0.0 L/min Surge Breach)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
