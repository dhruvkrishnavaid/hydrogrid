import type { Device } from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

export interface InsertDevice {
  site_id: string;
  name: string;
  type: "SOURCE_SENSOR_NODE" | "PURIFICATION_CONTROLLER" | "DISTRIBUTION_NODE";
  status?: "ONLINE" | "DEGRADED" | "OFFLINE" | "FAULT";
  firmware_version?: string;
}

const DEFAULT_DEMO_DEVICES: Array<Device> = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    site_id: "00000000-0000-0000-0000-000000000001",
    name: "Node Zero",
    type: "SOURCE_SENSOR_NODE",
    status: "ONLINE",
    firmware_version: "v1.0.0-prototype",
    last_seen_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  ...(process.env.VITE_ENABLE_PURIFICATION === "true"
    ? [
        {
          id: "00000000-0000-0000-0000-000000000102",
          site_id: "00000000-0000-0000-0000-000000000001",
          name: "Purification Core PLC",
          type: "PURIFICATION_CONTROLLER" as const,
          status: "ONLINE" as const,
          firmware_version: "v3.0.0",
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: "00000000-0000-0000-0000-000000000103",
          site_id: "00000000-0000-0000-0000-000000000001",
          name: "Distribution Flow Monitor",
          type: "DISTRIBUTION_NODE" as const,
          status: "ONLINE" as const,
          firmware_version: "v1.8.2",
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ]
    : []),
];

function mapDevice(raw: any): Device {
  return {
    id: raw.id,
    site_id: raw.siteId,
    name: raw.name,
    type: raw.type,
    status: raw.status,
    firmware_version: raw.firmwareVersion,
    last_seen_at:
      raw.lastSeenAt instanceof Date
        ? raw.lastSeenAt.toISOString()
        : String(raw.lastSeenAt || new Date().toISOString()),
    created_at:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt || new Date().toISOString()),
  };
}

export async function getDevicesBySiteId(
  siteId: string,
): Promise<Array<Device>> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return DEFAULT_DEMO_DEVICES;
  }

  try {
    const devices = await prisma.device.findMany({
      where: { siteId },
      orderBy: { createdAt: "asc" },
    });

    if (!devices || devices.length === 0) {
      return DEFAULT_DEMO_DEVICES;
    }

    return devices.map(mapDevice);
  } catch (err) {
    console.error("Error fetching devices with Prisma:", err);
    return DEFAULT_DEMO_DEVICES;
  }
}

export async function getDeviceById(id: string): Promise<Device | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return null;
    }

    return mapDevice(device);
  } catch (err) {
    console.error("Error fetching device by id with Prisma:", err);
    return null;
  }
}

export async function createDevice(
  device: InsertDevice,
): Promise<Device | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const created = await prisma.device.create({
      data: {
        siteId: device.site_id,
        name: device.name,
        type: device.type,
        status: device.status ?? "ONLINE",
        firmwareVersion: device.firmware_version ?? "1.0.0",
      },
    });

    return mapDevice(created);
  } catch (err) {
    console.error("Error creating device with Prisma:", err);
    return null;
  }
}
