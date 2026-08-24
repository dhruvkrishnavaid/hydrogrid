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

export async function getSites(): Promise<Array<Site>> {
  const supabase = getSupabaseServerClient() ?? getSupabaseAdminClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching sites:", error);
    return [];
  }

  return (data as Array<Site>) ?? [];
}

export async function getSiteById(id: string): Promise<Site | null> {
  const supabase = getSupabaseServerClient() ?? getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
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
