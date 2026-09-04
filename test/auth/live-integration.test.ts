import { describe, expect, it } from "bun:test";

import {
  getPrismaClient,
  isPrismaConfigured,
} from "../../src/server/db/prisma";

describe("Live Database Integration (Opt-in)", () => {
  const shouldRunLive =
    Boolean(process.env.RUN_LIVE_DB_TESTS === "true") && isPrismaConfigured();

  const testFn = shouldRunLive ? it : it.skip;

  testFn(
    "connects to PostgreSQL via Prisma and queries sites table",
    async () => {
      const prisma = getPrismaClient();
      expect(prisma).not.toBeNull();
      if (!prisma) return;

      const sites = await prisma.site.findMany({ take: 1 });
      expect(Array.isArray(sites)).toBe(true);
    },
  );
});
