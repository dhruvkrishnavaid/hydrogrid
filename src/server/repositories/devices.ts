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

const DEFAULT_DEMO_DEVICES: Array<Device> = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    site_id: "00000000-0000-0000-0000-000000000001",
    name: "Source Node Alpha",
    type: "SOURCE_SENSOR_NODE",
    status: "ONLINE",
    firmware_version: "v2.4.1",
    last_heartbeat: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    site_id: "00000000-0000-0000-0000-000000000001",
    name: "Purification Core PLC",
    type: "PURIFICATION_CONTROLLER",
    status: "ONLINE",
    firmware_version: "v3.0.0",
    last_heartbeat: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    site_id: "00000000-0000-0000-0000-000000000001",
    name: "Distribution Flow Monitor",
    type: "DISTRIBUTION_NODE",
    status: "ONLINE",
    firmware_version: "v1.8.2",
    last_heartbeat: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export async function getDevicesBySiteId(
  siteId: string,
): Promise<Array<Device>> {
  // Use admin client to bypass RLS — authorization enforced at the API layer
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return DEFAULT_DEMO_DEVICES;
  }

  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return DEFAULT_DEMO_DEVICES;
  }

  return (data as Array<Device>) ?? DEFAULT_DEMO_DEVICES;
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
