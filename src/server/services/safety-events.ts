import type { AlertRecord, EventRecord } from "../../lib/schemas/database";
import { createAlert, getAlerts } from "../repositories/alerts";
import { createEvent } from "../repositories/events";
import type { WaterSafetyResult } from "./water-safety";

export interface SafetyEventsResult {
  event: EventRecord | null;
  alert: AlertRecord | null;
}

/**
 * Automatically creates Event and Alert records when water quality violates safety thresholds.
 */
export async function handleSafetyEvents(
  siteId: string,
  safety: WaterSafetyResult,
  deviceId?: string | null,
): Promise<SafetyEventsResult> {
  // If water safety passed without violations, no alert needed
  if (safety.qualityGate === "PASS") {
    return { event: null, alert: null };
  }

  const hasCritical = safety.violations.some((v) => v.severity === "CRITICAL");
  const severity = hasCritical ? "CRITICAL" : "WARNING";

  const violationSummary = safety.violations
    .map((v) => `${v.parameter} (${v.value})`)
    .join(", ");

  const message = `Water Quality ${safety.status}: Score ${safety.score}/100. Violations: ${violationSummary}. Water release ${safety.waterRelease.toLowerCase()}.`;

  // 1. Create Event record
  const event = await createEvent({
    site_id: siteId,
    device_id: deviceId ?? null,
    type: "WATER_QUALITY_UNSAFE",
    severity,
    message,
    acknowledged: false,
  });

  // 2. Check for existing UNREAD alert to avoid spamming duplicates
  const existingAlerts = await getAlerts({
    siteId,
    status: "UNREAD",
    limit: 3,
  });

  const duplicateAlert = existingAlerts.find(
    (a) => a.type === "QUALITY_GATE_FAILURE" && a.severity === severity,
  );

  let alert: AlertRecord | null = null;
  if (!duplicateAlert) {
    alert = await createAlert({
      site_id: siteId,
      event_id: event?.id ?? null,
      type: "QUALITY_GATE_FAILURE",
      severity,
      status: "UNREAD",
      message,
    });
  } else {
    alert = duplicateAlert;
  }

  return { event, alert };
}
