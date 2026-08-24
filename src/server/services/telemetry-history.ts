import { serverConfig } from "../config";
import { getInfluxQueryApi, isInfluxDBConfigured } from "../db/influx";

export interface HistoryQueryOptions {
  from?: string;
  to?: string;
  interval?: string;
}

export interface WaterQualityHistoryPoint {
  timestamp: string;
  ph: number;
  turbidity: number;
  heavyMetals: number;
  dissolvedOxygen: number;
  tds: number;
  electricalConductivity: number;
  temperature: number;
  flowRate: number;
  hardness: number;
}

export interface FlowHistoryPoint {
  timestamp: string;
  inletFlowRate: number;
  outletFlowRate: number;
  differencePercent: number;
}

const INTERVAL_REGEX = /^(\d+)(s|m|h|d)$/;

const WATER_QUALITY_NUMERIC_FIELDS = [
  "ph",
  "turbidity",
  "heavyMetals",
  "dissolvedOxygen",
  "tds",
  "electricalConductivity",
  "temperature",
  "flowRate",
  "hardness",
];

const FLOW_NUMERIC_FIELDS = ["flowRate"];

/**
 * Validates and sanitizes historical query parameters.
 */
export function sanitizeHistoryParams(options?: HistoryQueryOptions): {
  fromIso: string;
  toIso: string;
  interval: string;
  error?: string;
} {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const fromIso = options?.from ? options.from : defaultFrom.toISOString();

  const toIso = options?.to ? options.to : now.toISOString();

  const fromTime = Date.parse(fromIso);
  const toTime = Date.parse(toIso);

  if (Number.isNaN(fromTime)) {
    return {
      fromIso,
      toIso,
      interval: "5m",
      error:
        "Invalid 'from' timestamp format. Use ISO-8601 (e.g. 2026-08-24T00:00:00Z)",
    };
  }

  if (Number.isNaN(toTime)) {
    return {
      fromIso,
      toIso,
      interval: "5m",
      error:
        "Invalid 'to' timestamp format. Use ISO-8601 (e.g. 2026-08-24T00:00:00Z)",
    };
  }

  if (fromTime >= toTime) {
    return {
      fromIso,
      toIso,
      interval: "5m",
      error: "'from' timestamp must be strictly before 'to' timestamp",
    };
  }

  if (toTime - fromTime > 90 * 24 * 60 * 60 * 1000) {
    return {
      fromIso,
      toIso,
      interval: "5m",
      error: "Requested time range cannot exceed 90 days",
    };
  }

  const interval = options?.interval ?? "5m";

  if (!INTERVAL_REGEX.test(interval)) {
    return {
      fromIso,
      toIso,
      interval,
      error:
        "Invalid 'interval' format. Must be a valid duration such as 1m, 5m, 15m, 1h, 1d",
    };
  }

  return {
    fromIso: new Date(fromTime).toISOString(),
    toIso: new Date(toTime).toISOString(),
    interval,
  };
}

/**
 * Queries historical water quality telemetry from InfluxDB.
 */
export async function getWaterQualityHistory(
  siteId: string,
  options?: HistoryQueryOptions,
): Promise<{ data: Array<WaterQualityHistoryPoint>; error?: string }> {
  const {
    fromIso,
    toIso,
    interval,
    error: paramError,
  } = sanitizeHistoryParams(options);

  if (paramError) {
    return { data: [], error: paramError };
  }

  if (!isInfluxDBConfigured()) {
    return { data: [] };
  }

  const queryApi = getInfluxQueryApi();

  if (!queryApi || !serverConfig.INFLUXDB_BUCKET) {
    return { data: [] };
  }

  const numericFields = WATER_QUALITY_NUMERIC_FIELDS.map(
    (field) => `"${field}"`,
  ).join(", ");

  const fluxQuery = `
    from(bucket: "${serverConfig.INFLUXDB_BUCKET}")
      |> range(start: ${fromIso}, stop: ${toIso})
      |> filter(
        fn: (r) =>
          r._measurement == "water_quality" and
          r.site_id == "${siteId}" and
          contains(value: r._field, set: [${numericFields}])
      )
      |> aggregateWindow(
        every: ${interval},
        fn: mean,
        createEmpty: false
      )
      |> pivot(
        rowKey: ["_time"],
        columnKey: ["_field"],
        valueColumn: "_value"
      )
      |> sort(columns: ["_time"], desc: false)
      |> limit(n: 1000)
  `;

  try {
    const rows = await queryApi.collectRows<Record<string, unknown>>(fluxQuery);

    const points: Array<WaterQualityHistoryPoint> = rows.map((row) => ({
      timestamp: String(row._time ?? new Date().toISOString()),
      ph: Number(row.ph ?? 7.0),
      turbidity: Number(row.turbidity ?? 1.0),
      heavyMetals: Number(row.heavyMetals ?? 0.0),
      dissolvedOxygen: Number(row.dissolvedOxygen ?? 7.0),
      tds: Number(row.tds ?? 200.0),
      electricalConductivity: Number(row.electricalConductivity ?? 300.0),
      temperature: Number(row.temperature ?? 24.0),
      flowRate: Number(row.flowRate ?? 45.0),
      hardness: Number(row.hardness ?? 140.0),
    }));

    return { data: points };
  } catch (err) {
    console.warn("InfluxDB historical water quality query failed:", err);

    return { data: [] };
  }
}

/**
 * Queries historical flow rate and mismatch data from InfluxDB.
 */
export async function getFlowHistory(
  siteId: string,
  options?: HistoryQueryOptions,
): Promise<{ data: Array<FlowHistoryPoint>; error?: string }> {
  const {
    fromIso,
    toIso,
    interval,
    error: paramError,
  } = sanitizeHistoryParams(options);

  if (paramError) {
    return { data: [], error: paramError };
  }

  if (!isInfluxDBConfigured()) {
    return { data: [] };
  }

  const queryApi = getInfluxQueryApi();

  if (!queryApi || !serverConfig.INFLUXDB_BUCKET) {
    return { data: [] };
  }

  const numericFields = FLOW_NUMERIC_FIELDS.map((field) => `"${field}"`).join(
    ", ",
  );

  const fluxQuery = `
    from(bucket: "${serverConfig.INFLUXDB_BUCKET}")
      |> range(start: ${fromIso}, stop: ${toIso})
      |> filter(
        fn: (r) =>
          r._measurement == "water_quality" and
          r.site_id == "${siteId}" and
          contains(value: r._field, set: [${numericFields}])
      )
      |> aggregateWindow(
        every: ${interval},
        fn: mean,
        createEmpty: false
      )
      |> pivot(
        rowKey: ["_time"],
        columnKey: ["_field"],
        valueColumn: "_value"
      )
      |> sort(columns: ["_time"], desc: false)
      |> limit(n: 1000)
  `;

  try {
    const rows = await queryApi.collectRows<Record<string, unknown>>(fluxQuery);

    const points: Array<FlowHistoryPoint> = rows.map((row) => {
      const flowRate = Number(row.flowRate ?? 45.0);

      return {
        timestamp: String(row._time ?? new Date().toISOString()),
        inletFlowRate: 45.0,
        outletFlowRate: flowRate,
        differencePercent: Math.abs(((45.0 - flowRate) / 45.0) * 100),
      };
    });

    return { data: points };
  } catch (err) {
    console.warn("InfluxDB historical flow query failed:", err);

    return { data: [] };
  }
}
