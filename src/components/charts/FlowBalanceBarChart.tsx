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
  inletFlowRate: {
    label: "Intake Flow (F1)",
    color: "#06b6d4", // Electric Cyan
  },
  outletFlowRate: {
    label: "Distribution Flow (F2)",
    color: "#10b981", // Bright Emerald
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
          inletFlowRate: Number(point.inletFlowRate.toFixed(1)),
          outletFlowRate: Number(point.outletFlowRate.toFixed(1)),
          diff: Number(point.differencePercent.toFixed(1)),
        };
      });
    }

    // Default 6 sequential flow intervals
    const baseIn = flow?.inletFlowRate ?? 42.5;
    const baseOut = flow?.outletFlowRate ?? (isLeak ? 28.0 : 42.5);
    const points = [];
    const now = Date.now();

    for (let i = 5; i >= 0; i--) {
      const t = new Date(now - i * 90 * 1000);
      const timeStr = `${t.getHours().toString().padStart(2, "0")}:${t.getMinutes().toString().padStart(2, "0")}`;
      const noise = i === 0 && isLeak ? -14.5 : Math.sin(i) * 0.4;
      const outVal = i === 0 && isLeak ? baseOut : baseIn + noise;
      const diffVal = Number(
        Math.abs(((baseIn - outVal) / baseIn) * 100).toFixed(1),
      );

      points.push({
        time: timeStr,
        inletFlowRate: Number(baseIn.toFixed(1)),
        outletFlowRate: Number(outVal.toFixed(1)),
        diff: diffVal,
      });
    }

    return points;
  }, [history, flow, isLeak]);

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  isLeak
                    ? "animate-ping bg-red-500"
                    : "animate-pulse bg-cyan-500"
                }`}
              />
              <CardTitle className="text-foreground text-sm font-bold">
                Hydraulic Mass-Balance & Differential Leak Detection
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous dual Hall-effect turbine differential monitoring ($F_1$
              vs $F_2$) with automated 15.0% trip isolation
            </CardDescription>
          </div>

          <Badge
            variant="outline"
            className={
              isLeak
                ? "border-red-500/40 bg-red-500/10 font-bold text-red-700 dark:text-red-400"
                : "border-cyan-500/40 bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-400"
            }
          >
            {isLeak
              ? "⚠ PIPELINE LEAK DETECTED"
              : "✔ HYDRAULIC INTEGRITY INTACT"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 pt-2 sm:p-5 sm:pt-2">
        {/* Differential Discrepancy Meter */}
        <div className="border-border/70 bg-muted/30 rounded-xl border p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-semibold">
              Current Differential Mismatch:
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-extrabold ${
                  isLeak ? "text-red-600 dark:text-red-400" : "text-foreground"
                }`}
              >
                {currentDiff.toFixed(1)}%
              </span>
              <span className="text-muted-foreground text-[10px]">
                / 15.0% Trip Threshold
              </span>
            </div>
          </div>
          <Progress
            value={Math.min(100, (currentDiff / 15.0) * 100)}
            className="mt-2 h-2.5 w-full"
            indicatorClassName={
              isLeak
                ? "bg-red-500"
                : currentDiff > 8.0
                  ? "bg-amber-500"
                  : "bg-cyan-500"
            }
          />
        </div>

        {/* Bar Chart comparing F1 vs F2 */}
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
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
            <ChartTooltip content={<ChartTooltipContent />} />

            <ReferenceLine y={0} stroke="var(--border)" />

            <Bar
              dataKey="inletFlowRate"
              name="Intake F1 (L/min)"
              fill="#06b6d4"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="outletFlowRate"
              name="Distribution F2 (L/min)"
              fill={isLeak ? "#ef4444" : "#10b981"}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>

        {/* Quick Diagnostics Footer */}
        <div className="border-border/60 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
          <div className="bg-muted/40 rounded-lg p-2">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">
              Intake Flow F1
            </span>
            <span className="text-foreground text-xs font-extrabold text-[#06b6d4]">
              {(flow?.inletFlowRate ?? 42.5).toFixed(1)} L/min
            </span>
          </div>

          <div className="bg-muted/40 rounded-lg p-2">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">
              Distribution F2
            </span>
            <span
              className={`text-xs font-extrabold ${
                isLeak ? "text-red-500" : "text-[#10b981]"
              }`}
            >
              {(flow?.outletFlowRate ?? 42.5).toFixed(1)} L/min
            </span>
          </div>

          <div className="bg-muted/40 rounded-lg p-2">
            <span className="text-muted-foreground block text-[10px] font-bold uppercase">
              Isolation Valve
            </span>
            <span
              className={`text-xs font-extrabold ${
                (flow?.valveStatus ?? "OPEN") === "OPEN"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {flow?.valveStatus ?? "OPEN"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
