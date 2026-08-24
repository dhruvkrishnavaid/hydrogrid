import type { EventRecord } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

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

export async function getEventsBySiteId(
  siteId: string,
  options?: GetEventsOptions,
): Promise<Array<EventRecord>> {
  // Use admin client to bypass RLS — authorization enforced at the API layer
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("events")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (options?.type) {
    query = query.eq("type", options.type);
  }
  if (options?.severity) {
    query = query.eq("severity", options.severity);
  }
  if (options?.from) {
    query = query.gte("created_at", options.from);
  }
  if (options?.to) {
    query = query.lte("created_at", options.to);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return (data as Array<EventRecord>) ?? [];
}

export async function createEvent(
  event: InsertEvent,
): Promise<EventRecord | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("events")
    .insert(event)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating event:", error);
    return null;
  }

  return data as EventRecord;
}
