import type { SiteMembership, UserRole } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

export async function getUserMemberships(
  userId: string,
): Promise<Array<SiteMembership>> {
  // Use admin client to bypass RLS — this is a server-only operation
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("site_memberships")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching site memberships:", error);
    return [];
  }

  return (data as Array<SiteMembership>) ?? [];
}

export async function getUserSiteRole(
  userId: string,
  siteId: string,
): Promise<UserRole | null> {
  // Use admin client to bypass RLS — this is a server-only operation
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("site_memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .single();

  if (error || !data) {
    return null;
  }

  return (data.role as UserRole) ?? null;
}
