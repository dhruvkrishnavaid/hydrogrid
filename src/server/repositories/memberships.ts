import type { SiteMembership, UserRole } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

export async function getUserMemberships(
  userId: string,
): Promise<Array<SiteMembership>> {
  const supabase = getSupabaseServerClient() ?? getSupabaseAdminClient();
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
  const supabase = getSupabaseServerClient() ?? getSupabaseAdminClient();
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
