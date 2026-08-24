import type {
  FilterMaintenanceRecord,
  FilterStatus,
  FilterType,
} from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

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

export async function getMaintenanceBySiteId(
  siteId: string,
): Promise<Array<FilterMaintenanceRecord>> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return DEFAULT_FILTERS.map((f, i) => ({
      id: `default-maint-${i}`,
      site_id: siteId,
      ...f,
    }));
  }

  const { data, error } = await supabase
    .from("filter_maintenance")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return DEFAULT_FILTERS.map((f, i) => ({
      id: `default-maint-${i}`,
      site_id: siteId,
      ...f,
    }));
  }

  return data as Array<FilterMaintenanceRecord>;
}

export async function createFilterMaintenance(
  maint: InsertFilterMaintenance,
): Promise<FilterMaintenanceRecord | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
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

  const { data, error } = await supabase
    .from("filter_maintenance")
    .insert({
      site_id: maint.site_id,
      filter_type: maint.filter_type,
      status: maint.status ?? "HEALTHY",
      life_percent: maint.life_percent ?? 100.0,
      last_serviced_at: maint.last_serviced_at ?? new Date().toISOString(),
      next_service_due_at:
        maint.next_service_due_at ??
        new Date(Date.now() + 90 * 86400000).toISOString(),
      notes: maint.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating filter maintenance record:", error);
    return null;
  }

  return data as FilterMaintenanceRecord;
}
