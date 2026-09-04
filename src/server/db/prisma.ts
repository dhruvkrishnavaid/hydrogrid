import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export function isPrismaConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!globalThis.__prismaClient) {
    globalThis.__prismaClient = new PrismaClient({
      log:
        process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalThis.__prismaClient;
}
