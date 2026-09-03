import { createFileRoute } from "@tanstack/react-router";

import {
  checkUserSiteAccess,
  getUserSiteRole,
} from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getDevicesBySiteId } from "../../../../server/repositories/devices";
import { apiError, apiSuccess } from "../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/devices")({
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

        const role = await getUserSiteRole(user.id, siteId);
        const devices = await getDevicesBySiteId(siteId);

        return apiSuccess({ devices, userRole: role });
      },
    },
  },
});
