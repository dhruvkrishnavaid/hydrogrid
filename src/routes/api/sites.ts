import { createFileRoute } from "@tanstack/react-router";

import { verifyAuthUser } from "../../server/auth/verify";
import { getUserMemberships } from "../../server/repositories/memberships";
import { getSiteById } from "../../server/repositories/sites";
import { apiError, apiSuccess } from "../../server/utils/response";

export const Route = createFileRoute("/api/sites")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const memberships = await getUserMemberships(user.id);
        if (!memberships.length) {
          return apiSuccess({ sites: [] });
        }

        // Fetch each site the user has access to
        const sites = await Promise.all(
          memberships.map((m) => getSiteById(m.site_id)),
        );

        return apiSuccess({
          sites: sites.filter(Boolean).map((site) => {
            const membership = memberships.find((m) => m.site_id === site?.id);
            return { ...site, userRole: membership?.role };
          }),
        });
      },
    },
  },
});
