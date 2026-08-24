import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { getQualityConfigBySiteId } from "../../server/repositories/quality-configurations";
import { evaluateWaterSafety, getLatestTelemetry } from "../../server/services";
import { apiError, apiSuccess } from "../../server/utils/response";

const DEFAULT_SAFE_READING = {
  ph: 7.35,
  turbidity: 1.2,
  heavyMetals: 0.02,
  dissolvedOxygen: 7.8,
  tds: 210.0,
  electricalConductivity: 340.0,
  temperature: 24.0,
  flowRate: 45.0,
  hardness: 140.0,
};

export const Route = createFileRoute("/api/sites/$siteId/water-safety")({
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
        const latestState = getLatestTelemetry(siteId);
        const reading = latestState?.reading ?? DEFAULT_SAFE_READING;
        const safety =
          latestState?.safety ?? evaluateWaterSafety(reading, config);

        return apiSuccess({
          score: safety.score,
          confidence: safety.confidence,
          status: safety.status,
          reasons: safety.reasons,
          qualityGate: safety.qualityGate,
          waterRelease: safety.waterRelease,
          timestamp: latestState?.updatedAt ?? safety.evaluatedAt,
        });
      },
    },
  },
});
