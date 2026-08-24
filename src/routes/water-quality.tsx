import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type {
  WaterQualityHistoryPoint,
  WaterQualityReading,
} from "../lib/types";

export const Route = createFileRoute("/water-quality")({
  component: WaterQualityPage,
});

function WaterQualityPage() {
  const {
    activeSiteId,
    isStationEntered,
    isLoading: isAuthLoading,
  } = useAuth();
  const [currentReading, setCurrentReading] =
    useState<WaterQualityReading | null>(null);
  const [history, setHistory] = useState<Array<WaterQualityHistoryPoint>>([]);
  const [selectedParam, setSelectedParam] =
    useState<keyof WaterQualityReading>("ph");
  const [interval, setInterval] = useState<string>("5m");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeSiteId || !isStationEntered) {
      if (!isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);

    Promise.all([
      api.getWaterQualityCurrent(activeSiteId),
      api.getWaterQualityHistory(activeSiteId, { interval }),
    ])
      .then(([curr, hist]) => {
        setCurrentReading(curr.reading);
        setHistory(hist);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [activeSiteId, interval, isAuthLoading, isStationEntered]);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="Water Quality Diagnostics" />;
  }

  const paramConfig: Record<
    keyof WaterQualityReading,
    {
      label: string;
      unit: string;
      description: string;
      role: string;
      safeMin?: number;
      safeMax?: number;
      whoStandard: string;
    }
  > = {
    ph: {
      label: "pH Level",
      unit: "pH",
      description: "Hydrogen-ion activity / Acidity vs Alkalinity balance",
      role: "Core Potability & Corrosion Metric",
      safeMin: 6.5,
      safeMax: 8.5,
      whoStandard: "6.5 – 8.5 (IS 10500:2012)",
    },
    turbidity: {
      label: "Turbidity",
      unit: "NTU",
      description: "Suspended colloidal matter & silt optical clarity",
      role: "Sediment Filtration Effectiveness",
      safeMax: 5.0,
      whoStandard: "Max 5.0 NTU (IS 10500:2012)",
    },
    heavyMetals: {
      label: "Heavy Metals Concentration",
      unit: "ppm",
      description: "Lead, Cadmium, Arsenic & industrial chemical pollutants",
      role: "Toxicological Safety Gate",
      safeMax: 0.1,
      whoStandard: "Max 0.10 ppm (Toxic Action Limit)",
    },
    dissolvedOxygen: {
      label: "Dissolved Oxygen (DO)",
      unit: "mg/L",
      description: "Dissolved oxygen saturation for microbial resistance",
      role: "Biological Freshness Indicator",
      safeMin: 6.5,
      whoStandard: "> 6.5 mg/L (Potable Freshness)",
    },
    tds: {
      label: "Total Dissolved Solids (TDS)",
      unit: "ppm",
      description: "Inorganic mineral salts and dissolved chemical species",
      role: "Mineralization & Salinity Indicator",
      safeMax: 500,
      whoStandard: "Max 500 ppm (IS 10500:2012)",
    },
    electricalConductivity: {
      label: "Electrical Conductivity (EC)",
      unit: "µS/cm",
      description: "Total ionic concentration in fluid pathway",
      role: "Dissolved Ionic Mobility",
      whoStandard: "Observational (< 1000 µS/cm)",
    },
    temperature: {
      label: "Water Temperature",
      unit: "°C",
      description: "Fluid temperature influencing gas and mineral solubility",
      role: "Physical Baseline Calibration",
      safeMin: 15.0,
      safeMax: 35.0,
      whoStandard: "15.0 – 35.0 °C (Ambient Potable)",
    },
    flowRate: {
      label: "Discharge Flow Rate",
      unit: "L/min",
      description: "Volumetric flow rate entering treatment pipeline",
      role: "Hydraulic Mass-Balance Input",
      safeMin: 30.0,
      safeMax: 50.0,
      whoStandard: "45.0 L/min (Design Rating)",
    },
    hardness: {
      label: "Total Hardness",
      unit: "mg/L",
      description: "Calcium and Magnesium carbonate mineral concentration",
      role: "Mineral Scaling & Palatability",
      safeMax: 300,
      whoStandard: "Max 300 mg/L as CaCO₃",
    },
  };

  const selectedMeta = paramConfig[selectedParam];
  const selectedValue = currentReading ? currentReading[selectedParam] : null;
  const isSelectedOutOfRange =
    selectedValue !== null &&
    ((selectedMeta.safeMin !== undefined &&
      selectedValue < selectedMeta.safeMin) ||
      (selectedMeta.safeMax !== undefined &&
        selectedValue > selectedMeta.safeMax));

  // Render SVG time-series chart
  const renderChart = () => {
    if (!history || history.length < 2) {
      return (
        <div className="flex h-48 items-center justify-center font-mono text-xs text-[var(--text-muted)]">
          No time-series samples recorded in selected window ({interval}).
        </div>
      );
    }

    const values = history.map((p) => p[selectedParam]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const width = 800;
    const height = 180;
    const padding = 36;

    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - 2 * padding);
      const y =
        height - padding - ((val - minVal) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(" L ")}`;

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
          {/* Grid lines */}
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="var(--border-subtle)"
            strokeDasharray="2 2"
          />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="var(--border-subtle)"
            strokeDasharray="2 2"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="var(--border-strong)"
          />

          {/* Coordinate axis labels */}
          <text
            x={padding - 6}
            y={padding + 3}
            textAnchor="end"
            className="fill-current font-mono text-[9px] text-[var(--text-dim)]"
          >
            {maxVal.toFixed(2)}
          </text>
          <text
            x={padding - 6}
            y={height - padding}
            textAnchor="end"
            className="fill-current font-mono text-[9px] text-[var(--text-dim)]"
          >
            {minVal.toFixed(2)}
          </text>

          {/* Data line */}
          <path
            d={pathData}
            fill="none"
            stroke="var(--brand-secondary)"
            strokeWidth="1.75"
          />

          {/* Plot points */}
          {values.map((val, idx) => {
            const x =
              padding + (idx / (values.length - 1)) * (width - 2 * padding);
            const y =
              height -
              padding -
              ((val - minVal) / range) * (height - 2 * padding);
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="2.5"
                className="fill-[var(--brand-secondary)] stroke-[var(--bg-surface)] stroke-1"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h1 className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
            Water Quality Telemetry & Evidence Registry
          </h1>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
            The continuous analytical evidence supporting the Quality Gate
            decision and water potability index
          </p>
        </div>

        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
            History:
          </span>
          {["1m", "5m", "15m", "1h", "1d"].map((int) => (
            <button
              key={int}
              onClick={() => setInterval(int)}
              className={`rounded border px-2 py-0.5 font-mono text-xs font-bold transition ${
                interval === int
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* 1. PARAMETER INSPECTOR & DIRECT TREND LINK */}
      <div className="ops-card space-y-4 p-5">
        {/* Channel Selector Pills */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-subtle)] pb-3">
          <span className="mr-2 font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase">
            Select Channel:
          </span>
          {(Object.keys(paramConfig) as Array<keyof WaterQualityReading>).map(
            (key) => (
              <button
                key={key}
                onClick={() => setSelectedParam(key)}
                className={`rounded px-2.5 py-1 font-mono text-[11px] font-bold transition ${
                  selectedParam === key
                    ? "bg-[var(--brand-primary)] text-white shadow-2xs"
                    : "bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--border-subtle)]"
                }`}
              >
                {paramConfig[key].label}
              </button>
            ),
          )}
        </div>

        {/* Selected Parameter Live Status Card */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
          <div className="space-y-1 lg:col-span-4">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-base font-extrabold text-[var(--text-primary)] uppercase">
                {selectedMeta.label}
              </h2>
              <span
                className={`py-0.2 rounded px-1.5 font-mono text-[9px] font-bold ${
                  isSelectedOutOfRange
                    ? "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                    : "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                }`}
              >
                {isSelectedOutOfRange ? "EXCEEDED LIMIT" : "NORMAL / SAFE"}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="telemetry-val text-4xl font-black text-[var(--text-primary)]">
                {selectedValue !== null ? selectedValue.toFixed(2) : "–"}
              </span>
              <span className="font-mono text-sm font-semibold text-[var(--text-muted)]">
                {selectedMeta.unit}
              </span>
            </div>

            <p className="font-sans text-xs text-[var(--text-muted)]">
              {selectedMeta.description}
            </p>

            <div className="space-y-0.5 pt-2 font-mono text-xs text-[var(--text-secondary)]">
              <div>
                <span className="text-[var(--text-dim)]">Standard Range: </span>
                <span className="font-bold">{selectedMeta.whoStandard}</span>
              </div>
              <div>
                <span className="text-[var(--text-dim)]">Channel Role: </span>
                <span>{selectedMeta.role}</span>
              </div>
            </div>
          </div>

          {/* Connected Time-Series Graph */}
          <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-3 lg:col-span-8">
            <div className="mb-2 flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-[var(--text-primary)]">
                Trend Graph: {selectedMeta.label} ({interval})
              </span>
              <span className="text-[10px] text-[var(--text-dim)]">
                InfluxDB Real-Time Stream
              </span>
            </div>

            {isLoading ? (
              <div className="flex h-44 items-center justify-center font-mono text-xs text-[var(--text-muted)]">
                <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--brand-secondary)] border-t-transparent" />
                Querying time-series telemetry...
              </div>
            ) : (
              renderChart()
            )}
          </div>
        </div>
      </div>

      {/* 2. COMPLETE REGULATORY COMPLIANCE REGISTRY */}
      <div className="ops-card space-y-3 p-4">
        <div>
          <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
            Comprehensive Regulatory Compliance Registry (9 Channels)
          </h3>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">
            Continuous verification against World Health Organization & Indian
            Standard IS 10500:2012
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] text-[var(--text-dim)] uppercase">
              <tr>
                <th className="px-3 py-2 font-bold">Parameter Channel</th>
                <th className="px-3 py-2 font-bold">Current Reading</th>
                <th className="px-3 py-2 font-bold">
                  Permissible Operating Range
                </th>
                <th className="px-3 py-2 font-bold">Regulatory Standard</th>
                <th className="px-3 py-2 font-bold">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {(
                Object.keys(paramConfig) as Array<keyof WaterQualityReading>
              ).map((key) => {
                const cfg = paramConfig[key];
                const val = currentReading ? currentReading[key] : null;
                const isViolation =
                  val !== null &&
                  ((cfg.safeMin !== undefined && val < cfg.safeMin) ||
                    (cfg.safeMax !== undefined && val > cfg.safeMax));

                return (
                  <tr
                    key={key}
                    onClick={() => setSelectedParam(key)}
                    className={`cursor-pointer transition ${
                      selectedParam === key
                        ? "bg-[var(--bg-subtle)]"
                        : "hover:bg-[var(--bg-surface-subtle)]"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <span className="block font-bold text-[var(--text-primary)]">
                        {cfg.label}
                      </span>
                      <span className="font-sans text-[10px] text-[var(--text-muted)]">
                        {cfg.role}
                      </span>
                    </td>
                    <td className="telemetry-val px-3 py-2 font-bold text-[var(--text-primary)]">
                      {val !== null ? `${val.toFixed(2)} ${cfg.unit}` : "–"}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {cfg.safeMin !== undefined && cfg.safeMax !== undefined
                        ? `${cfg.safeMin} – ${cfg.safeMax} ${cfg.unit}`
                        : cfg.safeMax !== undefined
                          ? `Max ${cfg.safeMax} ${cfg.unit}`
                          : "Observational"}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-dim)]">
                      {cfg.whoStandard}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                          isViolation
                            ? "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                            : "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                        }`}
                      >
                        {isViolation ? "EXCEEDED" : "NORMAL"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
