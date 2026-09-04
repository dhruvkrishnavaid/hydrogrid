import type { WaterQualityReading } from "../../lib/schemas/water-quality";
import { Point, getInfluxWriteApi, isInfluxDBConfigured } from "../db/influx";
import type { WaterSafetyResult } from "./water-safety";

export interface SiteTelemetryState {
  siteId: string;
  deviceId?: string | null;
  reading: WaterQualityReading;
  safety: WaterSafetyResult;
  flowMismatchPercent?: number;
  updatedAt: string;
}

// In-memory latest telemetry state per site
const latestTelemetryBySite = new Map<string, SiteTelemetryState>();

/**
 * Records telemetry data for a site:
 * 1. Updates the in-memory latest site state.
 * 2. Writes a time-series point to InfluxDB if configured.
 */
export async function recordTelemetry(
  siteId: string,
  reading: WaterQualityReading,
  safety: WaterSafetyResult,
  deviceId?: string | null,
  timestamp?: Date,
  flowMismatchPercent?: number,
): Promise<SiteTelemetryState> {
  const now = (timestamp ?? new Date()).toISOString();

  const state: SiteTelemetryState = {
    siteId,
    deviceId: deviceId ?? null,
    reading,
    safety,
    flowMismatchPercent,
    updatedAt: now,
  };

  latestTelemetryBySite.set(siteId, state);

  // Write to InfluxDB if configured (non-blocking / error-safe)
  if (isInfluxDBConfigured()) {
    try {
      const writeApi = getInfluxWriteApi();
      if (writeApi) {
        const point = new Point("water_quality")
          .tag("site_id", siteId)
          .floatField("ph", reading.ph)
          .floatField("turbidity", reading.turbidity)
          .floatField("heavyMetals", reading.heavyMetals)
          .floatField("dissolvedOxygen", reading.dissolvedOxygen)
          .floatField("tds", reading.tds)
          .floatField("electricalConductivity", reading.electricalConductivity)
          .floatField("temperature", reading.temperature)
          .floatField("flowRate", reading.flowRate)
          .floatField("hardness", reading.hardness)
          .intField("safety_score", safety.score)
          .stringField("safety_status", safety.status)
          .stringField("quality_gate", safety.qualityGate)
          .stringField("water_release", safety.waterRelease);

        if (deviceId) {
          point.tag("device_id", deviceId);
        }

        if (timestamp) {
          point.timestamp(timestamp);
        }

        writeApi.writePoint(point);
        await Promise.race([
          writeApi.flush(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("InfluxDB flush timed out")), 1500),
          ),
        ]);
      }
    } catch (err) {
      console.warn("InfluxDB write failed (non-blocking fallback):", err);
    }
  }

  return state;
}

/**
 * Retrieves the latest recorded telemetry state for a site.
 */
export function getLatestTelemetry(siteId: string): SiteTelemetryState | null {
  return latestTelemetryBySite.get(siteId) ?? null;
}
