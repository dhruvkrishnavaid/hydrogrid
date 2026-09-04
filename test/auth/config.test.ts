import { describe, expect, it } from "bun:test";

import { getServerConfig } from "../../src/server/config";
import {
  getPrismaClient,
  isPrismaConfigured,
} from "../../src/server/db/prisma";

describe("Database & Server Configuration Handling", () => {
  it("getServerConfig returns a valid configuration object", () => {
    const config = getServerConfig();
    expect(config).toBeDefined();
    expect(typeof config.PORT).toBe("number");
    expect(typeof config.NODE_ENV).toBe("string");
  });

  it("handles missing DATABASE_URL without crashing", () => {
    const origUrl = process.env.DATABASE_URL;

    try {
      delete process.env.DATABASE_URL;

      expect(isPrismaConfigured()).toBe(false);
      expect(getPrismaClient()).toBeNull();
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl;
    }
  });

  it("detects configured environment correctly when DATABASE_URL is present", () => {
    const origUrl = process.env.DATABASE_URL;

    try {
      process.env.DATABASE_URL =
        "postgresql://postgres:password@localhost:5432/hydrogrid";

      expect(isPrismaConfigured()).toBe(true);
      const prisma = getPrismaClient();
      expect(prisma).not.toBeNull();
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl;
      else delete process.env.DATABASE_URL;
    }
  });

  it("sanitizes empty strings in optional environment variables without error", () => {
    const origUrl = process.env.DATABASE_URL;
    const origToken = process.env.INFLUXDB_TOKEN;

    try {
      process.env.DATABASE_URL = "   ";
      process.env.INFLUXDB_TOKEN = "";

      const config = getServerConfig();
      expect(config.DATABASE_URL).toBeUndefined();
      expect(config.INFLUXDB_TOKEN).toBeUndefined();
    } finally {
      if (origUrl) process.env.DATABASE_URL = origUrl;
      else delete process.env.DATABASE_URL;

      if (origToken) process.env.INFLUXDB_TOKEN = origToken;
      else delete process.env.INFLUXDB_TOKEN;
    }
  });
});
