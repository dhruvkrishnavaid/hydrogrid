import { z } from "zod";

import { WaterQualityReadingSchema } from "../../lib/schemas/water-quality";
import type { WaterQualityReading } from "../../lib/schemas/water-quality";
import { recordCalibration } from "../repositories/calibrations";
import { getQualityConfigBySiteId } from "../repositories/quality-configurations";
import { broadcastSiteEvent } from "./event-bus";
import { handleSafetyEvents } from "./safety-events";
import { recordTelemetry } from "./telemetry";
import { evaluateWaterSafety } from "./water-safety";

export const IngestTelemetryPayloadSchema = z.object({
  deviceId: z.string().optional().nullable(),
  flowMismatchPercent: z.number().optional().default(0),
  reading: WaterQualityReadingSchema,
});

export const IngestCalibrationPayloadSchema = z.object({
  sensor: z.string(),
  offset: z.number().default(0),
  deviceId: z.string().optional().nullable(),
  status: z
    .enum(["HEALTHY", "DEGRADED", "CALIBRATION_REQUIRED", "FAULT"])
    .optional(),
});

export type IngestTelemetryPayload = z.infer<
  typeof IngestTelemetryPayloadSchema
>;
export type IngestCalibrationPayload = z.infer<
  typeof IngestCalibrationPayloadSchema
>;

export interface TelemetryIngestionResult {
  telemetry: WaterQualityReading;
  safety: ReturnType<typeof evaluateWaterSafety>;
  flow: {
    flowRate: number;
    nominalFlowRate: number;
    mismatchPercent: number;
    leakStatus: "NORMAL" | "LEAK_DETECTED";
    valveStatus: "OPEN" | "CLOSED";
  };
  triggeredEvent: unknown;
  triggeredAlert: unknown;
  ingestedAt: string;
}

const DEFAULT_BASELINE_READING: WaterQualityReading = {
  ph: 7.2,
  turbidity: 1.2,
  heavyMetals: 0.002,
  dissolvedOxygen: 7.0,
  tds: 200,
  electricalConductivity: 300,
  temperature: 24.0,
  flowRate: 33.0, // Typical demand; rated 45.0; leak >47.25 L/min
  hardness: 120,
};

/**
 * Common ingestion logic for water telemetry arriving via HTTP or MQTT.
 */
export async function processTelemetryIngestion(
  siteId: string,
  rawPayload: unknown,
  options: {
    deviceId?: string | null;
    source?: "HTTP" | "MQTT";
    onValveChange?: (
      siteId: string,
      valveState: "OPEN" | "CLOSED",
      reason: string,
    ) => void;
  } = {},
): Promise<TelemetryIngestionResult> {
  // Support both nested { reading: {...}, flowMismatchPercent } or direct flat {...reading, flowMismatchPercent}
  let normalizedPayload: unknown;
  if (
    typeof rawPayload === "object" &&
    rawPayload !== null &&
    "reading" in rawPayload
  ) {
    const rawObj = rawPayload as Record<string, unknown>;
    const nestedReading =
      typeof rawObj.reading === "object" && rawObj.reading !== null
        ? (rawObj.reading as Record<string, unknown>)
        : {};
    normalizedPayload = {
      ...rawObj,
      reading: {
        ...DEFAULT_BASELINE_READING,
        ...nestedReading,
      },
    };
  } else if (typeof rawPayload === "object" && rawPayload !== null) {
    const { flowMismatchPercent, deviceId, ...reading } = rawPayload as Record<
      string,
      unknown
    >;

    const readingMap = reading as Record<string, unknown>;
    const flowRate =
      typeof readingMap.flowRate === "number"
        ? readingMap.flowRate
        : typeof readingMap.flow_rate_lpm === "number"
          ? readingMap.flow_rate_lpm
          : typeof readingMap.flow_rate === "number"
            ? readingMap.flow_rate
            : undefined;

    const temperature =
      typeof readingMap.temperature === "number"
        ? readingMap.temperature
        : typeof readingMap.temperature_c === "number"
          ? readingMap.temperature_c
          : typeof readingMap.temp === "number"
            ? readingMap.temp
            : undefined;

    const cleanedReading: Record<string, unknown> = { ...readingMap };
    if (flowRate !== undefined) cleanedReading.flowRate = flowRate;
    if (temperature !== undefined) cleanedReading.temperature = temperature;
    delete cleanedReading.flow_rate_lpm;
    delete cleanedReading.flow_rate;
    delete cleanedReading.temperature_c;
    delete cleanedReading.temp;
    delete cleanedReading.valve_status;
    delete cleanedReading.valveStatus;

    normalizedPayload = {
      flowMismatchPercent: flowMismatchPercent ?? 0,
      deviceId,
      reading: {
        ...DEFAULT_BASELINE_READING,
        ...cleanedReading,
      },
    };
  } else {
    normalizedPayload = rawPayload;
  }

  const parsed = IngestTelemetryPayloadSchema.safeParse(normalizedPayload);
  if (!parsed.success) {
    throw new Error(
      `Invalid telemetry payload: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }

  const {
    reading,
    deviceId: payloadDeviceId,
    flowMismatchPercent,
  } = parsed.data;
  const effectiveDeviceId = payloadDeviceId ?? options.deviceId ?? undefined;

  const config = await getQualityConfigBySiteId(siteId);

  // 1. Evaluate water safety
  const safety = evaluateWaterSafety(reading, config, {
    flowMismatchPercent,
  });

  // 2. Record telemetry (In-Memory cache & InfluxDB write)
  await recordTelemetry(
    siteId,
    reading,
    safety,
    effectiveDeviceId,
    undefined,
    flowMismatchPercent,
  );

  const isUuid = (val?: string | null): val is string =>
    Boolean(
      val &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        val,
      ),
    );
  const sqlDeviceId = isUuid(effectiveDeviceId) ? effectiveDeviceId : null;

  // 3. Trigger events and alerts if safety thresholds violated
  const { event, alert } = await handleSafetyEvents(
    siteId,
    safety,
    sqlDeviceId,
  );

  // If flowRate > 45.5 L/min, it is automatically assumed as leakage
  const surgeMismatchPercent =
    reading.flowRate > 45.0
      ? Number((((reading.flowRate - 45.0) / 45.0) * 100).toFixed(1))
      : 0.0;
  const effectiveMismatchPercent =
    flowMismatchPercent > 0 ? flowMismatchPercent : surgeMismatchPercent;

  const maxMismatch = 5.0; // 5% above rated 45.0 L/min = 47.25 L/min trip threshold
  const isLeak =
    reading.flowRate > 47.25 || effectiveMismatchPercent > maxMismatch;
  const isValveClosed = safety.waterRelease === "BLOCKED" || isLeak;
  const valveStatus: "OPEN" | "CLOSED" = isValveClosed ? "CLOSED" : "OPEN";

  const flowData = {
    flowRate: reading.flowRate,
    nominalFlowRate: 45.0,
    mismatchPercent: effectiveMismatchPercent,
    leakStatus: isLeak ? ("LEAK_DETECTED" as const) : ("NORMAL" as const),
    valveStatus,
  };

  // Broadcast realtime SSE events
  broadcastSiteEvent(siteId, "water-quality.updated", {
    siteId,
    reading,
  });
  broadcastSiteEvent(siteId, "water-safety.updated", { siteId, safety });
  broadcastSiteEvent(siteId, "quality-gate.changed", {
    siteId,
    qualityGate: safety.qualityGate,
    waterRelease: safety.waterRelease,
  });
  broadcastSiteEvent(siteId, "flow.updated", {
    siteId,
    flow: flowData,
  });

  if (isLeak) {
    broadcastSiteEvent(siteId, "leak.detected", {
      siteId,
      mismatchPercent: flowMismatchPercent,
      threshold: maxMismatch,
      valveStatus: "CLOSED",
      timestamp: new Date().toISOString(),
    });
  }

  if (alert) {
    broadcastSiteEvent(siteId, "alert.created", { siteId, alert });
  }

  // Optional actuation hook (e.g. publish to MQTT actuator topic)
  if (options.onValveChange) {
    const reason =
      safety.reasons[0] ?? (isLeak ? "Pipeline leak detected" : "Nominal");
    options.onValveChange(siteId, valveStatus, reason);
  }

  const ingestedAt = new Date().toISOString();

  return {
    telemetry: reading,
    safety,
    flow: flowData,
    triggeredEvent: event ?? null,
    triggeredAlert: alert ?? null,
    ingestedAt,
  };
}

/**
 * Common ingestion logic for calibration data arriving via HTTP or MQTT.
 */
export async function processCalibrationIngestion(
  siteId: string,
  rawPayload: unknown,
  _options: {
    source?: "HTTP" | "MQTT";
  } = {},
) {
  const parsed = IngestCalibrationPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    throw new Error(
      `Invalid calibration payload: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }

  const { sensor, offset, deviceId, status } = parsed.data;

  const recorded = await recordCalibration({
    site_id: siteId,
    device_id: deviceId,
    sensor,
    offset,
    status: status ?? "HEALTHY",
  });

  broadcastSiteEvent(siteId, "sensor.health-changed", {
    siteId,
    deviceId,
    sensor,
    offset,
    status: status ?? "HEALTHY",
    timestamp: new Date().toISOString(),
  });

  broadcastSiteEvent(siteId, "maintenance.updated", {
    siteId,
    timestamp: new Date().toISOString(),
  });

  return { calibration: recorded };
}
