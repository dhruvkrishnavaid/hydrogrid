import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export interface SparklinePoint {
  value: number;
  time?: string;
  timestamp?: string;
}

interface TelemetrySparklineProps {
  data: Array<SparklinePoint>;
  color?: string;
  gradientId?: string;
  height?: number;
  unit?: string;
  onHoverChange?: (point: SparklinePoint | null) => void;
}

export function TelemetrySparkline({
  data,
  color = "#10b981",
  gradientId = "sparkline-gradient",
  height = 36,
  unit,
  onHoverChange,
}: TelemetrySparklineProps) {
  const lastHoveredRef = React.useRef<number | null>(null);
  const dataRef = React.useRef(data);
  dataRef.current = data;

  const handleHover = React.useCallback(
    (idx: number | null) => {
      if (lastHoveredRef.current === idx) return;
      lastHoveredRef.current = idx;
      const currentData = dataRef.current;
      if (idx !== null && idx >= 0 && idx < currentData.length) {
        onHoverChange?.(currentData[idx]);
      } else {
        onHoverChange?.(null);
      }
    },
    [onHoverChange],
  );

  if (!data || data.length === 0) {
    return null;
  }

  const chartData = data.map((d, i) => ({
    index: i,
    value: d.value,
    time: d.time,
    timestamp: d.timestamp,
  }));

  return (
    <div
      className="w-full"
      style={{ height }}
      onMouseLeave={() => {
        lastHoveredRef.current = null;
        onHoverChange?.(null);
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
          onMouseMove={(state: any) => {
            const payloadPoint = state?.activePayload?.[0]?.payload;
            const rawIdx =
              state?.activeTooltipIndex ??
              state?.activeIndex ??
              payloadPoint?.index;
            const parsed =
              typeof rawIdx === "number"
                ? rawIdx
                : typeof rawIdx === "string"
                  ? parseInt(rawIdx, 10)
                  : -1;
            const idx = Number.isFinite(parsed) && parsed >= 0 ? parsed : -1;
            if (idx >= 0 && idx < chartData.length) {
              handleHover(idx);
            } else if (payloadPoint && typeof payloadPoint.value === "number") {
              onHoverChange?.({
                value: payloadPoint.value,
                time: payloadPoint.time,
                timestamp: payloadPoint.timestamp,
              });
            }
          }}
          onMouseLeave={() => {
            lastHoveredRef.current = null;
            onHoverChange?.(null);
          }}
        >
          <XAxis dataKey="index" hide />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "2 2" }}
            content={({ active, payload }: any) => {
              if (!active || !payload || !payload.length) return null;
              const item = payload[0]?.payload;
              return (
                <div className="border-border/80 bg-background/95 rounded-md border px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur-xs">
                  {item?.time && (
                    <div className="text-muted-foreground text-[9px]">
                      {item.time}
                    </div>
                  )}
                  <div className="text-foreground font-bold">
                    {Number(item?.value ?? 0).toFixed(unit === "NTU" ? 2 : 1)}{" "}
                    {unit ?? ""}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            activeDot={{
              r: 3.5,
              fill: color,
              stroke: "#fff",
              strokeWidth: 1.5,
            }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
