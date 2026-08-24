import { createFileRoute } from "@tanstack/react-router";

import { apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute("/api/test")({
  server: {
    handlers: {
      GET: () => {
        return apiSuccess({
          system: "HydroGrid",
          status: "Online",
          sensors: {
            pH: 7.2,
            tds: 150,
          },
          timestamp: new Date().toISOString(),
        });
      },
      POST: async ({ request }) => {
        let body: unknown = null;
        try {
          body = await request.json();
        } catch {
          // Empty or non-JSON body
        }
        return apiSuccess({
          received: body,
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});
