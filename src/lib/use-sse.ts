import { useEffect, useRef, useState } from "react";

import { getStoredToken } from "./api-client";

export type SSEConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface UseSSEOptions {
  siteId?: string | null;
  onEvent?: (type: string, data: unknown) => void;
  enabled?: boolean;
}

export function useSSE({ siteId, onEvent, enabled = true }: UseSSEOptions) {
  const [connectionState, setConnectionState] =
    useState<SSEConnectionState>("disconnected");
  const [lastEvent, setLastEvent] = useState<{
    type: string;
    data: unknown;
    timestamp: string;
  } | null>(null);

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const token = getStoredToken();

    // Do not attempt SSE connection without a siteId and token
    if (!enabled || !siteId || !token || typeof window === "undefined") {
      setConnectionState("disconnected");
      return;
    }

    const endpoint = `/api/sites/${encodeURIComponent(siteId)}/events/stream?token=${encodeURIComponent(token)}`;

    setConnectionState("connecting");

    const eventSource = new EventSource(endpoint);

    eventSource.onopen = () => {
      setConnectionState("connected");
    };

    eventSource.onerror = () => {
      // If error occurs, update status
      setConnectionState("error");
    };

    const handleMessage = (type: string) => (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        const eventPayload = {
          type,
          data: parsed,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(eventPayload);
        if (onEventRef.current) {
          onEventRef.current(type, parsed);
        }
      } catch {
        // ignore JSON parse error
      }
    };

    const eventTypes = [
      "connected",
      "water-quality.updated",
      "water-safety.updated",
      "quality-gate.changed",
      "flow.updated",
      "leak.detected",
      "leak.isolated",
      "device.status-changed",
      "sensor.health-changed",
      "maintenance.updated",
      "alert.created",
      "system.recovered",
    ];

    for (const evt of eventTypes) {
      eventSource.addEventListener(evt, handleMessage(evt));
    }

    return () => {
      eventSource.close();
      setConnectionState("disconnected");
    };
  }, [siteId, enabled]);

  return { connectionState, lastEvent };
}
