import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../../server/auth/verify";
import { getLatestTelemetry } from "../../../../../server/services";
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
        const flowRate = latestState?.reading?.flowRate ?? 33.0; // Typical demand; rated 45.0; leak >47.25
        const nominalFlowRate = 45.0;
        // Only positive surge over 45.5 L/min represents leakage; lower flow is not a threat
        const diffPercent =
          flowRate > nominalFlowRate
            ? ((flowRate - nominalFlowRate) / nominalFlowRate) * 100
            : 0.0;
        const isLeak = flowRate > 47.25; // 5% above rated 45.0 L/min
        const isBlocked = latestState?.safety.waterRelease === "BLOCKED";

        return apiSuccess({
          flowRate,
          nominalFlowRate,
          differencePercent: Number(diffPercent.toFixed(2)),
          thresholdPercent: 0.0,
          status: isLeak ? "LEAK_DETECTED" : "NORMAL",
          isolationValve: isBlocked || isLeak ? "CLOSED" : "OPEN",
          lastUpdated: latestState?.updatedAt ?? new Date().toISOString(),
        });
      },
    },
  },
});
