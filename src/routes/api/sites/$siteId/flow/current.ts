import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../../server/auth/verify";
import {
  getLatestFlowPoint,
  getLatestTelemetry,
} from "../../../../../server/services";
import { apiError, apiSuccess } from "../../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/flow/current")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const { siteId } = params;

        const hasAccess = await checkUserSiteAccess(user.id, siteId, "VIEWER");
        if (!hasAccess) {
          return apiError("FORBIDDEN", "Access denied to this site", 403);
        }

        const latestState = getLatestTelemetry(siteId);
        let flowRate = latestState?.reading?.flowRate;
        let lastUpdated = latestState?.updatedAt;

        if (flowRate === undefined) {
          const recentPoint = await getLatestFlowPoint(siteId);
          if (recentPoint) {
            flowRate = recentPoint.flowRate;
            lastUpdated = recentPoint.timestamp;
          } else {
            flowRate = 33.0;
            lastUpdated = new Date().toISOString();
          }
        }

        const nominalFlowRate = 45.0;
        const thresholdRate = 45.0 * 1.05; // 47.25 L/min (+5%)
        // Direct mathematical approach: subtract flow rate from 45x1.05 (+5%)
        // rawDifference = (45.0 * 1.05) - flowRate
        // if negative -> leakage! If positive -> current flow is less than threshold, do nothing.
        const rawDifference = thresholdRate - flowRate;
        const isLeak = rawDifference < 0; // flowRate > 47.25
        // Inverted difference for +- scale on graph and metrics
        const invertedDifference = Number(
          (flowRate - thresholdRate).toFixed(1),
        );
        const isBlocked = latestState?.safety.waterRelease === "BLOCKED";

        return apiSuccess({
          flowRate,
          nominalFlowRate,
          thresholdRate,
          differencePercent: invertedDifference,
          differenceLpm: invertedDifference,
          marginLpm: Number(rawDifference.toFixed(1)),
          thresholdPercent: 5.0,
          status: isLeak ? "LEAK_DETECTED" : "NORMAL",
          isolationValve: isBlocked || isLeak ? "CLOSED" : "OPEN",
          lastUpdated: lastUpdated ?? new Date().toISOString(),
        });
      },
    },
  },
});
