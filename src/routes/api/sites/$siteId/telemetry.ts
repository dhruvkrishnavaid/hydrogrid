import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { processTelemetryIngestion } from "../../../../server/services/ingestion";
import { apiError, apiSuccess } from "../../../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/telemetry")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const { siteId } = params;

        // Verify OPERATOR or ADMIN role
        const hasAccess = await checkUserSiteAccess(
          user.id,
          siteId,
          "OPERATOR",
        );
        if (!hasAccess) {
          return apiError(
            "FORBIDDEN",
            "OPERATOR or ADMIN role required to ingest telemetry",
            403,
          );
        }

        let bodyJson: unknown;
        try {
          bodyJson = await request.json();
        } catch {
          return apiError("BAD_REQUEST", "Invalid JSON body", 400);
        }

        try {
          const result = await processTelemetryIngestion(siteId, bodyJson, {
            source: "HTTP",
          });

          return apiSuccess(result);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Failed to ingest telemetry";
          return apiError("VALIDATION_ERROR", message, 400);
        }
      },
    },
  },
});
