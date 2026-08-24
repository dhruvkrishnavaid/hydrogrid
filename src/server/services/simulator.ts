import type { AlertRecord, EventRecord } from "../../lib/schemas/database";
import type { WaterQualityReading } from "../../lib/schemas/water-quality";
import { createAlert } from "../repositories/alerts";
import { createEvent } from "../repositories/events";
import { getQualityConfigBySiteId } from "../repositories/quality-configurations";
import { broadcastSiteEvent } from "./event-bus";
import {
  getPurificationStatus,
  resetPurificationStatus,
  updatePurificationStatus,
} from "./purification";
import { handleSafetyEvents } from "./safety-events";
import { recordTelemetry } from "./telemetry";
import { evaluateWaterSafety } from "./water-safety";
import type { WaterSafetyResult } from "./water-safety";

export const VALID_SCENARIOS = [
  "SAFE",
  "NORMAL",
  "UNSAFE_HEAVY_METALS",
  "UNSAFE_PH",
  "UNSAFE_TURBIDITY",
  "UNSAFE_TDS",
  "QUALITY_FAILURE",
  "LEAK_DETECTED",
  "LEAK",
  "SENSOR_DRIFT",
  "DEVICE_OFFLINE",
  "DEVICE_ONLINE",
  "CALIBRATION_REQUIRED",
  "FILTER_WARNING",
  "RESET",
] as const;

export type SimulatorScenario = (typeof VALID_SCENARIOS)[number];

export interface SimulatorExecutionResult {
  scenario: SimulatorScenario;
  reading: WaterQualityReading;
  flow: {
    inletFlowRate: number;
    outletFlowRate: number;
    mismatchPercent: number;
    leakStatus: "NORMAL" | "LEAK_DETECTED" | "ISOLATED";
    valveStatus: "OPEN" | "CLOSED";
  };
  safety: WaterSafetyResult;
  deviceState: {
    status: "ONLINE" | "DEGRADED" | "OFFLINE" | "FAULT";
  };
  sensorHealth: {
    status: "HEALTHY" | "DEGRADED" | "CALIBRATION_REQUIRED" | "FAULT";
    drift: number;
  };
  purification: ReturnType<typeof getPurificationStatus>;
  triggeredEvent: EventRecord | null;
  triggeredAlert: AlertRecord | null;
  simulatedAt: string;
}

const BASELINE_SAFE_READING: WaterQualityReading = {
  ph: 7.35,
  turbidity: 1.2,
  heavyMetals: 0.02,
  dissolvedOxygen: 7.8,
  tds: 210.0,
  electricalConductivity: 340.0,
  temperature: 24.0,
  flowRate: 45.0,
  hardness: 140.0,
};

/**
 * Checks if a string is a valid scenario or alias.
 */
export function isValidScenario(scenario: string): boolean {
  if (typeof scenario !== "string") return false;
  const upper = scenario.toUpperCase().replace(/-/g, "_");
  return (VALID_SCENARIOS as ReadonlyArray<string>).includes(upper);
}

/**
 * Normalizes scenario aliases (e.g. NORMAL -> SAFE, LEAK -> LEAK_DETECTED, QUALITY_FAILURE -> UNSAFE_HEAVY_METALS).
 */
export function normalizeScenario(scenario: string): SimulatorScenario | null {
  if (!isValidScenario(scenario)) {
    return null;
  }
  const upper = scenario.toUpperCase().replace(/-/g, "_");
  switch (upper) {
    case "NORMAL":
      return "SAFE";
    case "QUALITY_FAILURE":
      return "UNSAFE_HEAVY_METALS";
    case "LEAK":
      return "LEAK_DETECTED";
    default:
      return upper as SimulatorScenario;
  }
}

/**
 * Executes a simulator scenario end-to-end through the domain pipeline.
 */
export async function executeSimulatorScenario(
  siteId: string,
  scenario: string,
  deviceId?: string | null,
): Promise<SimulatorExecutionResult> {
  const normalized = normalizeScenario(scenario);
  if (!normalized) {
    throw new Error(
      `Invalid simulation scenario: '${scenario}'. Supported scenarios: ${VALID_SCENARIOS.join(", ")}`,
    );
  }

  const config = await getQualityConfigBySiteId(siteId);

  let reading: WaterQualityReading = { ...BASELINE_SAFE_READING };
  let flowMismatchPercent = 0;
  let inletFlow = 45.0;
  let outletFlow = 45.0;
  let sensorDegradedCount = 0;
  let calibrationRequired = false;
  let deviceStatus: "ONLINE" | "DEGRADED" | "OFFLINE" | "FAULT" = "ONLINE";
  let sensorStatus: "HEALTHY" | "DEGRADED" | "CALIBRATION_REQUIRED" | "FAULT" =
    "HEALTHY";
  let sensorDrift = 0.0;

  let extraEvent: EventRecord | null = null;
  let extraAlert: AlertRecord | null = null;

  switch (normalized) {
    case "SAFE":
      reading = { ...BASELINE_SAFE_READING };
      resetPurificationStatus(siteId);
      break;

    case "UNSAFE_HEAVY_METALS":
      reading = { ...BASELINE_SAFE_READING, heavyMetals: 0.85 };
      break;

    case "UNSAFE_PH":
      reading = { ...BASELINE_SAFE_READING, ph: 4.2 };
      break;

    case "UNSAFE_TURBIDITY":
      reading = { ...BASELINE_SAFE_READING, turbidity: 18.5 };
      break;

    case "UNSAFE_TDS":
      reading = { ...BASELINE_SAFE_READING, tds: 850.0 };
      break;

    case "LEAK_DETECTED":
      inletFlow = 45.0;
      outletFlow = 32.0;
      flowMismatchPercent = 28.8;
      reading = { ...BASELINE_SAFE_READING, flowRate: 45.0 };
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "LEAK_DETECTED",
        severity: "CRITICAL",
        message:
          "Pipeline flow mismatch 28.8% exceeded 15% threshold. Valve isolated.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "LEAK_DETECTED",
        severity: "CRITICAL",
        status: "UNREAD",
        message: "Pipeline leak detected. Flow mismatch 28.8%. Valve isolated.",
      });
      broadcastSiteEvent(siteId, "leak.detected", {
        siteId,
        differencePercent: 28.8,
        thresholdPercent: 15.0,
        valveStatus: "CLOSED",
      });
      break;

    case "SENSOR_DRIFT":
      reading = { ...BASELINE_SAFE_READING, ph: 7.95 };
      sensorDegradedCount = 1;
      calibrationRequired = true;
      sensorStatus = "DEGRADED";
      sensorDrift = 0.85;
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "SENSOR_DRIFT",
        severity: "WARNING",
        message: "pH sensor drift detected (0.85). Calibration required.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "SENSOR_DRIFT",
        severity: "WARNING",
        status: "UNREAD",
        message:
          "Sensor health degraded: pH drift exceeds 0.50. Calibration required.",
      });
      broadcastSiteEvent(siteId, "sensor.health-changed", {
        siteId,
        sensor: "ph",
        status: "DEGRADED",
        drift: 0.85,
      });
      break;

    case "CALIBRATION_REQUIRED":
      calibrationRequired = true;
      sensorStatus = "CALIBRATION_REQUIRED";
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "CALIBRATION_REQUIRED",
        severity: "WARNING",
        message: "Routine 30-day sensor calibration required.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "CALIBRATION_REQUIRED",
        severity: "WARNING",
        status: "UNREAD",
        message:
          "Sensor calibration required for Primary Node (30 days expired).",
      });
      broadcastSiteEvent(siteId, "sensor.health-changed", {
        siteId,
        sensor: "all",
        status: "CALIBRATION_REQUIRED",
      });
      break;

    case "DEVICE_OFFLINE":
      deviceStatus = "OFFLINE";
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "DEVICE_OFFLINE",
        severity: "CRITICAL",
        message:
          "Primary Sensor Node heartbeat timed out. Device state OFFLINE.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "DEVICE_OFFLINE",
        severity: "CRITICAL",
        status: "UNREAD",
        message:
          "Device offline: Primary Sensor Node lost telemetry connection.",
      });
      broadcastSiteEvent(siteId, "device.status-changed", {
        siteId,
        deviceId,
        status: "OFFLINE",
      });
      break;

    case "DEVICE_ONLINE":
      deviceStatus = "ONLINE";
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "SYSTEM_RECOVERED",
        severity: "INFO",
        message: "Primary Sensor Node reconnected. Telemetry streaming active.",
      });
      broadcastSiteEvent(siteId, "device.status-changed", {
        siteId,
        deviceId,
        status: "ONLINE",
      });
      broadcastSiteEvent(siteId, "system.recovered", {
        siteId,
        message: "System recovered.",
      });
      break;

    case "FILTER_WARNING":
      updatePurificationStatus(siteId, {
        mode: "MAINTENANCE",
        stages: {
          sediment: "HEALTHY",
          carbon: "WARNING",
          calcite: "HEALTHY",
          uv: "ACTIVE",
        },
        filters: {
          sediment: { status: "HEALTHY", lifePercent: 88.0 },
          carbon: { status: "WARNING", lifePercent: 18.0 },
          calcite: { status: "HEALTHY", lifePercent: 85.0 },
          uv: { status: "HEALTHY", lifePercent: 92.0 },
        },
      });
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "FILTER_WARNING",
        severity: "WARNING",
        message:
          "Activated carbon filter life at 18%. Replacement due within 7 days.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "FILTER_WARNING",
        severity: "WARNING",
        status: "UNREAD",
        message: "Filter maintenance warning: Activated Carbon life is 18%.",
      });
      broadcastSiteEvent(siteId, "maintenance.updated", {
        siteId,
        filter: "carbon",
        status: "WARNING",
        lifePercent: 18.0,
      });
      break;

    case "RESET":
      reading = { ...BASELINE_SAFE_READING };
      resetPurificationStatus(siteId);
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "SYSTEM_RECOVERED",
        severity: "INFO",
        message: "System reset to baseline operational parameters.",
      });
      broadcastSiteEvent(siteId, "system.recovered", {
        siteId,
        message: "System reset to normal.",
      });
      break;
  }

  // 1. Evaluate water safety
  const safety = evaluateWaterSafety(reading, config, {
    flowMismatchPercent,
    sensorDegradedCount,
    calibrationRequired,
  });

  // 2. Persist in telemetry cache & InfluxDB
  await recordTelemetry(siteId, reading, safety, deviceId);

  // 3. Handle safety events/alerts from water quality
  const { event: safetyEvent, alert: safetyAlert } = await handleSafetyEvents(
    siteId,
    safety,
    deviceId,
  );

  const isBlocked = safety.waterRelease === "BLOCKED";
  const purification = getPurificationStatus(siteId, isBlocked);

  // Broadcast realtime SSE events
  broadcastSiteEvent(siteId, "water-quality.updated", { siteId, reading });
  broadcastSiteEvent(siteId, "water-safety.updated", { siteId, safety });
  broadcastSiteEvent(siteId, "quality-gate.changed", {
    siteId,
    qualityGate: safety.qualityGate,
    waterRelease: safety.waterRelease,
  });
  broadcastSiteEvent(siteId, "flow.updated", {
    siteId,
    inletFlow,
    outletFlow,
    mismatchPercent: flowMismatchPercent,
    valveStatus: isBlocked ? "CLOSED" : "OPEN",
  });

  const finalAlert = extraAlert ?? safetyAlert;
  if (finalAlert) {
    broadcastSiteEvent(siteId, "alert.created", { siteId, alert: finalAlert });
  }

  return {
    scenario: normalized,
    reading,
    flow: {
      inletFlowRate: inletFlow,
      outletFlowRate: outletFlow,
      mismatchPercent: flowMismatchPercent,
      leakStatus: flowMismatchPercent > 15.0 ? "LEAK_DETECTED" : "NORMAL",
      valveStatus: isBlocked ? "CLOSED" : "OPEN",
    },
    safety,
    deviceState: {
      status: deviceStatus,
    },
    sensorHealth: {
      status: sensorStatus,
      drift: sensorDrift,
    },
    purification,
    triggeredEvent: extraEvent ?? safetyEvent,
    triggeredAlert: finalAlert,
    simulatedAt: new Date().toISOString(),
  };
}
