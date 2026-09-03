import { createFileRoute } from "@tanstack/react-router";

import {
  checkUserSiteAccess,
  getUserSiteRole,
} from "../../../server/auth/authorization";
import { verifyAuthUser } from "../../../server/auth/verify";
import { getSiteById } from "../../../server/repositories/sites";
import { apiError, apiSuccess } from "../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId")({
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

        const site = await getSiteById(siteId);
        if (!site) {
          return apiError("NOT_FOUND", "Site not found", 404);
        }

        const userRole = await getUserSiteRole(user.id, siteId);

        return apiSuccess({ site, userRole });
      },
    },
  },
});
