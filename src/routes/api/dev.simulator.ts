import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { getUserMemberships } from "../../server/repositories/memberships";
import {
  executeSimulatorScenario,
  isValidScenario,
  VALID_SCENARIOS,
} from "../../server/services";
import { apiError, apiSuccess } from "../../server/utils/response";

const SimulateRequestSchema = z.object({
  siteId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional().nullable(),
  scenario: z.string(),
});

export const Route = createFileRoute("/api/dev/simulator")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        let bodyJson: unknown = {};
        try {
          bodyJson = await request.json();
        } catch {
          // Empty or non-JSON body
        }

        const parsed = SimulateRequestSchema.safeParse(bodyJson);
        if (!parsed.success) {
          return apiError(
            "VALIDATION_ERROR",
            "Invalid simulation parameters",
            400,
            parsed.error.flatten(),
          );
        }

        const { scenario, deviceId } = parsed.data;

        // Strict scenario validation
        if (!isValidScenario(scenario)) {
          return apiError(
            "VALIDATION_ERROR",
            `Invalid simulation scenario: '${scenario}'. Supported scenarios: ${VALID_SCENARIOS.join(", ")}`,
            400,
          );
        }

        let siteId = parsed.data.siteId;
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

        // Verify OPERATOR or ADMIN role
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

        try {
          const result = await executeSimulatorScenario(
            siteId,
            scenario,
            deviceId,
          );
          return apiSuccess(result);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Simulator execution failed";
          return apiError("VALIDATION_ERROR", message, 400);
        }
      },
    },
  },
});
