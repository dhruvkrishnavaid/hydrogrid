import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getAlerts } from "../../../../server/repositories/alerts";
import { apiError, apiSuccess } from "../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/alerts")({
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

        const url = new URL(request.url);
        const status = url.searchParams.get("status") ?? undefined;
        const severity = url.searchParams.get("severity") ?? undefined;
        const limit = Math.min(
          Number(url.searchParams.get("limit") ?? 20),
          100,
        );

        const alerts = await getAlerts({ siteId, status, severity, limit });

        return apiSuccess({ alerts });
      },
    },
  },
});
