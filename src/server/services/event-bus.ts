export type SSEEventType =
  | "connected"
  | "water-quality.updated"
  | "water-safety.updated"
  | "quality-gate.changed"
  | "flow.updated"
  | "leak.detected"
  | "leak.isolated"
  | "device.status-changed"
  | "sensor.health-changed"
  | "maintenance.updated"
  | "alert.created"
  | "system.recovered";

export interface SSEMessage {
  type: SSEEventType | string;
  data: unknown;
  timestamp: string;
}

type SSEListener = (message: SSEMessage) => void;

declare global {
  var __hydrogridSubscribersBySite: Map<string, Set<SSEListener>> | undefined;
  var __hydrogridGlobalSubscribers: Set<SSEListener> | undefined;
}

// In-memory subscriber sets keyed by siteId (persisted across SSR module reloads)
const subscribersBySite =
  globalThis.__hydrogridSubscribersBySite ??
  (globalThis.__hydrogridSubscribersBySite = new Map<
    string,
    Set<SSEListener>
  >());
const globalSubscribers =
  globalThis.__hydrogridGlobalSubscribers ??
  (globalThis.__hydrogridGlobalSubscribers = new Set<SSEListener>());

/**
 * Subscribes a listener to SSE events for a specific site.
 * Returns an unsubscribe function.
 */
export function subscribeToSiteEvents(
  siteId: string,
  listener: SSEListener,
): () => void {
  if (!subscribersBySite.has(siteId)) {
    subscribersBySite.set(siteId, new Set());
  }
  const siteSubs = subscribersBySite.get(siteId)!;
  siteSubs.add(listener);

  return () => {
    siteSubs.delete(listener);
    if (siteSubs.size === 0) {
      subscribersBySite.delete(siteId);
    }
  };
}

/**
 * Subscribes a listener to all global SSE events across all sites.
 * Returns an unsubscribe function.
 */
export function subscribeToGlobalEvents(listener: SSEListener): () => void {
  globalSubscribers.add(listener);
  return () => {
    globalSubscribers.delete(listener);
  };
}

/**
 * Broadcasts an event to all subscribers of a site and global subscribers.
 */
export function broadcastSiteEvent(
  siteId: string,
  type: SSEEventType | string,
  data: unknown,
): void {
  const message: SSEMessage = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  const siteSubs = subscribersBySite.get(siteId);
  if (siteSubs) {
    for (const listener of siteSubs) {
      try {
        listener(message);
      } catch (err) {
        console.error("Error in SSE listener:", err);
      }
    }
  }

  for (const listener of globalSubscribers) {
    try {
      listener(message);
    } catch (err) {
      console.error("Error in global SSE listener:", err);
    }
  }
}

/**
 * Returns current active subscriber count.
 */
export function getSubscriberCount(siteId?: string): number {
  if (siteId) {
    return subscribersBySite.get(siteId)?.size ?? 0;
  }
  let total = globalSubscribers.size;
  for (const subs of subscribersBySite.values()) {
    total += subs.size;
  }
  return total;
}
