export type StageStatus =
  | "HEALTHY"
  | "ACTIVE"
  | "WARNING"
  | "DEGRADED"
  | "FAULT"
  | "OFF";

export type PumpStatus = "RUNNING" | "STOPPED" | "FAULT";

export type PurificationMode = "NORMAL" | "BYPASS" | "MAINTENANCE" | "FAULT";

export interface FilterHealth {
  status: "HEALTHY" | "WARNING" | "DEGRADED" | "FAULT";
  lifePercent: number;
}

export interface PurificationState {
  mode: PurificationMode;
  stages: {
    sediment: StageStatus;
    carbon: StageStatus;
    calcite: StageStatus;
    uv: StageStatus;
  };
  pump: PumpStatus;
  filters: {
    sediment: FilterHealth;
    carbon: FilterHealth;
    calcite: FilterHealth;
    uv: FilterHealth;
  };
  lastUpdated: string;
}

// In-memory purification state per site
const purificationStateBySite = new Map<string, PurificationState>();

const DEFAULT_PURIFICATION_STATE: PurificationState = {
  mode: "NORMAL",
  stages: {
    sediment: "HEALTHY",
    carbon: "HEALTHY",
    calcite: "HEALTHY",
    uv: "ACTIVE",
  },
  pump: "RUNNING",
  filters: {
    sediment: { status: "HEALTHY", lifePercent: 92.0 },
    carbon: { status: "HEALTHY", lifePercent: 84.0 },
    calcite: { status: "HEALTHY", lifePercent: 88.0 },
    uv: { status: "HEALTHY", lifePercent: 95.0 },
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * Gets the current purification state for a site.
 */
export function getPurificationStatus(
  siteId: string,
  isWaterBlocked = false,
): PurificationState {
  const current = purificationStateBySite.get(siteId) ?? {
    ...DEFAULT_PURIFICATION_STATE,
    stages: { ...DEFAULT_PURIFICATION_STATE.stages },
    filters: {
      sediment: { ...DEFAULT_PURIFICATION_STATE.filters.sediment },
      carbon: { ...DEFAULT_PURIFICATION_STATE.filters.carbon },
      calcite: { ...DEFAULT_PURIFICATION_STATE.filters.calcite },
      uv: { ...DEFAULT_PURIFICATION_STATE.filters.uv },
    },
    lastUpdated: new Date().toISOString(),
  };

  // If water release is blocked, the pump is automatically stopped
  if (isWaterBlocked) {
    return {
      ...current,
      pump: "STOPPED",
    };
  }

  return current;
}

/**
 * Updates the purification state for a site (e.g. from simulator or filter maintenance update).
 */
export function updatePurificationStatus(
  siteId: string,
  update: Partial<PurificationState>,
): PurificationState {
  const existing = getPurificationStatus(siteId);
  const updated: PurificationState = {
    ...existing,
    ...update,
    stages: {
      ...existing.stages,
      ...(update.stages ?? {}),
    },
    filters: {
      ...existing.filters,
      ...(update.filters ?? {}),
    },
    lastUpdated: new Date().toISOString(),
  };

  purificationStateBySite.set(siteId, updated);
  return updated;
}

/**
 * Resets purification status to clean baseline.
 */
export function resetPurificationStatus(siteId: string): PurificationState {
  const fresh: PurificationState = {
    ...DEFAULT_PURIFICATION_STATE,
    stages: { ...DEFAULT_PURIFICATION_STATE.stages },
    filters: {
      sediment: { ...DEFAULT_PURIFICATION_STATE.filters.sediment },
      carbon: { ...DEFAULT_PURIFICATION_STATE.filters.carbon },
      calcite: { ...DEFAULT_PURIFICATION_STATE.filters.calcite },
      uv: { ...DEFAULT_PURIFICATION_STATE.filters.uv },
    },
    lastUpdated: new Date().toISOString(),
  };
  purificationStateBySite.set(siteId, fresh);
  return fresh;
}
