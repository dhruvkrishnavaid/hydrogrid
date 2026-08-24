import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { getEventsBySiteId } from "../../server/repositories/events";
import { apiError, apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/events")({
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
        const limit = Math.min(
          Number(url.searchParams.get("limit") ?? 20),
          100,
        );
        const severity = url.searchParams.get("severity") ?? undefined;

        const events = await getEventsBySiteId(siteId, { limit, severity });

        return apiSuccess({ events });
      },
    },
  },
});
