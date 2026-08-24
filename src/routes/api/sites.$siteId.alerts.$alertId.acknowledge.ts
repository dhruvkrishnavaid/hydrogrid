import { createFileRoute } from "@tanstack/react-router";

import {
  checkUserSiteAccess,
  getUserSiteRole,
  hasRequiredRole,
} from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import {
  acknowledgeAlert,
  getAlertById,
} from "../../server/repositories/alerts";
import { apiError, apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute(
  "/api/sites/$siteId/alerts/$alertId/acknowledge",
)({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const { siteId, alertId } = params;

        const hasAccess = await checkUserSiteAccess(user.id, siteId, "VIEWER");
        if (!hasAccess) {
          return apiError("FORBIDDEN", "Access denied to this site", 403);
        }

        // Acknowledge requires OPERATOR or higher
        const role = await getUserSiteRole(user.id, siteId);
        if (!role || !hasRequiredRole(role, "OPERATOR")) {
          return apiError(
            "FORBIDDEN",
            "OPERATOR or ADMIN role required to acknowledge alerts",
            403,
          );
        }

        const existing = await getAlertById(alertId);
        if (!existing) {
          return apiError("NOT_FOUND", "Alert not found", 404);
        }

        if (existing.site_id !== siteId) {
          return apiError(
            "FORBIDDEN",
            "Alert does not belong to this site",
            403,
          );
        }

        const updated = await acknowledgeAlert(alertId, user.id);
        if (!updated) {
          return apiError("INTERNAL_ERROR", "Failed to acknowledge alert", 500);
        }

        return apiSuccess({ alert: updated });
      },
    },
  },
});
