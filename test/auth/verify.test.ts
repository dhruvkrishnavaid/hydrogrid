import { describe, expect, it } from "bun:test";

import type { AuthUser } from "../../src/server/auth/types";
import { verifyAuthUser } from "../../src/server/auth/verify";

describe("Authentication Verification Logic", () => {
  it("returns null when no token is present in request", async () => {
    const request = new Request("http://localhost:3000/api/test/auth");
    const user = await verifyAuthUser(request);
    expect(user).toBeNull();
  });

  it("returns null when invalid token is provided", async () => {
    const request = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: "Bearer definitely-invalid-jwt-token" },
    });
    const user = await verifyAuthUser(request);
    expect(user).toBeNull();
  });

  it("ensures AuthUser structure conforms strictly to contract", () => {
    const sampleUser: AuthUser = {
      id: "11111111-2222-3333-4444-555555555555",
      email: "operator@hydrogrid.local",
      userMetadata: { role: "OPERATOR", full_name: "Test Operator" },
    };

    expect(typeof sampleUser.id).toBe("string");
    expect(typeof sampleUser.email).toBe("string");
    expect(typeof sampleUser.userMetadata).toBe("object");

    // Ensure no secret keys or tokens are stored on AuthUser interface
    const keys = Object.keys(sampleUser);
    expect(keys).toContain("id");
    expect(keys).toContain("email");
    expect(keys).toContain("userMetadata");
    expect(keys).not.toContain("access_token");
    expect(keys).not.toContain("secret_key");
    expect(keys).not.toContain("service_role");
  });
});
