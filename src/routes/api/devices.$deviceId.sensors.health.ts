import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { getDeviceById } from "../../server/repositories/devices";
import { getLatestTelemetry } from "../../server/services";
import { apiError, apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute("/api/devices/$deviceId/sensors/health")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const { deviceId } = params;

        const device = await getDeviceById(deviceId);
        if (!device) {
          return apiError("NOT_FOUND", "Device not found", 404);
        }

        const hasAccess = await checkUserSiteAccess(
          user.id,
          device.site_id,
          "VIEWER",
        );
        if (!hasAccess) {
          return apiError("FORBIDDEN", "Access denied to this site", 403);
        }

        const latestState = getLatestTelemetry(device.site_id);
        const sensorDrift =
          latestState?.safety && latestState.safety.confidence < 85
            ? 0.85
            : 0.0;
        const sensorStatus = sensorDrift > 0.5 ? "DEGRADED" : "HEALTHY";

        return apiSuccess({
          deviceId,
          siteId: device.site_id,
          sensors: {
            ph: { status: sensorStatus, drift: sensorDrift },
            tds: { status: "HEALTHY", drift: 0.0 },
            turbidity: { status: "HEALTHY", drift: 0.0 },
            heavyMetals: { status: "HEALTHY", drift: 0.0 },
            dissolvedOxygen: { status: "HEALTHY", drift: 0.0 },
          },
          lastUpdated: latestState?.updatedAt ?? new Date().toISOString(),
        });
      },
    },
  },
});
