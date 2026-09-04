import { createFileRoute } from "@tanstack/react-router";

import { isInfluxDBConfigured } from "../../server/db/influx";
import { isPrismaConfigured } from "../../server/db/prisma";
import { ensureServerInitialized } from "../../server/init";
import { getMqttStatus } from "../../server/services/mqtt";
import { apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => {
        ensureServerInitialized();
        const mqttStatus = getMqttStatus();

        return apiSuccess({
          system: "HydroGrid",
          status: "healthy",
          version: "0.1.0",
          timestamp: new Date().toISOString(),
          services: {
            database: isPrismaConfigured() ? "configured" : "unconfigured",
            influxdb: isInfluxDBConfigured() ? "configured" : "unconfigured",
            mqtt: mqttStatus.connected
              ? "connected"
              : mqttStatus.enabled
                ? "connecting"
                : "disabled",
          },
        });
      },
    },
  },
});
