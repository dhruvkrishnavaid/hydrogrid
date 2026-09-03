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
  className?: string;
}

export function FlowDifferentialChart({
  history,
  currentMismatch: _currentMismatch = 0.0,
  isLeak = false,
  className,
}: FlowDifferentialChartProps) {
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
      mismatch: val,
      color: val >= 15.0 ? "#ef4444" : val >= 6.0 ? "#f59e0b" : "#10b981",
    };
  });

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
                    : "animate-pulse bg-emerald-500"
                }`}
              />
              <CardTitle className="text-foreground text-sm font-bold">
                Mass-Balance Differential & Automated Trip Envelope
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous differential calculation |Q₁ - Q₂| / Q₁ × 100% against
              the 15.0% trip threshold
            </CardDescription>
          </div>

          <Badge
            variant={isLeak ? "destructive" : "outline"}
            className={
              !isLeak
                ? "border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400"
                : "text-[10px] font-bold"
            }
          >
            {isLeak
              ? "⚠ PIPELINE BREACH DETECTED"
              : "✓ INTEGRITY INTACT (< 15.0%)"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                  formatter={(val, _, item) => (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4 font-bold">
                        <span>Differential Mismatch:</span>
                        <span
                          className="telemetry-val"
                          style={{ color: item.payload.color }}
                        >
                          {val}%
                        </span>
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {Number(val) >= 15.0
                          ? "CRITICAL: Exceeds 15% threshold — Solenoid closed"
                          : Number(val) >= 6.0
                            ? "WARNING: Hydraulic variance elevated"
                            : "NOMINAL: Zero significant distribution loss"}
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
