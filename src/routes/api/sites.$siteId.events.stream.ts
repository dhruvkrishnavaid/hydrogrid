import { createFileRoute } from "@tanstack/react-router";

import { checkUserSiteAccess } from "../../server/auth/authorization";
import { verifyAuthUser } from "../../server/auth/verify";
import { subscribeToSiteEvents } from "../../server/services/event-bus";
import type { SSEMessage } from "../../server/services/event-bus";
import { apiError } from "../../server/utils/response";

export const Route = createFileRoute("/api/sites/$siteId/events/stream")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        // Support token in query parameter for EventSource clients or Authorization header
        const url = new URL(request.url);
        const queryToken = url.searchParams.get("token");

        let authReq = request;
        if (queryToken && !request.headers.get("Authorization")) {
          authReq = new Request(request.url, {
            headers: {
              ...Object.fromEntries(request.headers.entries()),
              Authorization: `Bearer ${queryToken}`,
            },
          });
        }

        const user = await verifyAuthUser(authReq);
        if (!user) {
          return apiError("UNAUTHORIZED", "Authentication required", 401);
        }

        const { siteId } = params;

        const hasAccess = await checkUserSiteAccess(user.id, siteId, "VIEWER");
        if (!hasAccess) {
          return apiError("FORBIDDEN", "Access denied to this site", 403);
        }

        let unsubscribe: (() => void) | null = null;

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();

            const sendEvent = (event: string, data: unknown) => {
              try {
                const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(payload));
              } catch {
                // Client may have closed connection
              }
            };

            // Send initial connected handshake
            sendEvent("connected", {
              siteId,
              userId: user.id,
              timestamp: new Date().toISOString(),
            });

            // Subscribe to site events
            unsubscribe = subscribeToSiteEvents(
              siteId,
              (message: SSEMessage) => {
                sendEvent(message.type, message.data);
              },
            );

            // Clean up on abort / disconnect
            request.signal.addEventListener("abort", () => {
              if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
              }
              try {
                controller.close();
              } catch {
                // Already closed
              }
            });
          },
          cancel() {
            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
