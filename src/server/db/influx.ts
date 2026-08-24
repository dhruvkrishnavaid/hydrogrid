import { InfluxDB, Point } from "@influxdata/influxdb-client";
import type { QueryApi, WriteApi } from "@influxdata/influxdb-client";

import { serverConfig } from "../config";

let influxClient: InfluxDB | null = null;

export function isInfluxDBConfigured(): boolean {
  return Boolean(
    serverConfig.INFLUXDB_URL &&
    serverConfig.INFLUXDB_TOKEN &&
    serverConfig.INFLUXDB_ORG &&
    serverConfig.INFLUXDB_BUCKET,
  );
}

export function getInfluxDBClient(): InfluxDB | null {
  if (!isInfluxDBConfigured()) {
    return null;
  }
  if (!influxClient) {
    influxClient = new InfluxDB({
      url: serverConfig.INFLUXDB_URL!,
      token: serverConfig.INFLUXDB_TOKEN!,
    });
  }
  return influxClient;
}

export function getInfluxWriteApi(): WriteApi | null {
  const client = getInfluxDBClient();
  if (!client || !serverConfig.INFLUXDB_ORG || !serverConfig.INFLUXDB_BUCKET) {
    return null;
  }
  return client.getWriteApi(
    serverConfig.INFLUXDB_ORG,
    serverConfig.INFLUXDB_BUCKET,
  );
}

export function getInfluxQueryApi(): QueryApi | null {
  const client = getInfluxDBClient();
  if (!client || !serverConfig.INFLUXDB_ORG) {
    return null;
  }
  return client.getQueryApi(serverConfig.INFLUXDB_ORG);
}

export { Point };
