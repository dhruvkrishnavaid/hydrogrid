import { describe, expect, it } from "bun:test";

import {
  executeSimulatorScenario,
  isValidScenario,
  normalizeScenario,
  VALID_SCENARIOS,
} from "../../src/server/services/simulator";

describe("Strict Simulator Scenario Validation", () => {
  it("recognizes all standard and alias scenario names", () => {
    for (const scenario of VALID_SCENARIOS) {
      expect(isValidScenario(scenario)).toBe(true);
      expect(isValidScenario(scenario.toLowerCase())).toBe(true);
      expect(isValidScenario(scenario.replace(/_/g, "-"))).toBe(true);
    }
  });

  it("normalizes aliases correctly", () => {
    expect(normalizeScenario("NORMAL")).toBe("SAFE");
    expect(normalizeScenario("normal")).toBe("SAFE");
    expect(normalizeScenario("QUALITY_FAILURE")).toBe("UNSAFE_HEAVY_METALS");
    expect(normalizeScenario("quality-failure")).toBe("UNSAFE_HEAVY_METALS");
    expect(normalizeScenario("LEAK")).toBe("LEAK_DETECTED");
    expect(normalizeScenario("leak")).toBe("LEAK_DETECTED");
    expect(normalizeScenario("TURBIDITY_SPILL")).toBe("UNSAFE_TURBIDITY");
    expect(normalizeScenario("turbidity-spill")).toBe("UNSAFE_TURBIDITY");
    expect(normalizeScenario("THERMAL_ANOMALY")).toBe("UNSAFE_TEMPERATURE");
    expect(normalizeScenario("thermal-anomaly")).toBe("UNSAFE_TEMPERATURE");
    expect(normalizeScenario("TURBIDITY_DRIFT")).toBe("SENSOR_DRIFT");
    expect(normalizeScenario("turbidity-drift")).toBe("SENSOR_DRIFT");
  });

  it("rejects unknown scenario names and returns null", () => {
    expect(isValidScenario("UNKNOWN_BOGUS_SCENARIO")).toBe(false);
    expect(isValidScenario("MAGIC_WATER")).toBe(false);
    expect(isValidScenario("")).toBe(false);

    expect(normalizeScenario("UNKNOWN_BOGUS_SCENARIO")).toBeNull();
    expect(normalizeScenario("INVALID_SCENARIO")).toBeNull();
  });

  it("executeSimulatorScenario throws Error on invalid scenario name", () => {
    expect(
      executeSimulatorScenario("test-site", "BOGUS_SCENARIO"),
    ).rejects.toThrow("Invalid simulation scenario: 'BOGUS_SCENARIO'");
  });
});
