import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getLatestTelemetry } from "../../../../server/services";
import { apiError, apiSuccess } from "../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/leaks")({
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
        const flowRate = latestState?.reading?.flowRate ?? 33.0;
        const thresholdRate = 45.0 * 1.05; // 47.25 L/min (+5%)
        const rawDifference = thresholdRate - flowRate;
        const isLeak = rawDifference < 0; // flowRate > 47.25
        const invertedDifference = Number(
          (flowRate - thresholdRate).toFixed(1),
        );
        const isBlocked = latestState?.safety.waterRelease === "BLOCKED";

        return apiSuccess({
          siteId,
          status: isLeak ? "LEAK_DETECTED" : "NORMAL",
          flowRate,
          thresholdRate,
          differencePercent: invertedDifference,
          differenceLpm: invertedDifference,
          marginLpm: Number(rawDifference.toFixed(1)),
          thresholdPercent: 5.0,
          isolationValve: isBlocked || isLeak ? "CLOSED" : "OPEN",
          lastChecked: latestState?.updatedAt ?? new Date().toISOString(),
        });
      },
    },
  },
});
