import type { AlertRecord } from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

export interface InsertAlert {
  site_id: string;
  event_id?: string | null;
  type: string;
  severity?: "WARNING" | "CRITICAL";
  status?: "UNREAD" | "READ" | "ACKNOWLEDGED";
  message: string;
}

export interface GetAlertsOptions {
  siteId?: string;
  severity?: string;
  status?: string;
  limit?: number;
}

function mapAlert(raw: any): AlertRecord {
  return {
    id: raw.id,
    site_id: raw.siteId,
    event_id: raw.eventId,
    type: raw.type,
    severity: raw.severity,
    status: raw.status,
    message: raw.message,
    acknowledged_at:
      raw.acknowledgedAt instanceof Date
        ? raw.acknowledgedAt.toISOString()
        : raw.acknowledgedAt || null,
    acknowledged_by: raw.acknowledgedBy || null,
    created_at:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt || new Date().toISOString()),
  };
}

export async function getAlerts(
  options?: GetAlertsOptions,
): Promise<Array<AlertRecord>> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return [];
  }

  try {
    const where: any = {};
    if (options?.siteId) where.siteId = options.siteId;
    if (options?.severity) where.severity = options.severity;
    if (options?.status) where.status = options.status;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit,
    });

    return alerts.map(mapAlert);
  } catch (err) {
    console.error("Error fetching alerts with Prisma:", err);
    return [];
  }
}

export async function getAlertById(id: string): Promise<AlertRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return null;
    }

    return mapAlert(alert);
  } catch (err) {
    console.error("Error fetching alert by id with Prisma:", err);
    return null;
  }
}

export async function createAlert(
  alert: InsertAlert,
): Promise<AlertRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const created = await prisma.alert.create({
      data: {
        siteId: alert.site_id,
        eventId: alert.event_id ?? null,
        type: alert.type,
        severity: (alert.severity as any) ?? "WARNING",
        status: (alert.status as any) ?? "UNREAD",
        message: alert.message,
      },
    });

    return mapAlert(created);
  } catch (err) {
    console.error("Error creating alert with Prisma:", err);
    return null;
  }
}

export async function acknowledgeAlert(
  id: string,
  userId?: string,
): Promise<AlertRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        acknowledgedBy: userId ?? null,
      },
    });

    return mapAlert(updated);
  } catch (err) {
    console.error("Error acknowledging alert with Prisma:", err);
    return null;
  }
}
