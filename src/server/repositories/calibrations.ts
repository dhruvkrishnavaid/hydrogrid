import type { SensorCalibrationRecord } from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

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

function mapCalibration(raw: any): SensorCalibrationRecord {
  return {
    id: raw.id,
    site_id: raw.siteId,
    device_id: raw.deviceId || null,
    sensor: raw.sensor,
    status: raw.status,
    offset: raw.offset,
    last_calibrated_at:
      raw.lastCalibratedAt instanceof Date
        ? raw.lastCalibratedAt.toISOString()
        : String(raw.lastCalibratedAt || new Date().toISOString()),
    next_calibration_at:
      raw.nextCalibrationAt instanceof Date
        ? raw.nextCalibrationAt.toISOString()
        : String(raw.nextCalibrationAt || new Date().toISOString()),
    created_at:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt || new Date().toISOString()),
  };
}

export async function getCalibrationsBySiteId(
  siteId: string,
): Promise<Array<SensorCalibrationRecord>> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return DEFAULT_CALIBRATIONS.map((c, i) => ({
      id: `default-cal-${i}`,
      site_id: siteId,
      ...c,
    }));
  }

  try {
    const calibrations = await prisma.sensorCalibration.findMany({
      where: { siteId },
      orderBy: { createdAt: "asc" },
    });

    if (!calibrations || calibrations.length === 0) {
      return DEFAULT_CALIBRATIONS.map((c, i) => ({
        id: `default-cal-${i}`,
        site_id: siteId,
        ...c,
      }));
    }

    return calibrations.map(mapCalibration);
  } catch (err) {
    console.error("Error fetching calibrations with Prisma:", err);
    return DEFAULT_CALIBRATIONS.map((c, i) => ({
      id: `default-cal-${i}`,
      site_id: siteId,
      ...c,
    }));
  }
}

export async function recordCalibration(
  calibration: InsertSensorCalibration,
): Promise<SensorCalibrationRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
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

  try {
    const created = await prisma.sensorCalibration.create({
      data: {
        siteId: calibration.site_id,
        deviceId: calibration.device_id ?? null,
        sensor: calibration.sensor,
        status: (calibration.status as any) ?? "HEALTHY",
        offset: calibration.offset ?? 0.0,
        lastCalibratedAt: calibration.last_calibrated_at
          ? new Date(calibration.last_calibrated_at)
          : new Date(),
        nextCalibrationAt: calibration.next_calibration_at
          ? new Date(calibration.next_calibration_at)
          : new Date(Date.now() + 30 * 86400000),
      },
    });

    return mapCalibration(created);
  } catch (err) {
    console.error("Error creating sensor calibration with Prisma:", err);
    return null;
  }
}
