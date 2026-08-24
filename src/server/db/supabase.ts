import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerConfig } from "../config";

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const config = getServerConfig();
  return Boolean(
    config.SUPABASE_URL &&
    (config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_SECRET_KEY),
  );
}

export function getSupabaseServerClient(): SupabaseClient | null {
  const config = getServerConfig();
  if (!config.SUPABASE_URL) {
    return null;
  }

  const key = config.SUPABASE_PUBLISHABLE_KEY ?? config.SUPABASE_SECRET_KEY;
  if (!key) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(config.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const config = getServerConfig();
  if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY) {
    return null;
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return supabaseAdminClient;
}
