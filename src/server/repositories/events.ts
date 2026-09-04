import type { EventRecord } from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

export interface InsertEvent {
  site_id: string;
  device_id?: string | null;
  type: string;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  acknowledged?: boolean;
}

export interface GetEventsOptions {
  type?: string;
  severity?: string;
  limit?: number;
  from?: string;
  to?: string;
}

function mapEvent(raw: any): EventRecord {
  return {
    id: raw.id,
    site_id: raw.siteId,
    device_id: raw.deviceId,
    type: raw.type,
    severity: raw.severity,
    message: raw.message,
    acknowledged: raw.acknowledged,
    created_at:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt || new Date().toISOString()),
  };
}

export async function getEventsBySiteId(
  siteId: string,
  options?: GetEventsOptions,
): Promise<Array<EventRecord>> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return [];
  }

  try {
    const where: any = { siteId };
    if (options?.type) {
      where.type = options.type;
    }
    if (options?.severity) {
      where.severity = options.severity;
    }
    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options?.from) where.createdAt.gte = new Date(options.from);
      if (options?.to) where.createdAt.lte = new Date(options.to);
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit,
    });

    return events.map(mapEvent);
  } catch (err) {
    console.error("Error fetching events with Prisma:", err);
    return [];
  }
}

export async function createEvent(
  event: InsertEvent,
): Promise<EventRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const created = await prisma.event.create({
      data: {
        siteId: event.site_id,
        deviceId: event.device_id ?? null,
        type: event.type,
        severity: (event.severity as any) ?? "INFO",
        message: event.message,
        acknowledged: event.acknowledged ?? false,
      },
    });

    return mapEvent(created);
  } catch (err) {
    console.error("Error creating event with Prisma:", err);
    return null;
  }
}
