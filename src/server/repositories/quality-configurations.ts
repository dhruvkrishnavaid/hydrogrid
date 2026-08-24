import type { QualityConfiguration } from "../../lib/schemas/database";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";

export async function getQualityConfigBySiteId(
  siteId: string,
): Promise<QualityConfiguration | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("quality_configurations")
    .select("*")
    .eq("site_id", siteId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as QualityConfiguration;
}

export async function upsertQualityConfig(
  siteId: string,
  config: Partial<Omit<QualityConfiguration, "id" | "site_id" | "updated_at">>,
): Promise<QualityConfiguration | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const payload = {
    site_id: siteId,
    ...config,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("quality_configurations")
    .upsert(payload, { onConflict: "site_id" })
    .select("*")
    .single();

  if (error) {
    console.error("Error upserting quality configuration:", error);
    return null;
  }

  return data as QualityConfiguration;
}
