import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type React from "react";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { DeviceRecord, SensorCalibrationRecord } from "../lib/types";

export const Route = createFileRoute("/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  const {
    activeSiteId,
    isStationEntered,
    role,
    isLoading: isAuthLoading,
  } = useAuth();
  const [devices, setDevices] = useState<Array<DeviceRecord>>([]);
  const [calibrations, setCalibrations] = useState<
    Array<SensorCalibrationRecord>
  >([]);
  const [calSensor, setCalSensor] = useState<string>("ph");
  const [calOffset, setCalOffset] = useState<string>("0.00");
  const [isSubmittingCal, setIsSubmittingCal] = useState<boolean>(false);
  const [calMessage, setCalMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const canCalibrate = role === "ADMIN" || role === "OPERATOR";

  const loadData = useCallback(async () => {
    if (!activeSiteId || !isStationEntered) {
      if (!isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const [devRes, calRes] = await Promise.all([
        api.getDashboardOverview(activeSiteId).then((o) => o.devices),
        api.getCalibrations(activeSiteId).then((c) => c.calibrations),
      ]);
      setDevices(devRes);
      setCalibrations(calRes);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeSiteId, isAuthLoading, isStationEntered]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="Hardware Diagnostics & Calibration" />;
  }

  const handleRecordCalibration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSiteId || !canCalibrate) return;
    setIsSubmittingCal(true);
    setCalMessage(null);

    try {
      const offsetNum = Number.parseFloat(calOffset);
      await api.recordCalibration(activeSiteId, {
        sensor: calSensor,
        offset: Number.isNaN(offsetNum) ? 0 : offsetNum,
        status: "HEALTHY",
      });
      setCalMessage(
        "✓ Calibration offset recorded successfully. Sensor drift cleared.",
      );
      setCalOffset("0.00");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Calibration failed";
      setCalMessage(`✗ Error: ${msg}`);
    } finally {
      setIsSubmittingCal(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h1 className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
            Hardware Fleet Diagnostics & Sensor Calibration
          </h1>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
            Microcontroller telemetry fleet connectivity, probe health, and
            standard calibration adjustments
          </p>
        </div>
      </div>

      {isLoading && devices.length === 0 ? (
        <div className="flex h-56 items-center justify-center font-mono text-xs text-[var(--text-muted)]">
          <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--brand-secondary)] border-t-transparent" />
          Querying hardware nodes and probe telemetry...
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. NODE FLEET HEALTH SUMMARY */}
          <div className="ops-card space-y-3 p-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h2 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                Node Fleet Health (
                {devices.filter((d) => d.status === "ONLINE").length}/
                {devices.length} Online)
              </h2>
              <span className="font-mono text-[10px] text-[var(--text-dim)]">
                Heartbeat Sync & Edge Architecture
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] text-[var(--text-dim)] uppercase">
                  <tr>
                    <th className="px-3 py-2">Device Node</th>
                    <th className="px-3 py-2">Architecture Type</th>
                    <th className="px-3 py-2">Operating State</th>
                    <th className="px-3 py-2">Last Heartbeat Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {devices.map((d) => (
                    <tr key={d.id} className="hover:bg-[var(--bg-subtle)]">
                      <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                        {d.name}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-muted)]">
                        {d.type}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                            d.status === "ONLINE"
                              ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                              : d.status === "DEGRADED"
                                ? "bg-[var(--state-warn-bg)] text-[var(--state-warn-text)]"
                                : "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[var(--text-dim)]">
                        {new Date(d.updated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. SENSOR CALIBRATION WORKSPACE */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Record Calibration Offset Form */}
            <div className="ops-card space-y-3 p-4">
              <div>
                <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                  Record Sensor Calibration Offset
                </h3>
                <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
                  Submit standardization buffer offset readings to clear
                  electrode drift and restore confidence ratings.
                </p>
              </div>

              <form
                onSubmit={handleRecordCalibration}
                className="space-y-3 font-mono text-xs"
              >
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                    Target Sensor:
                  </label>
                  <select
                    value={calSensor}
                    onChange={(e) => setCalSensor(e.target.value)}
                    className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
                  >
                    <option value="ph">
                      pH Probe (pH 7.00 Buffer Solution)
                    </option>
                    <option value="tds">
                      TDS Electrode (1413 µS/cm Standard)
                    </option>
                    <option value="turbidity">
                      Turbidity Nephelometer (20.0 NTU Standard)
                    </option>
                    <option value="heavyMetals">
                      Heavy Metals Sensor (0.10 ppm Reference)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                    Calibration Offset (+/-):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={calOffset}
                    onChange={(e) => setCalOffset(e.target.value)}
                    className="telemetry-val w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canCalibrate || isSubmittingCal}
                  className="w-full rounded bg-[var(--brand-primary)] py-2 font-mono text-xs font-bold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-50"
                >
                  {isSubmittingCal
                    ? "Recording..."
                    : "Save Calibration & Clear Drift"}
                </button>

                {!canCalibrate && (
                  <span className="block text-[10px] font-semibold text-[var(--state-warn-text)]">
                    🔒 Requires OPERATOR or ADMIN persona to calibrate probes.
                  </span>
                )}

                {calMessage && (
                  <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2 text-xs">
                    {calMessage}
                  </div>
                )}
              </form>
            </div>

            {/* Calibration Audit Log */}
            <div className="ops-card space-y-3 p-4">
              <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                Calibration History Audit Log
              </h3>
              {calibrations.length === 0 ? (
                <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">
                  No previous calibration records found.
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {calibrations.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5"
                    >
                      <div>
                        <span className="mr-2 font-bold text-[var(--text-primary)] uppercase">
                          {c.sensor}
                        </span>
                        <span className="telemetry-val text-[var(--text-muted)]">
                          Offset: {c.offset > 0 ? `+${c.offset}` : c.offset}
                        </span>
                        <span className="block text-[10px] text-[var(--text-dim)]">
                          Calibrated:{" "}
                          {new Date(c.calibrated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="py-0.2 rounded bg-[var(--state-safe-bg)] px-1.5 text-[10px] font-bold text-[var(--state-safe-text)]">
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
