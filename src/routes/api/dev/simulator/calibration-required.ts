import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getUserMemberships } from "../../../../server/repositories/memberships";
import { executeSimulatorScenario } from "../../../../server/services";
import { apiError, apiSuccess } from "../../../../server/utils/response";

export const Route = createFileRoute("/api/dev/simulator/calibration-required")(
  {
    server: {
      handlers: {
        POST: async ({ request }) => {
          const user = await verifyAuthUser(request);
          if (!user) {
            return apiError("UNAUTHORIZED", "Authentication required", 401);
          }

          let body: { siteId?: string; deviceId?: string } = {};
          try {
            body = (await request.json()) as {
              siteId?: string;
              deviceId?: string;
            };
          } catch {
            // Empty body
          }

          let siteId = body.siteId;
          if (!siteId) {
            const memberships = await getUserMemberships(user.id);
            if (!memberships.length) {
              return apiError(
                "NOT_FOUND",
                "No accessible sites found for this user",
                404,
              );
            }
            siteId = memberships[0].site_id;
          }

          const hasAccess = await checkUserSiteAccess(
            user.id,
            siteId,
            "OPERATOR",
          );
          if (!hasAccess) {
            return apiError(
              "FORBIDDEN",
              "OPERATOR or ADMIN role required to trigger simulation",
              403,
            );
          }

          const result = await executeSimulatorScenario(
            siteId,
            "CALIBRATION_REQUIRED",
            body.deviceId,
          );

          return apiSuccess(result);
        },
      },
    },
  },
);
