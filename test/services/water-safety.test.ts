import { describe, expect, it } from "bun:test";

import type { QualityConfiguration } from "../../src/lib/schemas/database";
import type { WaterQualityReading } from "../../src/lib/schemas/water-quality";
import { evaluateWaterSafety } from "../../src/server/services/water-safety";

describe("Water Safety Evaluation Service", () => {
  const mockConfig: QualityConfiguration = {
    id: "test-config-id",
    site_id: "test-site-id",
    min_ph: 6.5,
    max_ph: 8.5,
    max_tds: 500.0,
    max_turbidity: 5.0,
    max_flow_mismatch_percent: 15.0,
    updated_at: new Date().toISOString(),
  };

  const safeReading: WaterQualityReading = {
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

  it("evaluates safe reading as PASS and ALLOWED with score 100 and confidence 98", () => {
    const result = evaluateWaterSafety(safeReading, mockConfig);

    expect(result.score).toBe(100);
    expect(result.confidence).toBe(98);
    expect(result.status).toBe("SAFE");
    expect(result.qualityGate).toBe("PASS");
    expect(result.waterRelease).toBe("ALLOWED");
    expect(result.violations).toHaveLength(0);
    expect(result.reasons).toHaveLength(0);
  });

  it("evaluates high heavy metals as CRITICAL, FAIL, and BLOCKED with reason string", () => {
    const contaminated: WaterQualityReading = {
      ...safeReading,
      heavyMetals: 0.85,
    };
    const result = evaluateWaterSafety(contaminated, mockConfig);

    expect(result.score).toBe(55); // 100 - 45
    expect(result.status).toBe("UNSAFE");
    expect(result.qualityGate).toBe("FAIL");
    expect(result.waterRelease).toBe("BLOCKED");
    expect(result.violations.some((v) => v.parameter === "heavyMetals")).toBe(
      true,
    );
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain("Heavy metals");
  });

  it("evaluates acidic pH (< 6.5) as CRITICAL, FAIL, and BLOCKED", () => {
    const acidic: WaterQualityReading = {
      ...safeReading,
      ph: 4.2,
    };
    const result = evaluateWaterSafety(acidic, mockConfig);

    expect(result.score).toBe(65); // 100 - 35
    expect(result.status).toBe("UNSAFE");
    expect(result.qualityGate).toBe("FAIL");
    expect(result.waterRelease).toBe("BLOCKED");
    expect(result.reasons[0]).toContain("pH level 4.2");
  });

  it("evaluates high turbidity (> 5.0) as WARNING with penalty", () => {
    const turbid: WaterQualityReading = {
      ...safeReading,
      turbidity: 18.5,
    };
    const result = evaluateWaterSafety(turbid, mockConfig);

    expect(result.score).toBe(80); // 100 - 20
    expect(result.violations.some((v) => v.parameter === "turbidity")).toBe(
      true,
    );
  });

  it("evaluates severe multi-parameter contamination with combined penalties", () => {
    const severe: WaterQualityReading = {
      ...safeReading,
      ph: 4.2, // -35 CRITICAL
      heavyMetals: 0.85, // -45 CRITICAL
      turbidity: 18.5, // -20 WARNING
      tds: 850.0, // -20 WARNING
    };
    const result = evaluateWaterSafety(severe, mockConfig);

    expect(result.score).toBe(0); // 100 - 120 -> clamped to 0
    expect(result.status).toBe("UNSAFE");
    expect(result.qualityGate).toBe("FAIL");
    expect(result.waterRelease).toBe("BLOCKED");
    expect(result.violations).toHaveLength(4);
    expect(result.reasons).toHaveLength(4);
  });

  it("evaluates flow mismatch exceeding threshold as CRITICAL", () => {
    const result = evaluateWaterSafety(safeReading, mockConfig, {
      flowMismatchPercent: 28.8,
    });

    expect(result.score).toBe(60); // 100 - 40
    expect(result.status).toBe("UNSAFE");
    expect(result.qualityGate).toBe("FAIL");
    expect(result.waterRelease).toBe("BLOCKED");
    expect(result.violations.some((v) => v.parameter === "flowMismatch")).toBe(
      true,
    );
  });

  it("adjusts confidence downwards when sensor drift/degradation is present", () => {
    const result = evaluateWaterSafety(safeReading, mockConfig, {
      sensorDegradedCount: 1,
      calibrationRequired: true,
    });

    expect(result.confidence).toBe(73); // 98 - 10 - 15 = 73
  });
});
