import { describe, expect, it } from "bun:test";

import { sanitizeHistoryParams } from "../../src/server/services/telemetry-history";

describe("Historical Telemetry Parameter Validation", () => {
  it("uses defaults when no parameters are provided", () => {
    const res = sanitizeHistoryParams();
    expect(res.error).toBeUndefined();
    expect(res.interval).toBe("5m");
    expect(Date.parse(res.fromIso)).toBeLessThan(Date.parse(res.toIso));
  });

  it("validates and accepts valid ISO timestamps and intervals", () => {
    const from = "2026-08-20T00:00:00.000Z";
    const to = "2026-08-24T00:00:00.000Z";
    const interval = "15m";

    const res = sanitizeHistoryParams({ from, to, interval });
    expect(res.error).toBeUndefined();
    expect(res.fromIso).toBe(from);
    expect(res.toIso).toBe(to);
    expect(res.interval).toBe("15m");
  });

  it("rejects invalid 'from' format", () => {
    const res = sanitizeHistoryParams({ from: "not-a-date" });
    expect(res.error).toContain("Invalid 'from' timestamp");
  });

  it("rejects invalid 'to' format", () => {
    const res = sanitizeHistoryParams({ to: "invalid-date" });
    expect(res.error).toContain("Invalid 'to' timestamp");
  });

  it("rejects 'from' after 'to'", () => {
    const from = "2026-08-24T12:00:00.000Z";
    const to = "2026-08-24T10:00:00.000Z";

    const res = sanitizeHistoryParams({ from, to });
    expect(res.error).toContain("must be strictly before");
  });

  it("rejects invalid interval formats", () => {
    const res = sanitizeHistoryParams({ interval: "invalid" });
    expect(res.error).toContain("Invalid 'interval' format");

    const res2 = sanitizeHistoryParams({ interval: "5x" });
    expect(res2.error).toContain("Invalid 'interval' format");
  });

  it("accepts valid intervals (1m, 5m, 1h, 1d)", () => {
    for (const interval of ["1m", "5m", "15m", "1h", "1d"]) {
      const res = sanitizeHistoryParams({ interval });
      expect(res.error).toBeUndefined();
      expect(res.interval).toBe(interval);
    }
  });

  it("rejects ranges exceeding 90 days", () => {
    const from = "2026-01-01T00:00:00.000Z";
    const to = "2026-08-01T00:00:00.000Z";

    const res = sanitizeHistoryParams({ from, to });
    expect(res.error).toContain("cannot exceed 90 days");
  });
});
