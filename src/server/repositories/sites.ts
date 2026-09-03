import type { Site } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

export interface InsertSite {
  name: string;
  village: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  status?: "ONLINE" | "OFFLINE" | "DEGRADED";
}

export interface UpdateSite {
  name?: string;
  village?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  status?: "ONLINE" | "OFFLINE" | "DEGRADED";
}

export const DEFAULT_DEMO_SITE: Site = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Node Zero — IIITD Pilot",
  village: "IIIT-Delhi Campus (Okhla)",
  district: "South East Delhi",
  state: "Delhi",
  latitude: 28.5459,
  longitude: 77.2732,
  status: "ONLINE",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export async function getSites(): Promise<Array<Site>> {
  // Use admin client to bypass RLS — authorization is enforced at the API layer
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return [DEFAULT_DEMO_SITE];
  }

  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data || data.length === 0) {
    return [DEFAULT_DEMO_SITE];
  }

  return (data as Array<Site>) ?? [DEFAULT_DEMO_SITE];
}

export async function getSiteById(id: string): Promise<Site | null> {
  if (id === DEFAULT_DEMO_SITE.id) {
    return DEFAULT_DEMO_SITE;
  }

  // Use admin client to bypass RLS — authorization is enforced at the API layer
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return DEFAULT_DEMO_SITE;
  }

  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return DEFAULT_DEMO_SITE;
  }

  return data as Site;
}

export async function createSite(site: InsertSite): Promise<Site | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("sites")
    .insert(site)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating site:", error);
    return null;
  }

  return data as Site;
}

export async function updateSite(
  id: string,
  update: UpdateSite,
): Promise<Site | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("sites")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating site:", error);
    return null;
  }

  return data as Site;
}
