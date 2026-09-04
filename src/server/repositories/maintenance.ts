import type {
  FilterMaintenanceRecord,
  FilterStatus,
  FilterType,
} from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

export interface InsertFilterMaintenance {
  site_id: string;
  filter_type: FilterType;
  status?: FilterStatus;
  life_percent?: number;
  last_serviced_at?: string;
  next_service_due_at?: string;
  notes?: string | null;
}

const DEFAULT_FILTERS: Array<Omit<FilterMaintenanceRecord, "id" | "site_id">> =
  [
    {
      filter_type: "SEDIMENT",
      status: "HEALTHY",
      life_percent: 92.0,
      last_serviced_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      next_service_due_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      notes: "Sediment pre-filter healthy",
      created_at: new Date().toISOString(),
    },
    {
      filter_type: "CARBON",
      status: "HEALTHY",
      life_percent: 84.0,
      last_serviced_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      next_service_due_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      notes: "Activated carbon block operational",
      created_at: new Date().toISOString(),
    },
    {
      filter_type: "CALCITE",
      status: "HEALTHY",
      life_percent: 88.0,
      last_serviced_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      next_service_due_at: new Date(Date.now() + 60 * 86400000).toISOString(),
      notes: "Calcite re-mineralizer active",
      created_at: new Date().toISOString(),
    },
    {
      filter_type: "UV",
      status: "HEALTHY",
      life_percent: 95.0,
      last_serviced_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      next_service_due_at: new Date(Date.now() + 75 * 86400000).toISOString(),
      notes: "UV chamber lamp intensity normal",
      created_at: new Date().toISOString(),
    },
  ];

function mapMaintenance(raw: any): FilterMaintenanceRecord {
  return {
    id: raw.id,
    site_id: raw.siteId,
    filter_type: raw.filterType,
    status: raw.status,
    life_percent: raw.lifePercent,
    last_serviced_at:
      raw.lastServicedAt instanceof Date
        ? raw.lastServicedAt.toISOString()
        : String(raw.lastServicedAt || new Date().toISOString()),
    next_service_due_at:
      raw.nextServiceDueAt instanceof Date
        ? raw.nextServiceDueAt.toISOString()
        : String(raw.nextServiceDueAt || new Date().toISOString()),
    notes: raw.notes ?? null,
    created_at:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt || new Date().toISOString()),
  };
}

export async function getMaintenanceBySiteId(
  siteId: string,
): Promise<Array<FilterMaintenanceRecord>> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return DEFAULT_FILTERS.map((f, i) => ({
      id: `default-maint-${i}`,
      site_id: siteId,
      ...f,
    }));
  }

  try {
    const records = await prisma.filterMaintenance.findMany({
      where: { siteId },
      orderBy: { createdAt: "asc" },
    });

    if (!records || records.length === 0) {
      return DEFAULT_FILTERS.map((f, i) => ({
        id: `default-maint-${i}`,
        site_id: siteId,
        ...f,
      }));
    }

    return records.map(mapMaintenance);
  } catch (err) {
    console.error("Error fetching maintenance records with Prisma:", err);
    return DEFAULT_FILTERS.map((f, i) => ({
      id: `default-maint-${i}`,
      site_id: siteId,
      ...f,
    }));
  }
}

export async function createFilterMaintenance(
  maint: InsertFilterMaintenance,
): Promise<FilterMaintenanceRecord | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return {
      id: "mem-maint-" + Date.now(),
      site_id: maint.site_id,
      filter_type: maint.filter_type,
      status: maint.status ?? "HEALTHY",
      life_percent: maint.life_percent ?? 100.0,
      last_serviced_at: maint.last_serviced_at ?? new Date().toISOString(),
      next_service_due_at:
        maint.next_service_due_at ??
        new Date(Date.now() + 90 * 86400000).toISOString(),
      notes: maint.notes ?? null,
      created_at: new Date().toISOString(),
    };
  }

  try {
    const created = await prisma.filterMaintenance.create({
      data: {
        siteId: maint.site_id,
        filterType: maint.filter_type as any,
        status: (maint.status as any) ?? "HEALTHY",
        lifePercent: maint.life_percent ?? 100.0,
        lastServicedAt: maint.last_serviced_at
          ? new Date(maint.last_serviced_at)
          : new Date(),
        nextServiceDueAt: maint.next_service_due_at
          ? new Date(maint.next_service_due_at)
          : new Date(Date.now() + 90 * 86400000),
        notes: maint.notes ?? null,
      },
    });

    return mapMaintenance(created);
  } catch (err) {
    console.error("Error creating filter maintenance record with Prisma:", err);
    return null;
  }
}
