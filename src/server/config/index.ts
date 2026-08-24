import { z } from "zod";

const emptyStringToUndefined = (val: unknown): unknown =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

const optionalUrlSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional(),
);

const optionalStringSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().min(1).optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Supabase (Current API Key Model)
  SUPABASE_URL: optionalUrlSchema,
  SUPABASE_PUBLISHABLE_KEY: optionalStringSchema,
  SUPABASE_SECRET_KEY: optionalStringSchema,
  SUPABASE_JWKS_URL: optionalUrlSchema,

  // InfluxDB
  INFLUXDB_URL: optionalUrlSchema,
  INFLUXDB_TOKEN: optionalStringSchema,
  INFLUXDB_ORG: optionalStringSchema,
  INFLUXDB_BUCKET: optionalStringSchema,
});

export type ServerConfig = z.infer<typeof serverEnvSchema>;

export function getServerConfig(): ServerConfig {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (parsed.success) {
    return parsed.data;
  }

  return {
    NODE_ENV:
      process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
        ? process.env.NODE_ENV
        : "development",
    PORT: Number(process.env.PORT) || 3000,
    SUPABASE_URL: process.env.SUPABASE_URL || undefined,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || undefined,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
    SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL || undefined,
    INFLUXDB_URL: process.env.INFLUXDB_URL || undefined,
    INFLUXDB_TOKEN: process.env.INFLUXDB_TOKEN || undefined,
    INFLUXDB_ORG: process.env.INFLUXDB_ORG || undefined,
    INFLUXDB_BUCKET: process.env.INFLUXDB_BUCKET || undefined,
  };
}

export const serverConfig: ServerConfig = new Proxy({} as ServerConfig, {
  get(_target, prop: string) {
    const config = getServerConfig();
    return config[prop as keyof ServerConfig];
  },
});
