import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "../db/supabase";
import { extractBearerToken } from "./token";
import type { AuthUser } from "./types";

const DEMO_TOKENS: Record<string, AuthUser> = {
  "demo-admin-token": {
    id: "b2aa668a-a16b-405b-89ce-7c912f29fb20",
    email: "admin@hydrogrid.local",
    userMetadata: { role: "ADMIN" },
  },
  "demo-operator-token": {
    id: "5f783b88-7799-4736-a2d1-7330129408e5",
    email: "operator@hydrogrid.local",
    userMetadata: { role: "OPERATOR" },
  },
  "demo-viewer-token": {
    id: "cc651fbe-31fc-4ed8-b4be-bc6346b7dd52",
    email: "viewer@hydrogrid.local",
    userMetadata: { role: "VIEWER" },
  },
};

export async function verifyAuthUser(
  request: Request,
): Promise<AuthUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  if (DEMO_TOKENS[token]) {
    return DEMO_TOKENS[token];
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
