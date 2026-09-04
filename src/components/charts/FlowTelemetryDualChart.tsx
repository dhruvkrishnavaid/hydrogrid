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

interface FlowTelemetryDualChartProps {
  history: Array<FlowHistoryPoint>;
  currentFlow?: number;
  nominalFlow?: number;
  onHoverChange?: (
    point: {
      time: string;
      timestamp: string;
      flowRate: number;
      nominalFlowRate: number;
      difference: number;
    } | null,
  ) => void;
  className?: string;
}

export function FlowTelemetryDualChart({
  history,
  currentFlow = 33.0,
  nominalFlow = 45.0,
  onHoverChange,
  className,
}: FlowTelemetryDualChartProps) {
  const chartConfig = {
    flowRate: {
      label: "Node Zero Flow (L/min)",
      color: "#06b6d4", // Cyan
    },
    nominalFlow: {
      label: "Rated Baseline (45.0 L/min)",
      color: "#f59e0b", // Amber
    },
  } satisfies ChartConfig;

  const chartData = (history.length > 0 ? history : []).map((point) => {
    const d = new Date(point.timestamp);
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const flowVal = Number(point.flowRate.toFixed(1));
    return {
      time: timeStr,
      timestamp: point.timestamp,
      flowRate: flowVal,
      nominalFlowRate: nominalFlow,
      difference: Number(Math.abs(nominalFlow - flowVal).toFixed(2)),
      differencePercent: Number(point.differencePercent.toFixed(1)),
    };
  });

  const [hoveredPoint, setHoveredPoint] = React.useState<{
    time: string;
    timestamp: string;
    flowRate: number;
    nominalFlowRate: number;
    difference: number;
  } | null>(null);

  const lastHoveredRef = React.useRef<string | null>(null);

  const handleHoverSync = React.useCallback(
    (
      pt: {
        time: string;
        timestamp: string;
        flowRate: number;
        nominalFlowRate: number;
        difference: number;
      } | null,
    ) => {
      const key = pt ? `${pt.time}-${pt.timestamp}` : null;
      if (lastHoveredRef.current === key) return;
      lastHoveredRef.current = key;
      setHoveredPoint(pt);
      onHoverChange?.(pt);
    },
    [onHoverChange],
  );

  const isHovered = hoveredPoint !== null;
  const latestHistFlow =
    history.length > 0 ? history[history.length - 1].flowRate : currentFlow;
  const dispFlow = isHovered ? hoveredPoint.flowRate : latestHistFlow;
  const dispDelta = isHovered
    ? hoveredPoint.difference
    : Math.abs(nominalFlow - dispFlow);

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
              <span className="size-2 animate-pulse rounded-full bg-cyan-500" />
              <CardTitle className="text-foreground text-sm font-bold">
                Node Zero Hydraulic Flow Telemetry Stream
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold">
                L/min
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Continuous turbine monitoring vs 45.0 L/min nominal rated baseline
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div
              className={`rounded-lg border px-2.5 py-1 text-right transition-colors ${
                isHovered
                  ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "border-border/80 bg-muted/40"
              }`}
            >
              <span className="text-muted-foreground flex items-center justify-end gap-1 text-[9px] font-bold uppercase">
                {isHovered ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-cyan-500" />
                    Measured ({hoveredPoint.time})
                  </>
                ) : (
                  "Node Zero Flow (Q)"
                )}
              </span>
              <span className="telemetry-val font-black text-cyan-600 dark:text-cyan-400">
                {dispFlow.toFixed(1)}{" "}
                <span className="text-muted-foreground text-[9px] font-normal">
                  L/m
                </span>
              </span>
            </div>

            <div className="border-border/80 bg-muted/40 rounded-lg border px-2.5 py-1 text-right">
              <span className="text-muted-foreground block text-[9px] font-bold uppercase">
                Rated Baseline
              </span>
              <span className="telemetry-val text-muted-foreground font-bold">
                {nominalFlow.toFixed(1)}{" "}
                <span className="text-muted-foreground text-[9px] font-normal">
                  L/m
                </span>
              </span>
            </div>

            <div
              className={`rounded-lg border px-2.5 py-1 text-right transition-colors ${
                isHovered
                  ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "border-border/80 bg-muted/40"
              }`}
            >
              <span className="text-muted-foreground block text-[9px] font-bold uppercase">
                {isHovered
                  ? `Baseline Δ (${hoveredPoint.time})`
                  : "Baseline Loss (Δ)"}
              </span>
              <span
                className={`telemetry-val font-black ${
                  dispDelta > 6.75
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {dispDelta.toFixed(1)}{" "}
                <span className="text-muted-foreground text-[9px] font-normal">
                  L/m
                </span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart
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
                  flowRate: Number(p.flowRate),
                  nominalFlowRate: Number(p.nominalFlowRate),
                  difference: Number(p.difference),
                });
              }
            }}
            onMouseLeave={() => {
              handleHoverSync(null);
            }}
          >
            <defs>
              <linearGradient id="grad-flow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

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
              domain={[20, 55]}
              tickFormatter={(v) => `${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_: any, payload: any) => {
                    const item = payload?.[0]?.payload;
                    return item?.timestamp
                      ? new Date(item.timestamp).toLocaleString()
                      : "";
                  }}
                />
              }
            />

            <ReferenceLine
              y={45.0}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "Rated Design (45.0 L/min)",
                position: "insideTopRight",
                fill: "#f59e0b",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            <Area
              type="monotone"
              dataKey="flowRate"
              name="Measured Flow (Node Zero)"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#grad-flow)"
            />
          </AreaChart>
        </ChartContainer>

        {/* Legend */}
        <div className="border-border/60 mt-3 flex items-center justify-center gap-6 border-t pt-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#06b6d4]" />
            <span className="text-muted-foreground">
              Node Zero Turbine Flow Rate (L/min)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-[#f59e0b]" />
            <span className="text-muted-foreground">
              Rated Baseline (45.0 L/min)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
