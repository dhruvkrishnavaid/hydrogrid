import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { getLatestTelemetry } from "../../server/services";
import { apiError, apiSuccess } from "../../server/utils/response";

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
        const inlet = 45.0;
        const outlet = latestState?.reading?.flowRate ?? 45.0;
        const diffPercent = Math.abs(((inlet - outlet) / inlet) * 100);
        const isLeak = diffPercent > 15.0;
        const isBlocked = latestState?.safety.waterRelease === "BLOCKED";

        return apiSuccess({
          inlet,
          outlet,
          differencePercent: Number(diffPercent.toFixed(2)),
          thresholdPercent: 15.0,
          status: isLeak ? "LEAK_DETECTED" : "NORMAL",
          isolationValve: isBlocked || isLeak ? "CLOSED" : "OPEN",
          lastUpdated: latestState?.updatedAt ?? new Date().toISOString(),
        });
      },
    },
  },
});
