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

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().default(3000),

    // Relational Database (PostgreSQL via Prisma)
    DATABASE_URL: optionalStringSchema,

    // InfluxDB
    INFLUXDB_URL: optionalUrlSchema,
    INFLUXDB_TOKEN: optionalStringSchema,
    INFLUXDB_ORG: optionalStringSchema,
    INFLUXDB_BUCKET: optionalStringSchema,

    // MQTT Broker
    MQTT_BROKER_URL: optionalStringSchema,
    MQTT_USERNAME: optionalStringSchema,
    MQTT_PASSWORD: optionalStringSchema,
    MQTT_CLIENT_ID: optionalStringSchema,
    MQTT_ENABLED: z.preprocess((v) => {
      if (v === "true" || v === true || v === "1") return true;
      if (v === "false" || v === false || v === "0") return false;
      return undefined;
    }, z.boolean().optional()),
  })
  .transform((data) => ({
    ...data,
    MQTT_ENABLED:
      data.MQTT_ENABLED !== undefined
        ? data.MQTT_ENABLED
        : Boolean(data.MQTT_BROKER_URL),
  }));

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
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    INFLUXDB_URL: process.env.INFLUXDB_URL || undefined,
    INFLUXDB_TOKEN: process.env.INFLUXDB_TOKEN || undefined,
    INFLUXDB_ORG: process.env.INFLUXDB_ORG || undefined,
    INFLUXDB_BUCKET: process.env.INFLUXDB_BUCKET || undefined,
    MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || undefined,
    MQTT_USERNAME: process.env.MQTT_USERNAME || undefined,
    MQTT_PASSWORD: process.env.MQTT_PASSWORD || undefined,
    MQTT_CLIENT_ID: process.env.MQTT_CLIENT_ID || undefined,
    MQTT_ENABLED:
      process.env.MQTT_ENABLED !== undefined
        ? process.env.MQTT_ENABLED === "true" ||
          process.env.MQTT_ENABLED === "1"
        : Boolean(process.env.MQTT_BROKER_URL),
  };
}

export const serverConfig: ServerConfig = new Proxy({} as ServerConfig, {
  get(_target, prop: string) {
    const config = getServerConfig();
    return config[prop as keyof ServerConfig];
  },
});
