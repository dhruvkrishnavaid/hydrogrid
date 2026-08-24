import { describe, expect, it } from "bun:test";

import { verifyAuthUser } from "../../src/server/auth/verify";
import { getServerConfig } from "../../src/server/config";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
  isSupabaseConfigured,
} from "../../src/server/db/supabase";

describe("Live Supabase Integration (Opt-in)", () => {
  const config = getServerConfig();
  const shouldRunLive =
    Boolean(process.env.RUN_LIVE_AUTH_TESTS === "true") &&
    isSupabaseConfigured() &&
    Boolean(config.SUPABASE_SECRET_KEY);

  const testFn = shouldRunLive ? it : it.skip;

  testFn(
    "creates test user, signs in, and verifies token through verifyAuthUser",
    async () => {
      const admin = getSupabaseAdminClient();
      const pub = getSupabaseServerClient();

      expect(admin).not.toBeNull();
      expect(pub).not.toBeNull();
      if (!admin || !pub) return;

      const testEmail = `test_runner_${Date.now()}@test.local`;
      const testPassword = `Pass_${Date.now()}!#Secure`;

      // 1. Create confirmed test user
      const { data: userCreated, error: createError } =
        await admin.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true,
        });

      expect(createError).toBeNull();
      expect(userCreated?.user).toBeDefined();
      if (!userCreated?.user) return;

      try {
        // 2. Sign in to obtain access token
        const { data: sessionData, error: signInError } =
          await pub.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

        expect(signInError).toBeNull();
        const token = sessionData.session?.access_token;
        expect(token).toBeDefined();
        if (!token) return;

        // 3. Verify via verifyAuthUser
        const request = new Request("http://localhost:3000/api/test/auth", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const verifiedUser = await verifyAuthUser(request);
        expect(verifiedUser).not.toBeNull();
        expect(verifiedUser?.id).toBe(userCreated.user.id);
        expect(verifiedUser?.email).toBe(testEmail);
      } finally {
        // 4. Cleanup
        await admin.auth.admin.deleteUser(userCreated.user.id);
      }
    },
  );
});
