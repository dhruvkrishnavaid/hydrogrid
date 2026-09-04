import { useEffect, useRef, useState } from "react";

import { getStoredToken } from "./api-client";

export type SSEConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface UseSSEOptions {
  siteId?: string | null;
  token?: string | null;
  onEvent?: (type: string, data: unknown) => void;
  enabled?: boolean;
}

export function useSSE({
  siteId,
  token: explicitToken,
  onEvent,
  enabled = true,
}: UseSSEOptions = {}) {
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
    if (!enabled || !siteId || typeof window === "undefined") {
      setConnectionState("disconnected");
      return;
    }

    const token = explicitToken ?? getStoredToken() ?? "demo-admin-token";

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;

      const endpoint = `/api/sites/${encodeURIComponent(siteId!)}/events/stream?token=${encodeURIComponent(token)}`;

      setConnectionState("connecting");

      eventSource = new EventSource(endpoint);

      eventSource.onopen = () => {
        if (isDisposed) return;
        setConnectionState("connected");
      };

      eventSource.onerror = () => {
        if (isDisposed) return;
        setConnectionState("error");
        eventSource?.close();
        reconnectTimeout = setTimeout(() => {
          if (!isDisposed) connect();
        }, 3000);
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

      eventSource.onmessage = (e: MessageEvent) => {
        handleMessage("message")(e);
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
        "alert.acknowledged",
        "system.recovered",
      ];

      for (const evt of eventTypes) {
        eventSource.addEventListener(evt, handleMessage(evt));
      }
    }

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
      }
      setConnectionState("disconnected");
    };
  }, [siteId, enabled, explicitToken]);

  return { connectionState, lastEvent };
}
