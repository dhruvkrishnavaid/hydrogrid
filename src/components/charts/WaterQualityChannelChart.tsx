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

import type {
  WaterQualityHistoryPoint,
  WaterQualityReading,
} from "../../lib/types";

interface WaterQualityChannelChartProps {
  history: Array<WaterQualityHistoryPoint>;
  selectedParam: keyof WaterQualityReading;
  paramMeta: {
    label: string;
    unit: string;
    description: string;
    safeMin?: number;
    safeMax?: number;
    whoStandard: string;
  };
  currentValue?: number;
  onHoverChange?: (
    point: { value: number; timestamp: string; timeStr: string } | null,
  ) => void;
  className?: string;
}

const channelColors: Record<keyof WaterQualityReading, string> = {
  ph: "#10b981", // Emerald
  turbidity: "#06b6d4", // Cyan
  heavyMetals: "#ef4444", // Crimson Red
  dissolvedOxygen: "#8b5cf6", // Violet
  tds: "#f59e0b", // Gold / Amber
  electricalConductivity: "#f97316", // Orange
  temperature: "#ec4899", // Pink
  flowRate: "#0ea5e9", // Sky Blue
  hardness: "#14b8a6", // Teal
};

export function WaterQualityChannelChart({
  history,
  selectedParam,
  paramMeta,
  currentValue,
  onHoverChange,
  className,
}: WaterQualityChannelChartProps) {
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    value: number;
    time: string;
    timestamp: string;
  } | null>(null);

  const lastHoveredRef = React.useRef<string | null>(null);

  const handleHoverSync = React.useCallback(
    (
      pt: {
        value: number;
        time: string;
        timestamp: string;
        timeStr: string;
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

  const color = channelColors[selectedParam] ?? "#10b981";

  const chartConfig = {
    value: {
      label: `${paramMeta.label} (${paramMeta.unit})`,
      color,
    },
  } satisfies ChartConfig;

  // Process time-series data
  const chartData = (history.length > 0 ? history : []).map((point) => {
    const d = new Date(point.timestamp);
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      time: timeStr,
      timestamp: point.timestamp,
      value: Number(point[selectedParam]),
    };
  });

  // Calculate stats in window
  const values = chartData.map((d) => d.value);
  const minVal = values.length > 0 ? Math.min(...values) : 0;
  const maxVal = values.length > 0 ? Math.max(...values) : 10;
  const avgVal =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

  const gradientId = `grad-${selectedParam}`;

  const isHovered = hoveredPoint !== null;
  const displayedValue = isHovered ? hoveredPoint.value : currentValue;

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <CardTitle className="text-foreground text-sm font-bold">
                {paramMeta.label} Dynamic Stream
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold">
                {paramMeta.unit}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {paramMeta.description} — Regulatory Target:{" "}
              {paramMeta.whoStandard}
            </CardDescription>
          </div>

          {/* Metric Summary Pills */}
          <div className="flex items-center gap-2 text-xs">
            <div
              className={`rounded-lg border px-2.5 py-1 text-right transition-colors ${
                isHovered
                  ? "border-[var(--brand-secondary)]/50 bg-[var(--brand-secondary)]/10 ring-1 ring-[var(--brand-secondary)]/30"
                  : "border-border/80 bg-muted/40"
              }`}
            >
              <span className="text-muted-foreground flex items-center justify-end gap-1 text-[9px] font-bold uppercase">
                {isHovered ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-cyan-500" />
                    Hovered ({hoveredPoint.time})
                  </>
                ) : (
                  "Current"
                )}
              </span>
              <span className="telemetry-val text-foreground font-black">
                {displayedValue !== undefined
                  ? displayedValue.toFixed(
                      selectedParam === "heavyMetals" ? 4 : 2,
                    )
                  : "--"}{" "}
                <span className="text-muted-foreground text-[10px] font-normal">
                  {paramMeta.unit}
                </span>
              </span>
            </div>

            <div className="border-border/80 bg-muted/40 rounded-lg border px-2.5 py-1 text-right">
              <span className="text-muted-foreground block text-[9px] font-bold uppercase">
                Mean
              </span>
              <span className="telemetry-val text-foreground font-bold">
                {avgVal.toFixed(selectedParam === "heavyMetals" ? 4 : 2)}
              </span>
            </div>

            <div className="border-border/80 bg-muted/40 rounded-lg border px-2.5 py-1 text-right">
              <span className="text-muted-foreground block text-[9px] font-bold uppercase">
                Min / Max
              </span>
              <span className="telemetry-val text-foreground font-bold">
                {minVal.toFixed(1)} – {maxVal.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 sm:p-5 sm:pt-2">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            onMouseMove={(state: any) => {
              const idx =
                typeof state?.activeTooltipIndex === "number"
                  ? state.activeTooltipIndex
                  : typeof state?.activeIndex === "number"
                    ? state.activeIndex
                    : -1;
              const payload =
                (state?.activePayload && state.activePayload[0]?.payload) ||
                (idx >= 0 && idx < chartData.length ? chartData[idx] : null);

              if (payload) {
                handleHoverSync({
                  value: Number(payload.value),
                  time: String(payload.time),
                  timestamp: String(payload.timestamp),
                  timeStr: String(payload.time),
                });
              }
            }}
            onMouseLeave={() => {
              handleHoverSync(null);
            }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.65} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
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
              domain={["auto", "auto"]}
              tickFormatter={(v) =>
                selectedParam === "heavyMetals" ? v.toFixed(3) : v.toFixed(1)
              }
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

            {/* Threshold Reference Lines */}
            {paramMeta.safeMin !== undefined && (
              <ReferenceLine
                y={paramMeta.safeMin}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Min Safe: ${paramMeta.safeMin} ${paramMeta.unit}`,
                  fill: "#10b981",
                  fontSize: 10,
                  position: "insideBottomLeft",
                }}
              />
            )}

            {paramMeta.safeMax !== undefined && (
              <ReferenceLine
                y={paramMeta.safeMax}
                stroke={selectedParam === "heavyMetals" ? "#ef4444" : "#10b981"}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Limit: ${paramMeta.safeMax} ${paramMeta.unit}`,
                  fill: selectedParam === "heavyMetals" ? "#ef4444" : "#10b981",
                  fontSize: 10,
                  position: "insideTopLeft",
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="value"
              name={paramMeta.label}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
