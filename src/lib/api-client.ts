import type {
  AlertRecord,
  DashboardOverview,
  EventRecord,
  FlowHistoryPoint,
  FlowStatus,
  PurificationStatus,
  SensorCalibrationRecord,
  SimulatorExecutionResult,
  SiteRecord,
  WaterQualityHistoryPoint,
  WaterQualityReading,
  WaterSafetyResult,
} from "./types";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(
    message: string,
    code = "API_ERROR",
    status = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("hydrogrid_auth_token");
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem("hydrogrid_auth_token", token);
  } else {
    window.localStorage.removeItem("hydrogrid_auth_token");
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken() ?? "demo-admin-token";
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError(
        `HTTP error ${response.status}: ${response.statusText}`,
        "HTTP_ERROR",
        response.status,
      );
    }
    return {} as T;
  }

  const resObj = json as {
    data?: T;
    error?: { code?: string; message?: string; details?: unknown };
  };

  if (!response.ok || resObj.error) {
    const errObj = resObj.error;
    throw new ApiError(
      errObj?.message || `Request failed with status ${response.status}`,
      errObj?.code || "REQUEST_FAILED",
      response.status,
      errObj?.details,
    );
  }

  return resObj.data as T;
}

// HydroGrid API Client Methods
export const api = {
  // Sites
  getSites: () => apiFetch<{ sites: Array<SiteRecord> }>("/api/sites"),
  getSite: (siteId: string) =>
    apiFetch<{ site: SiteRecord }>(`/api/sites/${siteId}`),

  // Dashboard Overview
  getDashboardOverview: (siteId?: string) => {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return apiFetch<DashboardOverview>(`/api/dashboard/overview${q}`);
  },

  // Water Quality
  getWaterQualityCurrent: (siteId: string) =>
    apiFetch<{ reading: WaterQualityReading; timestamp: string }>(
      `/api/sites/${siteId}/water-quality/current`,
    ),
  getWaterQualityHistory: (
    siteId: string,
    params?: { from?: string; to?: string; interval?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.interval) search.set("interval", params.interval);
    const query = search.toString() ? `?${search.toString()}` : "";
    return apiFetch<Array<WaterQualityHistoryPoint>>(
      `/api/sites/${siteId}/water-quality/history${query}`,
    );
  },

  // Water Safety & Quality Gate
  getWaterSafety: (siteId: string) =>
    apiFetch<WaterSafetyResult>(`/api/sites/${siteId}/water-safety`),
  getQualityGate: (siteId: string) =>
    apiFetch<{
      status: "PASS" | "FAIL";
      waterRelease: "ALLOWED" | "BLOCKED";
      checks: Record<
        string,
        { value: number; min?: number; max?: number; status: string }
      >;
      checkedAt: string;
    }>(`/api/sites/${siteId}/quality-gate`),

  // Treatment & Purification
  getPurificationStatus: (siteId: string) =>
    apiFetch<PurificationStatus>(`/api/sites/${siteId}/purification/status`),

  // Flow & Leaks
  getFlowCurrent: (siteId: string) =>
    apiFetch<
      FlowStatus & {
        flowRate: number;
        nominalFlowRate?: number;
        differencePercent: number;
        thresholdPercent: number;
        isolationValve: string;
      }
    >(`/api/sites/${siteId}/flow/current`),
  getFlowHistory: (
    siteId: string,
    params?: { from?: string; to?: string; interval?: string },
  ) => {
    const search = new URLSearchParams();
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.interval) search.set("interval", params.interval);
    const query = search.toString() ? `?${search.toString()}` : "";
    return apiFetch<Array<FlowHistoryPoint>>(
      `/api/sites/${siteId}/flow/history${query}`,
    );
  },
  getLeaksCurrent: (siteId: string) =>
    apiFetch<{
      siteId: string;
      status: "NORMAL" | "LEAK_DETECTED";
      differencePercent: number;
      thresholdPercent: number;
      isolationValve: "OPEN" | "CLOSED";
      lastChecked: string;
    }>(`/api/sites/${siteId}/leaks/current`),

  // Devices & Sensors
  getDeviceSensorHealth: (deviceId: string) =>
    apiFetch<{
      deviceId: string;
      siteId: string;
      sensors: Record<string, { status: string; drift: number }>;
      lastUpdated: string;
    }>(`/api/devices/${deviceId}/sensors/health`),
  getCalibrations: (siteId: string) =>
    apiFetch<{ calibrations: Array<SensorCalibrationRecord> }>(
      `/api/sites/${siteId}/calibration`,
    ),
  recordCalibration: (
    siteId: string,
    payload: {
      sensor: string;
      offset: number;
      status?: string;
      deviceId?: string | null;
    },
  ) =>
    apiFetch<{ calibration: SensorCalibrationRecord }>(
      `/api/sites/${siteId}/calibration`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  getMaintenanceStatus: (siteId: string) =>
    apiFetch<{
      filters: Record<string, { status: string; lifePercent: number }>;
      lastUpdated: string;
    }>(`/api/sites/${siteId}/maintenance/status`),

  // Alerts & Events
  getAlerts: (siteId: string) =>
    apiFetch<{ alerts: Array<AlertRecord> }>(`/api/sites/${siteId}/alerts`),
  acknowledgeAlert: (siteId: string, alertId: string) =>
    apiFetch<{ alert: AlertRecord }>(
      `/api/sites/${siteId}/alerts/${alertId}/acknowledge`,
      { method: "PATCH" },
    ),
  getEvents: (siteId: string) =>
    apiFetch<{ events: Array<EventRecord> }>(`/api/sites/${siteId}/events`),

  // Simulator
  triggerSimulator: (payload: {
    siteId?: string;
    scenario: string;
    deviceId?: string | null;
  }) =>
    apiFetch<SimulatorExecutionResult>("/api/dev/simulator", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  triggerSimulatorAction: (action: string, siteId?: string) =>
    apiFetch<SimulatorExecutionResult>(`/api/dev/simulator/${action}`, {
      method: "POST",
      body: JSON.stringify({ siteId }),
    }),
};
