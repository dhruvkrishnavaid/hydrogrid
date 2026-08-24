import { createFileRoute } from "@tanstack/react-router";

import { isInfluxDBConfigured } from "../../server/db/influx";
import { isSupabaseConfigured } from "../../server/db/supabase";
import { apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => {
        return apiSuccess({
          system: "HydroGrid",
          status: "healthy",
          version: "0.1.0",
          timestamp: new Date().toISOString(),
          services: {
            supabase: isSupabaseConfigured() ? "configured" : "unconfigured",
            influxdb: isInfluxDBConfigured() ? "configured" : "unconfigured",
          },
        });
      },
    },
  },
});
