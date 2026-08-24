import type { AlertRecord } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

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

export async function getAlerts(
  options?: GetAlertsOptions,
): Promise<Array<AlertRecord>> {
  // Use admin client to bypass RLS — authorization enforced at the API layer
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.siteId) {
    query = query.eq("site_id", options.siteId);
  }
  if (options?.severity) {
    query = query.eq("severity", options.severity);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching alerts:", error);
    return [];
  }

  return (data as Array<AlertRecord>) ?? [];
}

export async function getAlertById(id: string): Promise<AlertRecord | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AlertRecord;
}

export async function createAlert(
  alert: InsertAlert,
): Promise<AlertRecord | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("alerts")
    .insert(alert)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating alert:", error);
    return null;
  }

  return data as AlertRecord;
}

export async function acknowledgeAlert(
  id: string,
  userId?: string,
): Promise<AlertRecord | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("alerts")
    .update({
      status: "ACKNOWLEDGED",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: userId ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error acknowledging alert:", error);
    return null;
  }

  return data as AlertRecord;
}
