import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { FlowHistoryPoint } from "../lib/types";

export const Route = createFileRoute("/flow")({
  component: FlowPage,
});

interface FlowCurrentData {
  inlet: number;
  outlet: number;
  differencePercent: number;
  thresholdPercent: number;
  status: string;
  isolationValve: string;
}

function FlowPage() {
  const {
    activeSiteId,
    isStationEntered,
    isLoading: isAuthLoading,
  } = useAuth();
  const [flowCurrent, setFlowCurrent] = useState<FlowCurrentData | null>(null);
  const [history, setHistory] = useState<Array<FlowHistoryPoint>>([]);
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
      api.getFlowCurrent(activeSiteId),
      api.getFlowHistory(activeSiteId, { interval }),
    ])
      .then(([curr, hist]) => {
        setFlowCurrent({
          inlet: curr.inlet ?? 45.0,
          outlet: curr.outlet ?? curr.outletFlowRate ?? 45.0,
          differencePercent:
            curr.differencePercent ?? curr.mismatchPercent ?? 0.0,
          thresholdPercent: curr.thresholdPercent ?? 15.0,
          status: curr.leakStatus ?? "NORMAL",
          isolationValve: curr.isolationValve ?? curr.valveStatus ?? "OPEN",
        });
        setHistory(hist);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [activeSiteId, interval, isAuthLoading, isStationEntered]);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="Hydraulic Flow & Leak Protection" />;
  }

  const isLeak =
    flowCurrent?.status === "LEAK_DETECTED" ||
    (flowCurrent?.differencePercent ?? 0) > 15.0;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h1 className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
            Hydraulic Flow & Pipeline Leak Protection
          </h1>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
            Continuous mass-balance differential verification: &ldquo;Is water
            entering the pipeline equal to water distributed?&rdquo;
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

      {/* Critical Leak Alert Banner */}
      {isLeak && (
        <div className="flex items-start gap-3 rounded border border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] p-3.5">
          <span className="text-base font-bold text-[var(--state-danger-text)]">
            ▲
          </span>
          <div>
            <h2 className="font-mono text-xs font-extrabold tracking-wider text-[var(--state-danger-text)] uppercase">
              PIPELINE LEAK DETECTED — AUTOMATED ISOLATION ENGAGED
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-primary)]">
              Flow mismatch ({flowCurrent?.differencePercent.toFixed(1)}%)
              exceeded the 15.0% trip limit. The distribution isolation valve
              has closed to prevent water loss and soil contamination.
            </p>
          </div>
        </div>
      )}

      {/* 1. CENTRAL PHYSICAL MASS-BALANCE FLOW DIAGRAM */}
      <div className="ops-card space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <h2 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
            Mass-Balance Hydraulic Flow Pipeline ($Q_1 \longrightarrow \Delta
            \longrightarrow Q_2$)
          </h2>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">
            Trip Threshold: 15.0% Mismatch
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 font-mono text-xs md:grid-cols-3">
          {/* Intake Section */}
          <div className="space-y-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4">
            <span className="block text-[10px] font-bold text-[var(--text-dim)] uppercase">
              1. Intake Node ($Q_1$)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="telemetry-val text-4xl font-black text-[var(--text-primary)]">
                {flowCurrent?.inlet ?? 45.0}
              </span>
              <span className="text-sm font-semibold text-[var(--text-muted)]">
                L/min
              </span>
            </div>
            <p className="font-sans text-[11px] text-[var(--text-muted)]">
              Volumetric inflow measured at intake submersible pump node.
            </p>
          </div>

          {/* Pipeline Differential Section */}
          <div
            className={`space-y-2 rounded border p-4 ${
              isLeak
                ? "border-[var(--state-danger-border)] bg-[var(--state-danger-bg)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
                2. Pipeline Verification ($\Delta$)
              </span>
              <span
                className={`py-0.2 rounded px-1.5 text-[9px] font-bold ${
                  !isLeak
                    ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                    : "bg-[var(--state-danger-text)] font-black text-white"
                }`}
              >
                {flowCurrent?.status ?? "NORMAL"}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span
                className={`telemetry-val text-4xl font-black ${
                  isLeak
                    ? "font-black text-[var(--state-danger-text)]"
                    : "text-[var(--state-safe-text)]"
                }`}
              >
                {flowCurrent?.differencePercent.toFixed(1) ?? "0.0"}%
              </span>
              <span className="text-xs text-[var(--text-dim)]">Mismatch</span>
            </div>

            <p className="font-sans text-[11px] text-[var(--text-muted)]">
              Calculated differential: $|Q_1 - Q_2| / Q_1 \times 100\%$. Safe
              trip limit is 15.0%.
            </p>
          </div>

          {/* Distribution Outlet Section */}
          <div className="space-y-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
                3. Distribution Meter ($Q_2$)
              </span>
              <span
                className={`py-0.2 rounded px-1.5 text-[9px] font-bold ${
                  flowCurrent?.isolationValve === "OPEN"
                    ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                    : "bg-[var(--state-danger-bg)] font-bold text-[var(--state-danger-text)]"
                }`}
              >
                VALVE: {flowCurrent?.isolationValve ?? "OPEN"}
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="telemetry-val text-4xl font-black text-[var(--text-primary)]">
                {flowCurrent?.outlet ?? 45.0}
              </span>
              <span className="text-sm font-semibold text-[var(--text-muted)]">
                L/min
              </span>
            </div>

            <p className="font-sans text-[11px] text-[var(--text-muted)]">
              Potable water delivered to community distribution pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* 2. COMPLETE HISTORICAL FLOW SAMPLES TABLE */}
      <div className="ops-card space-y-3 p-4">
        <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
          Historical Flow Samples Stream ({interval} Aggregation)
        </h3>
        {isLoading && history.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">
            Loading flow history from InfluxDB...
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">
            No historical flow samples in the selected window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] text-[var(--text-dim)] uppercase">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Intake Flow ($Q_1$)</th>
                  <th className="px-3 py-2">Outlet Flow ($Q_2$)</th>
                  <th className="px-3 py-2">Differential Mismatch</th>
                  <th className="px-3 py-2">Leak Detection State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {history.slice(0, 10).map((h, i) => (
                  <tr key={i} className="hover:bg-[var(--bg-subtle)]">
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                    <td className="telemetry-val px-3 py-2">
                      {h.inletFlowRate.toFixed(1)} L/min
                    </td>
                    <td className="telemetry-val px-3 py-2">
                      {h.outletFlowRate.toFixed(1)} L/min
                    </td>
                    <td className="telemetry-val px-3 py-2 font-bold">
                      {h.differencePercent.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                          h.differencePercent > 15.0
                            ? "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                            : "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                        }`}
                      >
                        {h.differencePercent > 15.0
                          ? "LEAK_DETECTED"
                          : "NORMAL"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
