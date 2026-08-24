import { z } from "zod";

// Core system status states (from frozen MVP docs)
export const SafetyStatusEnum = z.enum(["SAFE", "UNSAFE", "UNKNOWN"]);
export type SafetyStatus = z.infer<typeof SafetyStatusEnum>;

export const QualityGateStatusEnum = z.enum(["PASS", "FAIL"]);
export type QualityGateStatus = z.infer<typeof QualityGateStatusEnum>;

export const WaterReleaseStatusEnum = z.enum(["ALLOWED", "BLOCKED"]);
export type WaterReleaseStatus = z.infer<typeof WaterReleaseStatusEnum>;

export const DeviceStatusEnum = z.enum([
  "ONLINE",
  "DEGRADED",
  "OFFLINE",
  "FAULT",
]);
export type DeviceStatus = z.infer<typeof DeviceStatusEnum>;

export const SensorStatusEnum = z.enum([
  "HEALTHY",
  "DEGRADED",
  "CALIBRATION_REQUIRED",
  "FAULT",
]);
export type SensorStatus = z.infer<typeof SensorStatusEnum>;

export const SeverityEnum = z.enum(["INFO", "WARNING", "CRITICAL"]);
export type Severity = z.infer<typeof SeverityEnum>;

export const LeakStatusEnum = z.enum(["NORMAL", "LEAK_DETECTED", "ISOLATED"]);
export type LeakStatus = z.infer<typeof LeakStatusEnum>;

export const ValveStatusEnum = z.enum(["OPEN", "CLOSED"]);
export type ValveStatus = z.infer<typeof ValveStatusEnum>;

export const AlertStatusEnum = z.enum(["UNREAD", "READ", "ACKNOWLEDGED"]);
export type AlertStatus = z.infer<typeof AlertStatusEnum>;

// Time range query schema
export const TimeQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  interval: z.string().optional().default("5m"),
});
export type TimeQuery = z.infer<typeof TimeQuerySchema>;

// Standard API response envelope schemas
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export function createApiSuccessSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
  });
}
