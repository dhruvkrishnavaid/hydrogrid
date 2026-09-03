import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../../server/auth/verify";
import { getFlowHistory } from "../../../../../server/services";
import { apiError, apiSuccess } from "../../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/flow/history")({
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
        const from = url.searchParams.get("from") ?? undefined;
        const to = url.searchParams.get("to") ?? undefined;
        const interval = url.searchParams.get("interval") ?? undefined;

        const { data, error } = await getFlowHistory(siteId, {
          from,
          to,
          interval,
        });

        if (error) {
          return apiError("VALIDATION_ERROR", error, 400);
        }

        return apiSuccess(data);
      },
    },
  },
});
