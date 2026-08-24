import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  checkUserSiteAccess,
  getUserSiteRole,
  hasRequiredRole,
} from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import {
  getCalibrationsBySiteId,
  recordCalibration,
} from "../../server/repositories/calibrations";
import { apiError, apiSuccess } from "../../server/utils/response";

const RecordCalibrationSchema = z.object({
  sensor: z.string(),
  offset: z.number().default(0),
  deviceId: z.string().uuid().optional().nullable(),
  status: z
    .enum(["HEALTHY", "DEGRADED", "CALIBRATION_REQUIRED", "FAULT"])
    .optional(),
});

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

        const parsed = RecordCalibrationSchema.safeParse(bodyJson);
        if (!parsed.success) {
          return apiError(
            "VALIDATION_ERROR",
            "Invalid calibration payload",
            400,
            parsed.error.flatten(),
          );
        }

        const { sensor, offset, deviceId, status } = parsed.data;

        const recorded = await recordCalibration({
          site_id: siteId,
          device_id: deviceId,
          sensor,
          offset,
          status: status ?? "HEALTHY",
        });

        return apiSuccess({ calibration: recorded }, 201);
      },
    },
  },
});
