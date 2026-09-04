import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";

const rawDbUrl = process.env["DATABASE_URL"] || "";
const connection =
  rawDbUrl && !rawDbUrl.includes("sslmode=")
    ? `${rawDbUrl}${rawDbUrl.includes("?") ? "&" : "?"}sslmode=require`
    : rawDbUrl;

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: "prisma8/contract.prisma",
    output: "generated/prisma8",
    db: {
      connection,
    },
  }),
});
