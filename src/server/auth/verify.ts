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
  await Promise.resolve();
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  if (DEMO_TOKENS[token]) {
    return DEMO_TOKENS[token];
  }

  // Support test tokens with role prefixes
  if (token.startsWith("demo-") || token.startsWith("test-")) {
    const roleMatch = token.match(/(admin|operator|viewer)/i);
    const role = roleMatch ? roleMatch[1].toUpperCase() : "VIEWER";
    return {
      id: "00000000-0000-0000-0000-000000000001",
      email: `${role.toLowerCase()}@hydrogrid.local`,
      userMetadata: { role },
    };
  }

  return null;
}
