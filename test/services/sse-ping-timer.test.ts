import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("SSE Ping Timer Reset Behavior", () => {
  let pingCount = 0;
  let sentEvents: Array<{ event: string; data: unknown }> = [];
  let pingTimer: ReturnType<typeof setTimeout> | null = null;
  const PING_INTERVAL_MS = 100; // Fast interval for testing

  const clearPingTimer = () => {
    if (pingTimer) {
      clearTimeout(pingTimer);
      pingTimer = null;
    }
  };

  const schedulePing = () => {
    clearPingTimer();
    pingTimer = setTimeout(() => {
      pingCount++;
      schedulePing();
    }, PING_INTERVAL_MS);
  };

  const sendEvent = (event: string, data: unknown) => {
    sentEvents.push({ event, data });
    // Reset ping timer and restart from 0 whenever actual data is sent
    schedulePing();
  };

  beforeEach(() => {
    pingCount = 0;
    sentEvents = [];
    clearPingTimer();
  });

  afterEach(() => {
    clearPingTimer();
  });

  it("resets ping timer and delays ping when actual data is sent within the interval", async () => {
    // Start initial connection
    sendEvent("connected", { status: "ready" });
    expect(sentEvents).toHaveLength(1);
    expect(pingCount).toBe(0);

    // Wait 60ms (less than 100ms interval)
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(pingCount).toBe(0);

    // Send actual data before 100ms expires - this must reset the ping timer back to 0
    sendEvent("water-quality.updated", { turbidity: 1.5 });
    expect(sentEvents).toHaveLength(2);

    // Wait another 60ms (total 120ms since start, but only 60ms since last data)
    await new Promise((resolve) => setTimeout(resolve, 60));
    // Since timer was reset, ping should STILL NOT have fired!
    expect(pingCount).toBe(0);

    // Wait another 50ms (now 110ms since last data, exceeding 100ms interval)
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Now the ping should have fired exactly once
    expect(pingCount).toBe(1);
  });

  it("fires subsequent pings only after full idle interval", async () => {
    sendEvent("connected", { status: "ready" });

    // Idle for 250ms (should trigger 2 pings at 100ms and 200ms)
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(pingCount).toBe(2);

    // Send actual data - resets ping timer again
    sendEvent("flow.updated", { flowRate: 42.0 });
    const pingsBefore = pingCount;

    // Wait 60ms (less than 100ms)
    await new Promise((resolve) => setTimeout(resolve, 60));
    // Should not have incremented
    expect(pingCount).toBe(pingsBefore);

    // Wait another 50ms
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(pingCount).toBe(pingsBefore + 1);
  });
});
