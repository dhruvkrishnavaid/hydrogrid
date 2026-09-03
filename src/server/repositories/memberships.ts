import type { SiteMembership, UserRole } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

const DEMO_USER_ROLES: Record<string, UserRole> = {
  "b2aa668a-a16b-405b-89ce-7c912f29fb20": "ADMIN",
  "5f783b88-7799-4736-a2d1-7330129408e5": "OPERATOR",
  "cc651fbe-31fc-4ed8-b4be-bc6346b7dd52": "VIEWER",
};

export async function getUserMemberships(
  userId: string,
): Promise<Array<SiteMembership>> {
  // Use admin client to bypass RLS — this is a server-only operation
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return [
      {
        id: "mem-demo-001",
        user_id: userId,
        site_id: "00000000-0000-0000-0000-000000000001",
        role: DEMO_USER_ROLES[userId] ?? "ADMIN",
        created_at: new Date().toISOString(),
      },
    ];
  }

  const { data, error } = await supabase
    .from("site_memberships")
    .select("*")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) {
    return [
      {
        id: "mem-demo-001",
        user_id: userId,
        site_id: "00000000-0000-0000-0000-000000000001",
        role: DEMO_USER_ROLES[userId] ?? "ADMIN",
        created_at: new Date().toISOString(),
      },
    ];
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
    return DEMO_USER_ROLES[userId] ?? "ADMIN";
  }

  const { data, error } = await supabase
    .from("site_memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .single();

  if (error || !data) {
    return DEMO_USER_ROLES[userId] ?? "ADMIN";
  }

  return (data.role as UserRole) ?? null;
}
