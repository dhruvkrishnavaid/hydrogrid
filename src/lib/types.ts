export type UserRole = "ADMIN" | "OPERATOR" | "VIEWER";

export interface SiteRecord {
  id: string;
  name: string;
  location?: string | null;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  created_at: string;
  updated_at: string;
}

export interface DeviceRecord {
  id: string;
  site_id: string;
  name: string;
  type: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE" | "FAULT";
  created_at: string;
  updated_at: string;
}

export interface WaterQualityReading {
  ph: number;
  turbidity: number;
  heavyMetals: number;
  dissolvedOxygen: number;
  tds: number;
  electricalConductivity: number;
  temperature: number;
  flowRate: number;
  hardness: number;
}

export interface ParameterViolation {
  parameter: string;
  value: number;
  threshold: number;
  direction: "HIGH" | "LOW";
  severity: "WARNING" | "CRITICAL";
  message: string;
}

export interface WaterSafetyResult {
  score: number;
  confidence: number;
  status: "SAFE" | "UNSAFE" | "UNKNOWN";
  qualityGate: "PASS" | "FAIL";
  waterRelease: "ALLOWED" | "BLOCKED";
  violations: Array<ParameterViolation>;
  reasons: Array<string>;
  evaluatedAt: string;
}

export interface PurificationStatus {
  mode: "NORMAL" | "MAINTENANCE" | "FAULT";
  stages: {
    sediment: "HEALTHY" | "WARNING" | "FAULT" | "MAINTENANCE_REQUIRED";
    carbon: "HEALTHY" | "WARNING" | "FAULT" | "MAINTENANCE_REQUIRED";
    calcite: "HEALTHY" | "WARNING" | "FAULT" | "MAINTENANCE_REQUIRED";
    uv: "ACTIVE" | "INACTIVE" | "FAULT" | "MAINTENANCE_REQUIRED";
  };
  pump: "RUNNING" | "STOPPED";
  filters: {
    sediment: { status: string; lifePercent: number };
    carbon: { status: string; lifePercent: number };
    calcite: { status: string; lifePercent: number };
    uv: { status: string; lifePercent: number };
  };
  lastUpdated: string;
}

export interface FlowStatus {
  flowRate: number;
  nominalFlowRate?: number;
  mismatchPercent: number;
  leakStatus: "NORMAL" | "LEAK_DETECTED" | "ISOLATED";
  valveStatus: "OPEN" | "CLOSED";
}

export interface AlertRecord {
  id: string;
  site_id: string;
  event_id?: string | null;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  status: "UNREAD" | "ACKNOWLEDGED" | "RESOLVED";
  message: string;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
}

export interface EventRecord {
  id: string;
  site_id: string;
  device_id?: string | null;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardOverview {
  site: SiteRecord;
  systemStatus: "ONLINE" | "DEGRADED" | "OFFLINE";
  devices: Array<DeviceRecord>;
  latestReading: WaterQualityReading;
  safety: WaterSafetyResult;
  purification: PurificationStatus;
  flow: FlowStatus;
  activeAlerts: Array<AlertRecord>;
  recentEvents: Array<EventRecord>;
  lastUpdated: string;
}

export interface WaterQualityHistoryPoint {
  timestamp: string;
  ph: number;
  turbidity: number;
  heavyMetals: number;
  dissolvedOxygen: number;
  tds: number;
  electricalConductivity: number;
  temperature: number;
  flowRate: number;
  hardness: number;
}

export interface FlowHistoryPoint {
  timestamp: string;
  flowRate: number;
  differencePercent: number;
}

export interface SensorCalibrationRecord {
  id: string;
  site_id: string;
  device_id?: string | null;
  sensor: string;
  offset: number;
  status: string;
  calibrated_at: string;
  next_due?: string | null;
}

export interface SimulatorExecutionResult {
  scenario: string;
  reading: WaterQualityReading;
  flow: FlowStatus;
  safety: WaterSafetyResult;
  deviceState: {
    status: "ONLINE" | "DEGRADED" | "OFFLINE" | "FAULT";
  };
  sensorHealth: {
    status: "HEALTHY" | "DEGRADED" | "CALIBRATION_REQUIRED" | "FAULT";
    drift: number;
  };
  purification: PurificationStatus;
  triggeredEvent: EventRecord | null;
  triggeredAlert: AlertRecord | null;
  simulatedAt: string;
}
