import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { checkUserSiteAccess } from "../../../server/auth/authorization";
import { verifyAuthUser } from "../../../server/auth/verify";
import {
  executeSimulatorScenario,
  isValidScenario,
  VALID_SCENARIOS,
} from "../../../server/services";
import { apiError, apiSuccess } from "../../../server/utils/response";

const SimulateRequestSchema = z.object({
  siteId: z.string().min(1),
  deviceId: z.string().min(1).optional().nullable(),
  scenario: z.string(),
});

export const Route = createFileRoute("/api/demo/simulate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        let bodyJson: unknown;
        try {
          bodyJson = await request.json();
        } catch {
          return apiError("BAD_REQUEST", "Invalid JSON payload", 400);
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

        const { siteId, deviceId, scenario } = parsed.data;

        // Strict scenario validation
        if (!isValidScenario(scenario)) {
          return apiError(
            "VALIDATION_ERROR",
            `Invalid simulation scenario: '${scenario}'. Supported scenarios: ${VALID_SCENARIOS.join(", ")}`,
            400,
          );
        }

        // Verify user has OPERATOR or ADMIN role for this site
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
