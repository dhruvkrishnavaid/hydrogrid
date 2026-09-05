import type { AlertRecord, EventRecord } from "../../lib/schemas/database";
import type { WaterQualityReading } from "../../lib/schemas/water-quality";
import { createAlert } from "../repositories/alerts";
import { createEvent } from "../repositories/events";
import { getQualityConfigBySiteId } from "../repositories/quality-configurations";
import { broadcastSiteEvent } from "./event-bus";
import { publishMqttValveActuation } from "./mqtt";
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
  "UNSAFE_TEMPERATURE",
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
  "TURBIDITY_SPILL",
  "THERMAL_ANOMALY",
  "TURBIDITY_DRIFT",
] as const;

export type SimulatorScenario = (typeof VALID_SCENARIOS)[number];

export interface SimulatorExecutionResult {
  scenario: SimulatorScenario;
  reading: WaterQualityReading;
  flow: {
    flowRate: number;
    nominalFlowRate: number;
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
  flowRate: 33.0, // Typical operating demand — rated capacity is 45.0 L/min; leak trips at >47.25 L/min (+5%)
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
    case "TURBIDITY_SPILL":
      return "UNSAFE_TURBIDITY";
    case "THERMAL_ANOMALY":
      return "UNSAFE_TEMPERATURE";
    case "TURBIDITY_DRIFT":
      return "SENSOR_DRIFT";
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
      reading = {
        ...BASELINE_SAFE_READING,
        turbidity: 28.5,
        heavyMetals: 0.25,
      };
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "QUALITY_GATE_BLOCKED",
        severity: "CRITICAL",
        message:
          "Optical turbidity spike (28.5 NTU > 5.0 NTU limit). Node Zero automated solenoid shutoff valve tripped.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "QUALITY_GATE_BLOCKED",
        severity: "CRITICAL",
        status: "UNREAD",
        message:
          "Critical turbidity ingress (28.5 NTU). Quality Gate locked out; 12V solenoid shutoff valve closed.",
      });
      break;

    case "UNSAFE_TEMPERATURE":
      reading = { ...BASELINE_SAFE_READING, temperature: 43.5 };
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "PARAMETER_OUT_OF_BOUNDS",
        severity: "WARNING",
        message:
          "Node Zero fluid temperature (43.5°C) exceeded normal operating band (15.0–35.0°C).",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "PARAMETER_OUT_OF_BOUNDS",
        severity: "WARNING",
        status: "UNREAD",
        message:
          "Thermal intake anomaly: 43.5°C detected by Node Zero precision temperature probe.",
      });
      break;

    case "UNSAFE_TDS":
      reading = { ...BASELINE_SAFE_READING, tds: 850.0 };
      break;

    case "LEAK_DETECTED":
      flowMismatchPercent = 30.0;
      reading = { ...BASELINE_SAFE_READING, flowRate: 58.5 };
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "LEAK_DETECTED",
        severity: "CRITICAL",
        message:
          "Node Zero flow rate surge to 58.5 L/min (+30.0% above 45.0 L/min baseline). Pipeline leak detected — automated 12V solenoid valve isolated. Trip threshold: >47.25 L/min (5% above rated capacity).",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "LEAK_DETECTED",
        severity: "CRITICAL",
        status: "UNREAD",
        message:
          "Pipeline leak detected. Node Zero flow surged to 58.5 L/min (+30.0% above rated 45.0 L/min). Leak trip threshold: >47.25 L/min (5%). Solenoid shutoff valve closed.",
      });
      broadcastSiteEvent(siteId, "leak.detected", {
        siteId,
        differencePercent: 30.0,
        thresholdPercent: 5.0,
        valveStatus: "CLOSED",
      });
      break;

    case "SENSOR_DRIFT": {
      const isAllSensors = process.env.VITE_ENABLE_ALL_SENSORS === "true";
      if (isAllSensors) {
        reading = { ...BASELINE_SAFE_READING, ph: 7.95 };
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
      } else {
        reading = { ...BASELINE_SAFE_READING, turbidity: 4.8 };
        sensorStatus = "DEGRADED";
        sensorDrift = 3.6;
        extraEvent = await createEvent({
          site_id: siteId,
          device_id: deviceId ?? null,
          type: "SENSOR_DRIFT",
          severity: "WARNING",
          message:
            "Optical turbidity nephelometer drift detected (+3.6 NTU). Calibration required.",
        });
        extraAlert = await createAlert({
          site_id: siteId,
          event_id: extraEvent?.id ?? null,
          type: "SENSOR_DRIFT",
          severity: "WARNING",
          status: "UNREAD",
          message:
            "Sensor health degraded: Turbidity probe drift exceeds 3.0 NTU tolerance. Calibration required.",
        });
        broadcastSiteEvent(siteId, "sensor.health-changed", {
          siteId,
          sensor: "turbidity",
          status: "DEGRADED",
          drift: 3.6,
        });
      }
      sensorDegradedCount = 1;
      calibrationRequired = true;
      break;
    }

    case "CALIBRATION_REQUIRED":
      calibrationRequired = true;
      sensorStatus = "CALIBRATION_REQUIRED";
      extraEvent = await createEvent({
        site_id: siteId,
        device_id: deviceId ?? null,
        type: "CALIBRATION_REQUIRED",
        severity: "WARNING",
        message: "Routine 30-day sensor calibration required for Node Zero.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "CALIBRATION_REQUIRED",
        severity: "WARNING",
        status: "UNREAD",
        message:
          "Sensor calibration required for Node Zero probes (30 days expired).",
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
          "Node Zero (IIITD Pilot) heartbeat timed out. Edge node state OFFLINE.",
      });
      extraAlert = await createAlert({
        site_id: siteId,
        event_id: extraEvent?.id ?? null,
        type: "DEVICE_OFFLINE",
        severity: "CRITICAL",
        status: "UNREAD",
        message:
          "Device offline: Node Zero (IIITD Pilot) lost edge telemetry connection.",
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
        message:
          "Node Zero (IIITD Pilot) reconnected. Autonomous edge telemetry streaming active.",
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
        message:
          "Node Zero (IIITD Pilot) reset to nominal baseline operational parameters.",
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

  const isLeak = reading.flowRate > 47.25 || flowMismatchPercent > 5.0; // 5% above rated 45.0 L/min
  const isValveClosed = isBlocked || isLeak;

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
    flow: {
      flowRate: reading.flowRate,
      nominalFlowRate: 45.0,
      mismatchPercent: flowMismatchPercent,
      leakStatus: isLeak ? "LEAK_DETECTED" : "NORMAL",
      valveStatus: isValveClosed ? "CLOSED" : "OPEN",
    },
    flowRate: reading.flowRate,
    nominalFlowRate: 45.0,
    mismatchPercent: flowMismatchPercent,
    valveStatus: isValveClosed ? "CLOSED" : "OPEN",
  });

  const finalAlert = extraAlert ?? safetyAlert;
  if (finalAlert) {
    broadcastSiteEvent(siteId, "alert.created", { siteId, alert: finalAlert });
  }

  // Actuate edge valve hardware over MQTT (Node Zero solenoid shutoff valve)
  const valveState: "OPEN" | "CLOSED" = isValveClosed ? "CLOSED" : "OPEN";
  const reason =
    safety.reasons[0] ??
    (isLeak
      ? "Pipeline leak detected by simulator"
      : `Simulator scenario: ${normalized}`);
  try {
    publishMqttValveActuation(siteId, valveState, reason);
  } catch (err) {
    console.warn("[Simulator] Failed to publish MQTT valve actuation:", err);
  }

  return {
    scenario: normalized,
    reading,
    flow: {
      flowRate: reading.flowRate,
      nominalFlowRate: 45.0,
      mismatchPercent: flowMismatchPercent,
      leakStatus: isLeak ? "LEAK_DETECTED" : "NORMAL",
      valveStatus: isValveClosed ? "CLOSED" : "OPEN",
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
