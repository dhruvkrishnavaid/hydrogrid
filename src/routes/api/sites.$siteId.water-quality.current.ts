import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { getLatestTelemetry } from "../../server/services";
import { apiError, apiSuccess } from "../../server/utils/response";

const DEFAULT_SAFE_READING = {
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

export const Route = createFileRoute(
  "/api/sites/$siteId/water-quality/current",
)({
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

        return apiSuccess({
          reading: latestState?.reading ?? DEFAULT_SAFE_READING,
          timestamp: latestState?.updatedAt ?? new Date().toISOString(),
        });
      },
    },
  },
});
