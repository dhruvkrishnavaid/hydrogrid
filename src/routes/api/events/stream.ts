import { createFileRoute } from "@tanstack/react-router";

import { verifyAuthUser } from "../../../server/auth/verify";
import { subscribeToGlobalEvents } from "../../../server/services/event-bus";
import type { SSEMessage } from "../../../server/services/event-bus";
import { apiError } from "../../../server/utils/response";

export const Route = createFileRoute("/api/events/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

        const PING_INTERVAL_MS = 15000;
        let unsubscribe: (() => void) | null = null;
        let pingTimer: ReturnType<typeof setTimeout> | null = null;

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();

            const clearPingTimer = () => {
              if (pingTimer) {
                clearTimeout(pingTimer);
                pingTimer = null;
              }
            };

            // Schedule ping to fire only after PING_INTERVAL_MS of inactivity
            const schedulePing = () => {
              clearPingTimer();
              pingTimer = setTimeout(() => {
                try {
                  controller.enqueue(encoder.encode(": ping\n\n"));
                  // Continue waiting for another idle interval
                  schedulePing();
                } catch {
                  // Connection closed
                }
              }, PING_INTERVAL_MS);
            };

            const sendEvent = (event: string, data: unknown) => {
              try {
                const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(payload));
                // Reset ping timer and restart from 0 whenever actual data is sent
                schedulePing();
              } catch {
                // Client may have closed connection
              }
            };

            // Send initial connected handshake (resets and starts ping timer from 0)
            sendEvent("connected", {
              userId: user.id,
              timestamp: new Date().toISOString(),
            });

            // Subscribe to global events
            unsubscribe = subscribeToGlobalEvents((message: SSEMessage) => {
              sendEvent(message.type, message.data);
            });

            // Clean up on abort / disconnect
            request.signal.addEventListener("abort", () => {
              clearPingTimer();
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
            if (pingTimer) {
              clearTimeout(pingTimer);
              pingTimer = null;
            }
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
