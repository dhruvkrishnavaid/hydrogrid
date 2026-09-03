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

import type { PurificationStatus } from "../../lib/types";

interface PurificationTrajectoryChartProps {
  status: PurificationStatus | null;
  className?: string;
}

export function PurificationTrajectoryChart({
  status: _status,
  className,
}: PurificationTrajectoryChartProps) {
  const chartConfig = {
    sediment: {
      label: "Sediment Life (%)",
      color: "#06b6d4",
    },
    carbon: {
      label: "GAC Carbon Life (%)",
      color: "#f59e0b",
    },
    calcite: {
      label: "AMD Calcite Life (%)",
      color: "#10b981",
    },
    uv: {
      label: "UV-C Lamp Life (%)",
      color: "#8b5cf6",
    },
  } satisfies ChartConfig;

  // Media life depletion curves mapped against operational volume throughput (0k to 50k Liters)
  const currentVolume = 24.5; // ~24,500 L treated so far

  const data = [
    { volume: "0k L", sediment: 100, carbon: 100, calcite: 100, uv: 100 },
    { volume: "10k L", sediment: 97.5, carbon: 96.0, calcite: 97.0, uv: 99.0 },
    { volume: "20k L", sediment: 95.0, carbon: 92.5, calcite: 94.0, uv: 98.0 },
    {
      volume: "25k L (Now)",
      sediment: 94.0,
      carbon: 89.0,
      calcite: 92.0,
      uv: 97.0,
    },
    {
      volume: "35k L (Est)",
      sediment: 90.0,
      carbon: 82.0,
      calcite: 87.0,
      uv: 94.0,
    },
    {
      volume: "45k L (Est)",
      sediment: 84.0,
      carbon: 73.0,
      calcite: 81.0,
      uv: 90.0,
    },
    {
      volume: "60k L (Est)",
      sediment: 74.0,
      carbon: 58.0,
      calcite: 70.0,
      uv: 82.0,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-cyan-500" />
              <CardTitle className="text-foreground text-sm font-bold">
                Treatment Media Lifespan & Volumetric Depletion Trajectory
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous degradation forecast based on cumulative throughput
              volume & particulate loading
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-semibold">
              Current: {currentVolume}k L Treated
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-700 dark:text-amber-400"
            >
              Trip: 20% Threshold
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="grad-sediment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-carbon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-calcite" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="grad-uv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/50"
            />
            <XAxis
              dataKey="volume"
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
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine
              y={20}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "Maintenance Alert 20%",
                fill: "#ef4444",
                fontSize: 10,
                position: "insideBottomLeft",
              }}
            />

            <Area
              type="monotone"
              dataKey="uv"
              name="UV-C Lamp"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#grad-uv)"
            />
            <Area
              type="monotone"
              dataKey="sediment"
              name="Sediment Filter"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#grad-sediment)"
            />
            <Area
              type="monotone"
              dataKey="calcite"
              name="AMD Calcite Bed"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#grad-calcite)"
            />
            <Area
              type="monotone"
              dataKey="carbon"
              name="GAC Carbon Bed"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#grad-carbon)"
            />
          </AreaChart>
        </ChartContainer>

        {/* Legend */}
        <div className="border-border/60 mt-2 flex flex-wrap items-center justify-center gap-5 border-t pt-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#06b6d4]" />
            <span className="text-muted-foreground">Sediment (5μm)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#f59e0b]" />
            <span className="text-muted-foreground">Activated Carbon</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#10b981]" />
            <span className="text-muted-foreground">
              AMD Calcite Neutralizer
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#8b5cf6]" />
            <span className="text-muted-foreground">
              UV-C Disinfection Lamp
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
