/**
 * Hardware Prototype Feature Flags
 *
 * Controls whether the 4-stage purification module and full multi-sensor suite
 * are rendered, or whether the interface runs in the single-node physical prototype
 * profile ("Node Zero" at IIITD).
 */

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const metaVal =
    typeof import.meta !== "undefined"
      ? (import.meta as unknown as { env?: Record<string, string> }).env?.[key]
      : undefined;
  const processVal =
    typeof process !== "undefined" ? process.env?.[key] : undefined;
  const val = metaVal ?? processVal;

  if (val === undefined || val === "") {
    return defaultValue;
  }
  return val === "true" || val === "1";
}

export const FEATURES = {
  /**
   * 4-Stage Multi-Barrier Purification System
   * When false, all UI references, cards, and navigation links to the purification
   * module are commented out / hidden.
   * Default: false (hardware prototype profile).
   */
  PURIFICATION: getEnvBool("VITE_ENABLE_PURIFICATION", false),

  /**
   * Complete 9-Parameter Sensing Suite
   * When false, only the physical sensors present on Node Zero (Turbidity, Temperature, Flow Rate)
   * are displayed in the UI. Dummy telemetry for other detections (pH, metals, TDS, DO, EC, hardness)
   * is preserved in backend models, database, and simulator.
   * Default: false (hardware prototype profile).
   */
  ALL_SENSORS: getEnvBool("VITE_ENABLE_ALL_SENSORS", false),
};

/**
 * List of sensor parameter keys active on the Node Zero physical prototype.
 */
export const PROTOTYPE_SENSOR_KEYS = [
  "turbidity",
  "temperature",
  "flowRate",
] as const;

export type PrototypeSensorKey = (typeof PROTOTYPE_SENSOR_KEYS)[number];

/**
 * Returns true if a given parameter key is enabled under the current feature flags.
 */
export function isSensorKeyEnabled(key: string): boolean {
  if (FEATURES.ALL_SENSORS) {
    return true;
  }
  return (PROTOTYPE_SENSOR_KEYS as ReadonlyArray<string>).includes(key);
}
