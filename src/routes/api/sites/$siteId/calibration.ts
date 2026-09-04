import { createFileRoute } from "@tanstack/react-router";

import {
  checkUserSiteAccess,
  getUserSiteRole,
  hasRequiredRole,
} from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getCalibrationsBySiteId } from "../../../../server/repositories/calibrations";
import { processCalibrationIngestion } from "../../../../server/services/ingestion";
import { apiError, apiSuccess } from "../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/calibration")({
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

        const calibrations = await getCalibrationsBySiteId(siteId);

        return apiSuccess({ calibrations });
      },

      POST: async ({ request, params }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const { siteId } = params;

        const role = await getUserSiteRole(user.id, siteId);
        if (!role || !hasRequiredRole(role, "OPERATOR")) {
          return apiError(
            "FORBIDDEN",
            "OPERATOR or ADMIN role required to record calibrations",
            403,
          );
        }

        let bodyJson: unknown;
        try {
          bodyJson = await request.json();
        } catch {
          return apiError("BAD_REQUEST", "Invalid JSON payload", 400);
        }

        try {
          const result = await processCalibrationIngestion(siteId, bodyJson, {
            source: "HTTP",
          });

          return apiSuccess(result, 201);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Failed to record calibration";
          return apiError("VALIDATION_ERROR", message, 400);
        }
      },
    },
  },
});
