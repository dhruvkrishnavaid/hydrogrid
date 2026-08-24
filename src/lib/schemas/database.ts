import { z } from "zod";

import {
  AlertStatusEnum,
  DeviceStatusEnum,
  SensorStatusEnum,
  SeverityEnum,
} from "./common";

// User roles for site authorization
export const UserRoleEnum = z.enum(["ADMIN", "OPERATOR", "VIEWER"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const SiteStatusEnum = z.enum(["ONLINE", "OFFLINE", "DEGRADED"]);
export type SiteStatus = z.infer<typeof SiteStatusEnum>;

export const DeviceTypeEnum = z.enum([
  "SOURCE_SENSOR_NODE",
  "PURIFICATION_CONTROLLER",
  "DISTRIBUTION_NODE",
]);
export type DeviceType = z.infer<typeof DeviceTypeEnum>;

export const FilterTypeEnum = z.enum(["SEDIMENT", "CARBON", "CALCITE", "UV"]);
export type FilterType = z.infer<typeof FilterTypeEnum>;

export const FilterStatusEnum = z.enum([
  "HEALTHY",
  "WARNING",
  "DEGRADED",
  "FAULT",
]);
export type FilterStatus = z.infer<typeof FilterStatusEnum>;

// Database Entity Schemas
export const SiteSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  village: z.string(),
  district: z.string(),
  state: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  status: SiteStatusEnum,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Site = z.infer<typeof SiteSchema>;

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  name: z.string(),
  type: DeviceTypeEnum,
  status: DeviceStatusEnum,
  firmware_version: z.string(),
  last_seen_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type Device = z.infer<typeof DeviceSchema>;

export const SiteMembershipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  site_id: z.string().uuid(),
  role: UserRoleEnum,
  created_at: z.string().datetime(),
});
export type SiteMembership = z.infer<typeof SiteMembershipSchema>;

export const QualityConfigurationSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  min_ph: z.number(),
  max_ph: z.number(),
  max_tds: z.number(),
  max_turbidity: z.number(),
  max_flow_mismatch_percent: z.number(),
  updated_at: z.string().datetime(),
});
export type QualityConfiguration = z.infer<typeof QualityConfigurationSchema>;

export const EventRecordSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  device_id: z.string().uuid().nullable().optional(),
  type: z.string(),
  severity: SeverityEnum,
  message: z.string(),
  acknowledged: z.boolean(),
  created_at: z.string().datetime(),
});
export type EventRecord = z.infer<typeof EventRecordSchema>;

export const AlertRecordSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  event_id: z.string().uuid().nullable().optional(),
  type: z.string(),
  severity: z.enum(["WARNING", "CRITICAL"]),
  status: AlertStatusEnum,
  message: z.string(),
  acknowledged_at: z.string().datetime().nullable().optional(),
  acknowledged_by: z.string().uuid().nullable().optional(),
  created_at: z.string().datetime(),
});
export type AlertRecord = z.infer<typeof AlertRecordSchema>;

export const SensorCalibrationRecordSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  device_id: z.string().uuid().nullable().optional(),
  sensor: z.string(),
  status: SensorStatusEnum,
  offset: z.number(),
  last_calibrated_at: z.string().datetime(),
  next_calibration_at: z.string().datetime(),
  created_at: z.string().datetime(),
});
export type SensorCalibrationRecord = z.infer<
  typeof SensorCalibrationRecordSchema
>;

export const FilterMaintenanceRecordSchema = z.object({
  id: z.string().uuid(),
  site_id: z.string().uuid(),
  filter_type: FilterTypeEnum,
  status: FilterStatusEnum,
  life_percent: z.number(),
  last_serviced_at: z.string().datetime(),
  next_service_due_at: z.string().datetime(),
  notes: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});
export type FilterMaintenanceRecord = z.infer<
  typeof FilterMaintenanceRecordSchema
>;
