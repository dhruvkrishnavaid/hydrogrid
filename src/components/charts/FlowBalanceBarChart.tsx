import * as React from "react";
import {
  Bar,
  BarChart,
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
import { Progress } from "@/components/ui/progress";
import type { FlowHistoryPoint, FlowStatus } from "@/lib/types";

interface FlowBalanceBarChartProps {
  flow?: FlowStatus;
  history?: Array<FlowHistoryPoint>;
  className?: string;
}

const chartConfig = {
  flowRate: {
    label: "Measured Flow (L/min)",
    color: "#06b6d4", // Electric Cyan
  },
  nominalFlowRate: {
    label: "Rated Baseline (45.0 L/min)",
    color: "#f59e0b", // Amber
  },
} satisfies ChartConfig;

export function FlowBalanceBarChart({
  flow,
  history = [],
  className,
}: FlowBalanceBarChartProps) {
  const currentDiff =
    flow?.mismatchPercent ?? (flow as any)?.differencePercent ?? 0.0;
  const isLeak = flow?.leakStatus === "LEAK_DETECTED" || currentDiff >= 15.0;

  // Prepare recent comparison samples
  const chartData = React.useMemo(() => {
    if (history.length >= 4) {
      return history.slice(-8).map((point) => {
        const d = new Date(point.timestamp);
        return {
          time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
          flowRate: Number(point.flowRate.toFixed(1)),
          nominalFlowRate: 45.0,
          diff: Number(point.differencePercent.toFixed(1)),
        };
      });
    }

    // Default 6 sequential flow intervals
    const baseFlow = flow?.flowRate ?? 45.0;
    const points = [];
    const now = Date.now();

    for (let i = 5; i >= 0; i--) {
      const t = new Date(now - i * 90 * 1000);
      const timeStr = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
      const noise = i === 0 && isLeak ? -13.5 : Math.sin(i) * 0.4;
      const fVal = i === 0 ? baseFlow : 45.0 + noise;
      const diffVal = Number(Math.abs(((45.0 - fVal) / 45.0) * 100).toFixed(1));

      points.push({
        time: timeStr,
        flowRate: Number(fVal.toFixed(1)),
        nominalFlowRate: 45.0,
        diff: diffVal,
      });
    }

    return points;
  }, [history, flow, isLeak]);

  const [hoveredPoint, setHoveredPoint] = React.useState<{
    time: string;
    flowRate: number;
    nominalFlowRate: number;
    diff: number;
  } | null>(null);

  const lastHoveredRef = React.useRef<string | null>(null);

  const handleHoverSync = React.useCallback(
    (
      pt: {
        time: string;
        flowRate: number;
        nominalFlowRate: number;
        diff: number;
      } | null,
    ) => {
      const key = pt ? pt.time : null;
      if (lastHoveredRef.current === key) return;
      lastHoveredRef.current = key;
      setHoveredPoint(pt);
    },
    [],
  );

  const isHovered = hoveredPoint !== null;
  const dispDiff = isHovered ? hoveredPoint.diff : currentDiff;
  const dispFlow = isHovered ? hoveredPoint.flowRate : (flow?.flowRate ?? 45.0);
  const dispNominal = 45.0;
  const dispIsLeak = dispDiff >= 15.0;

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
                    : "animate-pulse bg-cyan-500"
                }`}
              />
              <CardTitle className="text-foreground text-sm font-bold">
                Hydraulic Flow Rate vs Rated Baseline
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous baseline differential monitoring (Node Zero vs 45.0
              L/min rated design) with automated 15.0% trip isolation
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className={
              dispIsLeak
                ? "border-red-500/40 bg-red-500/10 font-bold text-red-700 dark:text-red-400"
                : "border-cyan-500/40 bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-400"
            }
          >
            {dispIsLeak
              ? "⚠ PIPELINE FLOW DROP DETECTED"
              : "✔ HYDRAULIC INTEGRITY INTACT"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-2 sm:p-5 sm:pt-2">
        {/* Differential Discrepancy Meter */}
        <div
          className={`rounded-xl border p-3 transition-colors ${
            isHovered
              ? "border-[var(--brand-secondary)]/50 bg-[var(--brand-secondary)]/5 ring-1 ring-[var(--brand-secondary)]/30"
              : "border-border/70 bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground flex items-center gap-1.5 font-semibold">
              {isHovered ? (
                <>
                  <span className="size-1.5 animate-pulse rounded-full bg-cyan-500" />
                  Baseline Mismatch ({hoveredPoint.time}):
                </>
              ) : (
                "Current Baseline Mismatch:"
              )}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`telemetry-val text-sm font-extrabold ${
                  dispIsLeak
                    ? "text-red-600 dark:text-red-400"
                    : dispDiff >= 6.0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {dispDiff.toFixed(1)}%
              </span>
              <span className="text-muted-foreground text-[10px]">
                / 15.0% Trip Threshold
              </span>
            </div>
          </div>
          <Progress
            value={Math.min(100, (dispDiff / 15.0) * 100)}
            className="mt-2 h-2.5 w-full"
            indicatorClassName={
              dispIsLeak
                ? "bg-red-500"
                : dispDiff > 8.0
                  ? "bg-amber-500"
                  : "bg-cyan-500"
            }
          />
        </div>

        {/* Bar Chart comparing Flow vs Rated Baseline */}
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
            barGap={4}
            barCategoryGap="25%"
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
                  flowRate: Number(p.flowRate),
                  nominalFlowRate: Number(p.nominalFlowRate ?? 45.0),
                  diff: Number(p.diff),
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
              className="stroke-border/40"
            />
            <XAxis
              dataKey="time"
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              stroke="#888888"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, 60]}
              tickMargin={8}
              className="fill-muted-foreground text-[11px] font-medium"
            />
            <ChartTooltip content={<ChartTooltipContent />} />

            <ReferenceLine y={0} stroke="var(--border)" />

            <Bar
              dataKey="flowRate"
              name="Measured Flow (Node Zero)"
              fill="#06b6d4"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="nominalFlowRate"
              name="Rated Baseline (45.0 L/min)"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>

        {/* Quick Diagnostics Footer */}
        <div className="border-border/60 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
          <div className="bg-muted/40 rounded-lg p-2">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">
              {isHovered ? `Measured (${hoveredPoint.time})` : "Measured Flow"}
            </span>
            <span className="telemetry-val text-xs font-extrabold text-[#06b6d4]">
              {dispFlow.toFixed(1)} L/min
            </span>
          </div>

          <div className="bg-muted/40 rounded-lg p-2">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">
              Rated Baseline
            </span>
            <span className="telemetry-val text-xs font-extrabold text-[#f59e0b]">
              {dispNominal.toFixed(1)} L/min
            </span>
          </div>

          <div className="bg-muted/40 rounded-lg p-2">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">
              Isolation Valve
            </span>
            <span
              className={`telemetry-val text-xs font-extrabold ${
                !dispIsLeak
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {dispIsLeak ? "CLOSED" : (flow?.valveStatus ?? "OPEN")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
