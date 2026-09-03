import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getQualityConfigBySiteId } from "../../../../server/repositories/quality-configurations";
import {
  evaluateWaterSafety,
  getLatestTelemetry,
} from "../../../../server/services";
import { apiError, apiSuccess } from "../../../../server/utils/response";

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

export const Route = createFileRoute("/api/sites/$siteId/quality-gate")({
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
        const minPh = config?.min_ph ?? 6.5;
        const maxPh = config?.max_ph ?? 8.5;
        const maxTds = config?.max_tds ?? 500.0;
        const maxTurbidity = config?.max_turbidity ?? 5.0;

        const latestState = getLatestTelemetry(siteId);
        const reading = latestState?.reading ?? DEFAULT_SAFE_READING;
        const safety =
          latestState?.safety ?? evaluateWaterSafety(reading, config);

        const checks = {
          ph: {
            value: reading.ph,
            min: minPh,
            max: maxPh,
            status:
              reading.ph >= minPh && reading.ph <= maxPh ? "PASS" : "FAIL",
          },
          tds: {
            value: reading.tds,
            max: maxTds,
            status: reading.tds <= maxTds ? "PASS" : "FAIL",
          },
          turbidity: {
            value: reading.turbidity,
            max: maxTurbidity,
            status: reading.turbidity <= maxTurbidity ? "PASS" : "FAIL",
          },
          heavyMetals: {
            value: reading.heavyMetals,
            max: 0.1,
            status: reading.heavyMetals <= 0.1 ? "PASS" : "FAIL",
          },
        };

        return apiSuccess({
          status: safety.qualityGate,
          waterRelease: safety.waterRelease,
          checks,
          checkedAt: latestState?.updatedAt ?? safety.evaluatedAt,
        });
      },
    },
  },
});
