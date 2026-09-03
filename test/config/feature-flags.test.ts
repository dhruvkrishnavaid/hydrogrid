import { describe, expect, it } from "bun:test";

import {
  FEATURES,
  PROTOTYPE_SENSOR_KEYS,
  isSensorKeyEnabled,
} from "../../src/lib/feature-flags";

describe("Prototype Feature Flags & Channel Gating", () => {
  it("defaults purification feature flag to boolean", () => {
    expect(typeof FEATURES.PURIFICATION).toBe("boolean");
  });

  it("defaults all_sensors feature flag to boolean", () => {
    expect(typeof FEATURES.ALL_SENSORS).toBe("boolean");
  });

  it("identifies prototype sensor keys correctly", () => {
    expect(PROTOTYPE_SENSOR_KEYS).toContain("turbidity");
    expect(PROTOTYPE_SENSOR_KEYS).toContain("temperature");
    expect(PROTOTYPE_SENSOR_KEYS).toContain("flowRate");
    expect(PROTOTYPE_SENSOR_KEYS.length).toBe(3);
  });

  it("correctly evaluates isSensorKeyEnabled based on active flags", () => {
    // Turbidity, temperature, and flowRate must always be enabled
    expect(isSensorKeyEnabled("turbidity")).toBe(true);
    expect(isSensorKeyEnabled("temperature")).toBe(true);
    expect(isSensorKeyEnabled("flowRate")).toBe(true);

    if (!FEATURES.ALL_SENSORS) {
      // In prototype profile, non-prototype sensors must be disabled
      expect(isSensorKeyEnabled("ph")).toBe(false);
      expect(isSensorKeyEnabled("heavyMetals")).toBe(false);
      expect(isSensorKeyEnabled("dissolvedOxygen")).toBe(false);
      expect(isSensorKeyEnabled("tds")).toBe(false);
      expect(isSensorKeyEnabled("electricalConductivity")).toBe(false);
      expect(isSensorKeyEnabled("hardness")).toBe(false);
    } else {
      // In full facility profile, all sensors are enabled
      expect(isSensorKeyEnabled("ph")).toBe(true);
      expect(isSensorKeyEnabled("heavyMetals")).toBe(true);
    }
  });
});
