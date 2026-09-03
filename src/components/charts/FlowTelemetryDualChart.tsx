import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
  currentInlet?: number;
  currentOutlet?: number;
  className?: string;
}

export function FlowTelemetryDualChart({
  history,
  currentInlet = 45.0,
  currentOutlet = 45.0,
  className,
}: FlowTelemetryDualChartProps) {
  const chartConfig = {
    inlet: {
      label: "Intake Flow Q₁ (L/min)",
      color: "#06b6d4", // Cyan
    },
    outlet: {
      label: "Distribution Flow Q₂ (L/min)",
      color: "#10b981", // Emerald
    },
  } satisfies ChartConfig;

  const chartData = (history.length > 0 ? history : []).map((point) => {
    const d = new Date(point.timestamp);
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      time: timeStr,
      timestamp: point.timestamp,
      inlet: Number(point.inletFlowRate.toFixed(1)),
      outlet: Number(point.outletFlowRate.toFixed(1)),
      difference: Number(
        Math.abs(point.inletFlowRate - point.outletFlowRate).toFixed(2),
      ),
    };
  });

  const delta = Math.abs(currentInlet - currentOutlet);

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-cyan-500" />
              <CardTitle className="text-foreground text-sm font-bold">
                Dual-Turbine Mass-Balance Telemetry Stream
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold">
                L/min
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Synchronous Hall-effect turbine monitoring: Q₁ (Raw Water Intake)
              vs Q₂ (Treated Distribution)
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="border-border/80 bg-muted/40 rounded-lg border px-2.5 py-1 text-right">
              <span className="text-muted-foreground block text-[9px] font-bold uppercase">
                Q₁ Intake
              </span>
              <span className="telemetry-val font-black text-cyan-600 dark:text-cyan-400">
                {currentInlet.toFixed(1)}{" "}
                <span className="text-muted-foreground text-[9px] font-normal">
                  L/m
                </span>
              </span>
            </div>

            <div className="border-border/80 bg-muted/40 rounded-lg border px-2.5 py-1 text-right">
              <span className="text-muted-foreground block text-[9px] font-bold uppercase">
                Q₂ Distribution
              </span>
              <span className="telemetry-val font-black text-emerald-600 dark:text-emerald-400">
                {currentOutlet.toFixed(1)}{" "}
                <span className="text-muted-foreground text-[9px] font-normal">
                  L/m
                </span>
              </span>
            </div>

            <div className="border-border/80 bg-muted/40 rounded-lg border px-2.5 py-1 text-right">
              <span className="text-muted-foreground block text-[9px] font-bold uppercase">
                Hydraulic Loss
              </span>
              <span
                className={`telemetry-val font-black ${delta > 2.0 ? "text-amber-600" : "text-foreground"}`}
              >
                {delta.toFixed(1)}{" "}
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
          >
            <defs>
              <linearGradient id="grad-inlet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-outlet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

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
              domain={[35, 55]}
              tickFormatter={(v) => `${v}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload;
                    return item?.timestamp
                      ? new Date(item.timestamp).toLocaleString()
                      : "";
                  }}
                />
              }
            />

            <Area
              type="monotone"
              dataKey="inlet"
              name="Q₁ Intake Flow"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#grad-inlet)"
            />
            <Area
              type="monotone"
              dataKey="outlet"
              name="Q₂ Distribution Flow"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#grad-outlet)"
            />
          </AreaChart>
        </ChartContainer>

        {/* Legend */}
        <div className="border-border/60 mt-3 flex items-center justify-center gap-6 border-t pt-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#06b6d4]" />
            <span className="text-muted-foreground">
              Q₁ Intake Meter (Raw Inflow)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#10b981]" />
            <span className="text-muted-foreground">
              Q₂ Distribution Meter (Treated Outflow)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
