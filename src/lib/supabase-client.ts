import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
  "https://aglkqhkxahlkfxfqgtrb.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  (typeof process !== "undefined" && process.env?.SUPABASE_PUBLISHABLE_KEY) ||
  "sb_publishable_ckLzNmJFcBA-_Lr96ftjEA_Kho44HS1";

let supabaseBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: "hydrogrid_sb_auth",
        },
      },
    );
  }
  return supabaseBrowserClient;
}
