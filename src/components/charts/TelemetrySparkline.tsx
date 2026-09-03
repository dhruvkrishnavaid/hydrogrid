import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface TelemetrySparklineProps {
  data: Array<{ value: number }>;
  color?: string;
  gradientId?: string;
  height?: number;
}

export function TelemetrySparkline({
  data,
  color = "#10b981",
  gradientId = "sparkline-gradient",
  height = 36,
}: TelemetrySparklineProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const chartData = data.map((d, i) => ({ index: i, value: d.value }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
