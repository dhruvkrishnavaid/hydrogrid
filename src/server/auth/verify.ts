import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";
import { extractBearerToken } from "./token";
import type { AuthUser } from "./types";

export async function verifyAuthUser(
  request: Request,
): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  // 1. Try verification with admin client (using SUPABASE_SECRET_KEY)
  const adminClient = getSupabaseAdminClient();
  if (adminClient) {
    try {
      const { data, error } = await adminClient.auth.getUser(token);
      if (!error && data?.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          userMetadata: data.user.user_metadata,
        };
      }
    } catch {
      // Fall through to server client with publishable key
    }
  }

  // 2. Fall back to server client (using SUPABASE_PUBLISHABLE_KEY)
  const serverClient = getSupabaseServerClient();
  if (serverClient) {
    try {
      const { data, error } = await serverClient.auth.getUser(token);
      if (!error && data?.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          userMetadata: data.user.user_metadata,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}
