import type { SensorCalibrationRecord } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

export interface InsertSensorCalibration {
  site_id: string;
  device_id?: string | null;
  sensor: string;
  status?: "HEALTHY" | "DEGRADED" | "CALIBRATION_REQUIRED" | "FAULT";
  offset?: number;
  last_calibrated_at?: string;
  next_calibration_at?: string;
}

const DEFAULT_CALIBRATIONS: Array<
  Omit<SensorCalibrationRecord, "id" | "site_id">
> = [
  {
    device_id: null,
    sensor: "ph",
    status: "HEALTHY",
    offset: 0.0,
    last_calibrated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    next_calibration_at: new Date(Date.now() + 20 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    device_id: null,
    sensor: "tds",
    status: "HEALTHY",
    offset: 0.0,
    last_calibrated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    next_calibration_at: new Date(Date.now() + 20 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    device_id: null,
    sensor: "turbidity",
    status: "HEALTHY",
    offset: 0.0,
    last_calibrated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    next_calibration_at: new Date(Date.now() + 20 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

export async function getCalibrationsBySiteId(
  siteId: string,
): Promise<Array<SensorCalibrationRecord>> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return DEFAULT_CALIBRATIONS.map((c, i) => ({
      id: `default-cal-${i}`,
      site_id: siteId,
      ...c,
    }));
  }

  const { data, error } = await supabase
    .from("sensor_calibrations")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return DEFAULT_CALIBRATIONS.map((c, i) => ({
      id: `default-cal-${i}`,
      site_id: siteId,
      ...c,
    }));
  }

  return data as Array<SensorCalibrationRecord>;
}

export async function recordCalibration(
  calibration: InsertSensorCalibration,
): Promise<SensorCalibrationRecord | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return {
      id: "mem-cal-" + Date.now(),
      site_id: calibration.site_id,
      device_id: calibration.device_id ?? null,
      sensor: calibration.sensor,
      status: calibration.status ?? "HEALTHY",
      offset: calibration.offset ?? 0.0,
      last_calibrated_at:
        calibration.last_calibrated_at ?? new Date().toISOString(),
      next_calibration_at:
        calibration.next_calibration_at ??
        new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase
    .from("sensor_calibrations")
    .insert({
      site_id: calibration.site_id,
      device_id: calibration.device_id ?? null,
      sensor: calibration.sensor,
      status: calibration.status ?? "HEALTHY",
      offset: calibration.offset ?? 0.0,
      last_calibrated_at:
        calibration.last_calibrated_at ?? new Date().toISOString(),
      next_calibration_at:
        calibration.next_calibration_at ??
        new Date(Date.now() + 30 * 86400000).toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating sensor calibration:", error);
    return null;
  }

  return data as SensorCalibrationRecord;
}
