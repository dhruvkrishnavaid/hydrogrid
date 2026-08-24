import type { Device } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

export interface InsertDevice {
  site_id: string;
  name: string;
  type: "SOURCE_SENSOR_NODE" | "PURIFICATION_CONTROLLER" | "DISTRIBUTION_NODE";
  status?: "ONLINE" | "DEGRADED" | "OFFLINE" | "FAULT";
  firmware_version?: string;
}

export async function getDevicesBySiteId(
  siteId: string,
): Promise<Array<Device>> {
  // Use admin client to bypass RLS — authorization enforced at the API layer
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching devices:", error);
    return [];
  }

  return (data as Array<Device>) ?? [];
}

export async function getDeviceById(id: string): Promise<Device | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Device;
}

export async function createDevice(
  device: InsertDevice,
): Promise<Device | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("devices")
    .insert(device)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating device:", error);
    return null;
  }

  return data as Device;
}
