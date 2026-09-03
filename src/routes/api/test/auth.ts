import { createFileRoute } from "@tanstack/react-router";

import { verifyAuthUser } from "../../../server/auth/verify";
import { getUserMemberships } from "../../../server/repositories/memberships";
import { apiError, apiSuccess } from "../../../server/utils/response";

export const Route = createFileRoute("/api/test/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await verifyAuthUser(request);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const memberships = await getUserMemberships(user.id);

        return apiSuccess({
          user: {
            id: user.id,
            email: user.email,
          },
          memberships,
        });
      },
    },
  },
});
