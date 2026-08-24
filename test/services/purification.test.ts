import { describe, expect, it } from "bun:test";

import {
  getPurificationStatus,
  resetPurificationStatus,
  updatePurificationStatus,
} from "../../src/server/services/purification";

describe("Purification Pipeline Service", () => {
  const siteId = "test-site-purification";

  it("returns default 4-stage healthy status and running pump", () => {
    const status = getPurificationStatus(siteId);

    expect(status.mode).toBe("NORMAL");
    expect(status.stages.sediment).toBe("HEALTHY");
    expect(status.stages.carbon).toBe("HEALTHY");
    expect(status.stages.calcite).toBe("HEALTHY");
    expect(status.stages.uv).toBe("ACTIVE");
    expect(status.pump).toBe("RUNNING");
    expect(status.filters.carbon.lifePercent).toBe(84.0);
  });

  it("stops pump automatically when water release is blocked", () => {
    const status = getPurificationStatus(siteId, true);

    expect(status.pump).toBe("STOPPED");
  });

  it("updates filter health and switches mode to MAINTENANCE on warning", () => {
    updatePurificationStatus(siteId, {
      mode: "MAINTENANCE",
      stages: {
        sediment: "HEALTHY",
        carbon: "WARNING",
        calcite: "HEALTHY",
        uv: "ACTIVE",
      },
      filters: {
        sediment: { status: "HEALTHY", lifePercent: 88.0 },
        carbon: { status: "WARNING", lifePercent: 18.0 },
        calcite: { status: "HEALTHY", lifePercent: 85.0 },
        uv: { status: "HEALTHY", lifePercent: 92.0 },
      },
    });

    const updated = getPurificationStatus(siteId);
    expect(updated.mode).toBe("MAINTENANCE");
    expect(updated.stages.carbon).toBe("WARNING");
    expect(updated.filters.carbon.lifePercent).toBe(18.0);
  });

  it("resets purification status cleanly to baseline", () => {
    const reset = resetPurificationStatus(siteId);
    expect(reset.mode).toBe("NORMAL");
    expect(reset.stages.carbon).toBe("HEALTHY");
    expect(reset.filters.carbon.lifePercent).toBe(84.0);
  });
});
