import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getMaintenanceBySiteId } from "../../../../server/repositories/maintenance";
import { apiError, apiSuccess } from "../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/maintenance")({
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

        const maintenance = await getMaintenanceBySiteId(siteId);

        return apiSuccess({ maintenance });
      },
    },
  },
});
