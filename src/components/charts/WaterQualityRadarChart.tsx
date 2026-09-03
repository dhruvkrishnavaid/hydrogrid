import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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

import type { WaterQualityReading } from "../../lib/types";

interface WaterQualityRadarChartProps {
  reading: WaterQualityReading | null;
  className?: string;
}

export function WaterQualityRadarChart({
  reading,
  className,
}: WaterQualityRadarChartProps) {
  const chartConfig = {
    potability: {
      label: "Potability Index (%)",
      color: "#10b981",
    },
    benchmark: {
      label: "IS 10500 Standard",
      color: "#06b6d4",
    },
  } satisfies ChartConfig;

  // Compute normalized 0-100 scores for each dimension based on IS 10500 standards
  const phScore = reading
    ? Math.max(0, Math.min(100, 100 - Math.abs(reading.ph - 7.2) * 40))
    : 95;
  const turbidityScore = reading
    ? Math.max(0, Math.min(100, 100 - (reading.turbidity / 5.0) * 80))
    : 92;
  const metalsScore = reading
    ? Math.max(0, Math.min(100, 100 - (reading.heavyMetals / 0.01) * 100))
    : 98;
  const doScore = reading
    ? Math.max(0, Math.min(100, (reading.dissolvedOxygen / 8.0) * 100))
    : 94;
  const tdsScore = reading
    ? Math.max(0, Math.min(100, 100 - (reading.tds / 500) * 60))
    : 88;
  const hardnessScore = reading
    ? Math.max(0, Math.min(100, 100 - (reading.hardness / 300) * 60))
    : 90;

  const data = [
    { metric: "pH Balance", potability: Math.round(phScore), benchmark: 100 },
    {
      metric: "Clarity (Turbidity)",
      potability: Math.round(turbidityScore),
      benchmark: 100,
    },
    {
      metric: "Heavy Metals Purity",
      potability: Math.round(metalsScore),
      benchmark: 100,
    },
    {
      metric: "Dissolved Oxygen",
      potability: Math.round(doScore),
      benchmark: 100,
    },
    {
      metric: "TDS Mineral Load",
      potability: Math.round(tdsScore),
      benchmark: 100,
    },
    {
      metric: "Hardness Buffer",
      potability: Math.round(hardnessScore),
      benchmark: 100,
    },
  ];

  const overallAvg = Math.round(
    data.reduce((acc, curr) => acc + curr.potability, 0) / data.length,
  );

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-1 sm:p-5 sm:pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground text-sm font-bold">
              Multi-Parameter Potability Radar
            </CardTitle>
            <CardDescription className="text-xs">
              Normalized compliance against IS 10500:2012 standards across 6
              physicochemical vectors
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400"
          >
            {overallAvg}% Aggregate
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-4">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <RadarChart
            data={data}
            margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
          >
            <PolarGrid className="stroke-border/60" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "currentColor", fontSize: 10, fontWeight: 600 }}
              className="text-muted-foreground"
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              stroke="#888888"
              fontSize={9}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Radar
              name="Benchmark (100%)"
              dataKey="benchmark"
              stroke="#06b6d4"
              strokeDasharray="3 3"
              fill="#06b6d4"
              fillOpacity={0.08}
            />
            <Radar
              name="Station Reading"
              dataKey="potability"
              stroke="#10b981"
              strokeWidth={2}
              fill="#10b981"
              fillOpacity={0.45}
            />
          </RadarChart>
        </ChartContainer>

        {/* Legend */}
        <div className="border-border/60 mt-1 flex items-center justify-center gap-6 border-t pt-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#10b981]" />
            <span className="text-muted-foreground">
              Station Real-Time Multi-Vector
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-dashed border-[#06b6d4] bg-[#06b6d4]/30" />
            <span className="text-muted-foreground">
              IS 10500 Benchmark Target
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
