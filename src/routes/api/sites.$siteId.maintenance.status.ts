import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { getMaintenanceBySiteId } from "../../server/repositories/maintenance";
import { apiError, apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/maintenance/status")({
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

        const records = await getMaintenanceBySiteId(siteId);

        const filterSummary: Record<
          string,
          { status: string; lifePercent: number }
        > = {
          sediment: { status: "HEALTHY", lifePercent: 92.0 },
          carbon: { status: "HEALTHY", lifePercent: 84.0 },
          calcite: { status: "HEALTHY", lifePercent: 88.0 },
          uv: { status: "HEALTHY", lifePercent: 95.0 },
        };

        for (const rec of records) {
          const key = rec.filter_type.toLowerCase();
          filterSummary[key] = {
            status: rec.status,
            lifePercent: rec.life_percent,
          };
        }

        return apiSuccess({
          filters: filterSummary,
          lastUpdated: new Date().toISOString(),
        });
      },
    },
  },
});
