import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getQualityConfigBySiteId } from "../../../../server/repositories/quality-configurations";
import { apiError, apiSuccess } from "../../../../server/utils/response";

// Default WHO drinking water quality thresholds
const DEFAULT_QUALITY_CONFIG = {
  min_ph: 6.5,
  max_ph: 8.5,
  max_tds: 500.0,
  max_turbidity: 5.0,
  max_flow_mismatch_percent: 15.0,
};

export const Route = createFileRoute("/api/sites/$siteId/quality")({
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

        const config = await getQualityConfigBySiteId(siteId);

        return apiSuccess({
          quality: config ?? {
            id: null,
            site_id: siteId,
            ...DEFAULT_QUALITY_CONFIG,
            updated_at: null,
            isDefault: true,
          },
        });
      },
    },
  },
});
