import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { AlertRecord, EventRecord } from "../lib/types";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
});

function AlertsPage() {
  const {
    activeSiteId,
    isStationEntered,
    role,
    isLoading: isAuthLoading,
  } = useAuth();
  const [alerts, setAlerts] = useState<Array<AlertRecord>>([]);
  const [events, setEvents] = useState<Array<EventRecord>>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const canAcknowledge = role === "ADMIN" || role === "OPERATOR";

  const loadData = useCallback(async () => {
    if (!activeSiteId || !isStationEntered) {
      if (!isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const [alertRes, eventRes] = await Promise.all([
        api.getAlerts(activeSiteId),
        api.getEvents(activeSiteId),
      ]);
      setAlerts(alertRes.alerts);
      setEvents(eventRes.events);
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
    return <NoStationSelected title="System Alarms & Audit Log" />;
  }

  const handleAcknowledge = async (alertId: string) => {
    if (!activeSiteId || !canAcknowledge) return;
    setAcknowledgingId(alertId);
    try {
      await api.acknowledgeAlert(activeSiteId, alertId);
      loadData();
    } catch {
      // ignore
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredAlerts = alerts.filter(
    (a) => severityFilter === "ALL" || a.severity === severityFilter,
  );
  const filteredEvents = events.filter(
    (e) => severityFilter === "ALL" || e.severity === severityFilter,
  );

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h1 className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
            Operational Incident Queue & Event Stream
          </h1>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
            Active plant alarms, Quality Gate lockout decisions, and automated
            state transition audit trail
          </p>
        </div>

        <div className="flex items-center gap-1 font-mono text-xs">
          <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
            Filter:
          </span>
          {["ALL", "CRITICAL", "WARNING", "INFO"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`rounded border px-2 py-0.5 font-mono text-xs font-bold transition ${
                severityFilter === sev
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* 1. ACTIVE ALARMS QUEUE */}
      <div className="ops-card space-y-3 p-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <h2 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
            Active Alarms Incident Queue ({filteredAlerts.length})
          </h2>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">
            Acknowledge to record operator response
          </span>
        </div>

        {isLoading && alerts.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs text-[var(--text-muted)]">
            Loading system alarms...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-[var(--text-muted)]">
            ● No active alarms matching the selected severity filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlerts.map((a) => (
              <div
                key={a.id}
                className={`flex items-start justify-between gap-3 rounded border p-3 font-mono text-xs ${
                  a.severity === "CRITICAL"
                    ? "border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] text-[var(--state-danger-text)]"
                    : a.severity === "WARNING"
                      ? "border-[var(--state-warn-border)] bg-[var(--state-warn-bg)] text-[var(--state-warn-text)]"
                      : "border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold tracking-wider uppercase">
                      [{a.severity}] {a.type}
                    </span>
                    <span className="py-0.2 rounded border bg-[var(--bg-surface)] px-1.5 text-[9px] font-bold text-[var(--text-primary)]">
                      STATUS: {a.status}
                    </span>
                  </div>
                  <p className="m-0 font-sans text-xs text-[var(--text-primary)]">
                    {a.message}
                  </p>
                  <span className="block text-[10px] opacity-75">
                    Triggered: {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>

                {a.status === "UNREAD" && (
                  <button
                    disabled={!canAcknowledge || acknowledgingId === a.id}
                    onClick={() => handleAcknowledge(a.id)}
                    className="shrink-0 rounded bg-[var(--brand-primary)] px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-50"
                  >
                    {acknowledgingId === a.id ? "Saving..." : "ACKNOWLEDGE"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. OPERATIONAL AUDIT LOG */}
      <div className="ops-card space-y-3 p-4">
        <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
          Plant Operational Event Audit Log ({filteredEvents.length})
        </h3>
        {filteredEvents.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-[var(--text-muted)]">
            No events found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] text-[var(--text-dim)] uppercase">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Event Classification</th>
                  <th className="px-3 py-2">Operational Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--bg-subtle)]">
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-bold">
                      <span
                        className={`py-0.2 rounded px-1.5 text-[9px] font-bold ${
                          e.severity === "CRITICAL"
                            ? "bg-[var(--state-danger-bg)] text-[var(--state-danger-text)]"
                            : e.severity === "WARNING"
                              ? "bg-[var(--state-warn-bg)] text-[var(--state-warn-text)]"
                              : "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                        }`}
                      >
                        {e.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                      {e.type}
                    </td>
                    <td className="px-3 py-2 font-sans text-xs text-[var(--text-muted)]">
                      {e.message}
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
