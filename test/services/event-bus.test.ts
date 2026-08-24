import { describe, expect, it } from "bun:test";

import {
  broadcastSiteEvent,
  getSubscriberCount,
  subscribeToGlobalEvents,
  subscribeToSiteEvents,
} from "../../src/server/services/event-bus";

describe("SSE EventBus Service", () => {
  const siteId = "site-test-bus";

  it("subscribes and receives site-specific events", () => {
    const received: Array<{ type: string; data: unknown }> = [];

    const unsubscribe = subscribeToSiteEvents(siteId, (msg) => {
      received.push(msg);
    });

    expect(getSubscriberCount(siteId)).toBe(1);

    broadcastSiteEvent(siteId, "water-quality.updated", { ph: 7.2 });
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe("water-quality.updated");

    unsubscribe();
    expect(getSubscriberCount(siteId)).toBe(0);

    broadcastSiteEvent(siteId, "water-quality.updated", { ph: 7.4 });
    expect(received).toHaveLength(1); // No new message after unsubscribe
  });

  it("global subscribers receive events from any site", () => {
    const globalReceived: Array<{ type: string; data: unknown }> = [];

    const unsubscribe = subscribeToGlobalEvents((msg) => {
      globalReceived.push(msg);
    });

    broadcastSiteEvent("random-site-123", "leak.detected", {
      differencePercent: 25.0,
    });
    expect(globalReceived).toHaveLength(1);
    expect(globalReceived[0].type).toBe("leak.detected");

    unsubscribe();
  });
});
