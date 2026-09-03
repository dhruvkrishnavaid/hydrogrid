import { createFileRoute } from "@tanstack/react-router";

import type { WaterQualityReading } from "../../../lib/schemas/water-quality";
import { checkUserSiteAccess } from "../../../server/auth/authorization";
import { verifyAuthUser } from "../../../server/auth/verify";
import { getAlerts } from "../../../server/repositories/alerts";
import { getDevicesBySiteId } from "../../../server/repositories/devices";
import { getEventsBySiteId } from "../../../server/repositories/events";
import { getUserMemberships } from "../../../server/repositories/memberships";
import { getQualityConfigBySiteId } from "../../../server/repositories/quality-configurations";
import { getSiteById } from "../../../server/repositories/sites";
import {
  evaluateWaterSafety,
  getLatestTelemetry,
  getPurificationStatus,
} from "../../../server/services";
import { apiError, apiSuccess } from "../../../server/utils/response";

const DEFAULT_SAFE_READING: WaterQualityReading = {
  ph: 7.35,
  turbidity: 1.2,
  heavyMetals: 0.02,
  dissolvedOxygen: 7.8,
  tds: 210.0,
  electricalConductivity: 340.0,
  temperature: 24.0,
  flowRate: 45.0,
  hardness: 140.0,
};

export const Route = createFileRoute("/api/dashboard/overview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const url = new URL(request.url);
        let siteId = url.searchParams.get("siteId");

        // If siteId not provided, default to user's first accessible site
        if (!siteId) {
          const memberships = await getUserMemberships(user.id);
          if (!memberships.length) {
            return apiError(
              "NOT_FOUND",
              "No accessible sites found for this user",
              404,
            );
          }
          siteId = memberships[0].site_id;
        }

        // Verify VIEWER access
        const hasAccess = await checkUserSiteAccess(user.id, siteId, "VIEWER");
        if (!hasAccess) {
          return apiError("FORBIDDEN", "Access denied to this site", 403);
        }

        // Fetch site resources in parallel
        const [site, devices, alerts, events, qualityConfig] =
          await Promise.all([
            getSiteById(siteId),
            getDevicesBySiteId(siteId),
            getAlerts({ siteId, limit: 5 }),
            getEventsBySiteId(siteId, { limit: 10 }),
            getQualityConfigBySiteId(siteId),
          ]);

        if (!site) {
          return apiError("NOT_FOUND", "Site not found", 404);
        }

        // Get latest telemetry or compute baseline
        const cachedState = getLatestTelemetry(siteId);
        const latestReading = cachedState?.reading ?? DEFAULT_SAFE_READING;
        const safety =
          cachedState?.safety ??
          evaluateWaterSafety(latestReading, qualityConfig);

        const isBlocked = safety.waterRelease === "BLOCKED";
        const purification = getPurificationStatus(siteId, isBlocked);

        return apiSuccess({
          site,
          systemStatus: site.status,
          devices,
          latestReading,
          safety,
          purification: {
            mode: purification.mode,
            stages: purification.stages,
            pump: purification.pump,
            filters: purification.filters,
            lastUpdated: purification.lastUpdated,
          },
          flow: {
            inletFlowRate: 45.0,
            outletFlowRate: latestReading.flowRate,
            mismatchPercent: 0,
            leakStatus: "NORMAL",
            valveStatus: isBlocked ? "CLOSED" : "OPEN",
          },
          activeAlerts: alerts,
          recentEvents: events,
          lastUpdated: cachedState?.updatedAt ?? new Date().toISOString(),
        });
      },
    },
  },
});
