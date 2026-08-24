import { describe, expect, it } from "bun:test";

import { getServerConfig } from "../../src/server/config";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
  isSupabaseConfigured,
} from "../../src/server/db/supabase";

describe("Supabase Configuration Handling", () => {
  it("getServerConfig returns a valid configuration object", () => {
    const config = getServerConfig();
    expect(config).toBeDefined();
    expect(typeof config.PORT).toBe("number");
    expect(typeof config.NODE_ENV).toBe("string");
  });

  it("handles missing Supabase configuration without crashing", () => {
    // Save original env
    const origUrl = process.env.SUPABASE_URL;
    const origPub = process.env.SUPABASE_PUBLISHABLE_KEY;
    const origSec = process.env.SUPABASE_SECRET_KEY;

    try {
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_PUBLISHABLE_KEY;
      delete process.env.SUPABASE_SECRET_KEY;

      expect(isSupabaseConfigured()).toBe(false);
      expect(getSupabaseServerClient()).toBeNull();
      expect(getSupabaseAdminClient()).toBeNull();
    } finally {
      // Restore
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origPub) process.env.SUPABASE_PUBLISHABLE_KEY = origPub;
      if (origSec) process.env.SUPABASE_SECRET_KEY = origSec;
    }
  });

  it("detects configured environment correctly when keys are present", () => {
    const origUrl = process.env.SUPABASE_URL;
    const origPub = process.env.SUPABASE_PUBLISHABLE_KEY;

    try {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_PUBLISHABLE_KEY = "test-pub-key";

      expect(isSupabaseConfigured()).toBe(true);
      const serverClient = getSupabaseServerClient();
      expect(serverClient).not.toBeNull();
    } finally {
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      else delete process.env.SUPABASE_URL;

      if (origPub) process.env.SUPABASE_PUBLISHABLE_KEY = origPub;
      else delete process.env.SUPABASE_PUBLISHABLE_KEY;
    }
  });

  it("sanitizes empty strings in optional environment variables without error", () => {
    const origJwks = process.env.SUPABASE_JWKS_URL;
    const origToken = process.env.INFLUXDB_TOKEN;

    try {
      process.env.SUPABASE_JWKS_URL = "   ";
      process.env.INFLUXDB_TOKEN = "";

      const config = getServerConfig();
      expect(config.SUPABASE_JWKS_URL).toBeUndefined();
      expect(config.INFLUXDB_TOKEN).toBeUndefined();
    } finally {
      if (origJwks) process.env.SUPABASE_JWKS_URL = origJwks;
      else delete process.env.SUPABASE_JWKS_URL;

      if (origToken) process.env.INFLUXDB_TOKEN = origToken;
      else delete process.env.INFLUXDB_TOKEN;
    }
  });
});
