import type {
  QualityGateStatus,
  SafetyStatus,
  Severity,
  WaterReleaseStatus,
} from "../../lib/schemas/common";
import type { QualityConfiguration } from "../../lib/schemas/database";
import type { WaterQualityReading } from "../../lib/schemas/water-quality";

export interface SafetyViolation {
  parameter: string;
  value: number;
  threshold: string;
  severity: Severity;
  message: string;
}

export interface WaterSafetyResult {
  score: number; // 0 - 100
  confidence: number; // 0 - 100 (e.g., 95 or 98)
  status: SafetyStatus; // "SAFE" | "UNSAFE" | "UNKNOWN"
  qualityGate: QualityGateStatus; // "PASS" | "FAIL"
  waterRelease: WaterReleaseStatus; // "ALLOWED" | "BLOCKED"
  reasons: Array<string>; // Human-readable reasons
  violations: Array<SafetyViolation>;
  evaluatedAt: string;
}

export interface EvaluationOptions {
  flowMismatchPercent?: number;
  sensorDegradedCount?: number;
  calibrationRequired?: boolean;
}

const DEFAULT_CONFIG: QualityConfiguration = {
  id: "default",
  site_id: "default",
  min_ph: 6.5,
  max_ph: 8.5,
  max_tds: 500.0,
  max_turbidity: 5.0,
  max_flow_mismatch_percent: 15.0,
  updated_at: new Date().toISOString(),
};

export function evaluateWaterSafety(
  reading: WaterQualityReading,
  config?: QualityConfiguration | null,
  options?: EvaluationOptions,
): WaterSafetyResult {
  const activeConfig = config ?? DEFAULT_CONFIG;
  const violations: Array<SafetyViolation> = [];
  let totalPenalties = 0;

  // 1. pH evaluation (CRITICAL if outside bounds)
  if (reading.ph < activeConfig.min_ph || reading.ph > activeConfig.max_ph) {
    violations.push({
      parameter: "ph",
      value: reading.ph,
      threshold: `${activeConfig.min_ph} - ${activeConfig.max_ph}`,
      severity: "CRITICAL",
      message: `pH level ${reading.ph} is outside safe range (${activeConfig.min_ph} - ${activeConfig.max_ph})`,
    });
    totalPenalties += 35;
  }

  // 2. Heavy metals evaluation (CRITICAL if > 0.10)
  if (reading.heavyMetals > 0.1) {
    violations.push({
      parameter: "heavyMetals",
      value: reading.heavyMetals,
      threshold: "<= 0.10",
      severity: "CRITICAL",
      message: `Heavy metals level ${reading.heavyMetals} exceeds safe limit of 0.10`,
    });
    totalPenalties += 45;
  }

  // 3. Turbidity evaluation (WARNING if > max_turbidity)
  if (reading.turbidity > activeConfig.max_turbidity) {
    violations.push({
      parameter: "turbidity",
      value: reading.turbidity,
      threshold: `<=${activeConfig.max_turbidity} NTU`,
      severity: "WARNING",
      message: `Turbidity ${reading.turbidity} NTU exceeds maximum threshold of ${activeConfig.max_turbidity} NTU`,
    });
    totalPenalties += 20;
  }

  // 4. Total Dissolved Solids (TDS) evaluation (WARNING if > max_tds)
  if (reading.tds > activeConfig.max_tds) {
    violations.push({
      parameter: "tds",
      value: reading.tds,
      threshold: `<=${activeConfig.max_tds} ppm`,
      severity: "WARNING",
      message: `TDS ${reading.tds} ppm exceeds maximum threshold of ${activeConfig.max_tds} ppm`,
    });
    totalPenalties += 20;
  }

  // 5. Dissolved Oxygen (DO) evaluation (WARNING if < 4.0 mg/L)
  if (reading.dissolvedOxygen < 4.0) {
    violations.push({
      parameter: "dissolvedOxygen",
      value: reading.dissolvedOxygen,
      threshold: ">= 4.0 mg/L",
      severity: "WARNING",
      message: `Dissolved Oxygen ${reading.dissolvedOxygen} mg/L is below minimum required 4.0 mg/L`,
    });
    totalPenalties += 15;
  }

  // 6. Flow mismatch / Leak detection (CRITICAL if > max_flow_mismatch_percent)
  const flowMismatch = options?.flowMismatchPercent ?? 0;
  if (flowMismatch > activeConfig.max_flow_mismatch_percent) {
    violations.push({
      parameter: "flowMismatch",
      value: flowMismatch,
      threshold: `<=${activeConfig.max_flow_mismatch_percent}%`,
      severity: "CRITICAL",
      message: `Flow mismatch ${flowMismatch.toFixed(1)}% exceeds threshold of ${activeConfig.max_flow_mismatch_percent}% (potential leak)`,
    });
    totalPenalties += 40;
  }

  // Calculate score and gate status
  const safetyScore = Math.max(0, 100 - totalPenalties);
  const hasCriticalViolation = violations.some(
    (v) => v.severity === "CRITICAL",
  );

  const qualityGate: QualityGateStatus =
    hasCriticalViolation || safetyScore < 70 ? "FAIL" : "PASS";
  const safetyStatus: SafetyStatus = qualityGate === "PASS" ? "SAFE" : "UNSAFE";
  const waterRelease: WaterReleaseStatus =
    qualityGate === "PASS" ? "ALLOWED" : "BLOCKED";

  // Calculate deterministic confidence based on sensor health & drift
  let confidenceDeductions = 0;
  if (options?.sensorDegradedCount) {
    confidenceDeductions += options.sensorDegradedCount * 10;
  }
  if (options?.calibrationRequired) {
    confidenceDeductions += 15;
  }
  const confidence = Math.max(50, Math.min(100, 98 - confidenceDeductions));

  // Human-readable reasons array
  const reasons = violations.map((v) => v.message);

  return {
    score: safetyScore,
    confidence,
    status: safetyStatus,
    qualityGate,
    waterRelease,
    reasons,
    violations,
    evaluatedAt: new Date().toISOString(),
  };
}
