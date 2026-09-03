import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { WaterQualityReadingSchema } from "../../../../lib/schemas/water-quality";
import { checkUserSiteAccess } from "../../../../server/auth/authorization";
import { verifyAuthUser } from "../../../../server/auth/verify";
import { getQualityConfigBySiteId } from "../../../../server/repositories/quality-configurations";
import {
  broadcastSiteEvent,
  evaluateWaterSafety,
  handleSafetyEvents,
  recordTelemetry,
} from "../../../../server/services";
import { apiError, apiSuccess } from "../../../../server/utils/response";

const IngestTelemetrySchema = z.object({
  deviceId: z.string().uuid().optional().nullable(),
  flowMismatchPercent: z.number().optional().default(0),
  reading: WaterQualityReadingSchema,
});

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

        // Support both { reading: {...}, deviceId } or direct {...reading}
        const isNested =
          typeof bodyJson === "object" &&
          bodyJson !== null &&
          "reading" in bodyJson;

        const normalizedPayload = isNested ? bodyJson : { reading: bodyJson };

        const parsed = IngestTelemetrySchema.safeParse(normalizedPayload);
        if (!parsed.success) {
          return apiError(
            "VALIDATION_ERROR",
            "Invalid water-quality telemetry reading",
            400,
            parsed.error.flatten(),
          );
        }

        const { reading, deviceId, flowMismatchPercent } = parsed.data;

        const config = await getQualityConfigBySiteId(siteId);

        // 1. Evaluate water safety
        const safety = evaluateWaterSafety(reading, config, {
          flowMismatchPercent,
        });

        // 2. Record telemetry (In-Memory cache & InfluxDB write)
        await recordTelemetry(siteId, reading, safety, deviceId);

        // 3. Trigger events and alerts if safety thresholds violated
        const { event, alert } = await handleSafetyEvents(
          siteId,
          safety,
          deviceId,
        );

        // Broadcast realtime SSE events
        broadcastSiteEvent(siteId, "water-quality.updated", {
          siteId,
          reading,
        });
        broadcastSiteEvent(siteId, "water-safety.updated", { siteId, safety });
        broadcastSiteEvent(siteId, "quality-gate.changed", {
          siteId,
          qualityGate: safety.qualityGate,
          waterRelease: safety.waterRelease,
        });
        if (alert) {
          broadcastSiteEvent(siteId, "alert.created", { siteId, alert });
        }

        return apiSuccess({
          telemetry: reading,
          safety,
          flow: {
            inletFlowRate: 45.0,
            outletFlowRate: reading.flowRate,
            mismatchPercent: flowMismatchPercent,
            leakStatus:
              flowMismatchPercent > (config?.max_flow_mismatch_percent ?? 15.0)
                ? "LEAK_DETECTED"
                : "NORMAL",
            valveStatus: safety.waterRelease === "BLOCKED" ? "CLOSED" : "OPEN",
          },
          triggeredEvent: event,
          triggeredAlert: alert,
          ingestedAt: new Date().toISOString(),
        });
      },
    },
  },
});
