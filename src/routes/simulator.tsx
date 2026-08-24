import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { SimulatorExecutionResult } from "../lib/types";

export const Route = createFileRoute("/simulator")({
  component: SimulatorPage,
});

interface ScenarioMeta {
  name: string;
  badgeColor: string;
  title: string;
  category: "Water Safety" | "Hydraulics & Nodes" | "Maintenance & Reset";
  description: string;
  expectedState: string;
}

function SimulatorPage() {
  const { activeSiteId, isStationEntered, role } = useAuth();
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SimulatorExecutionResult | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="SCADA Demonstration Lab" />;
  }

  const canMutate = role === "ADMIN" || role === "OPERATOR";

  const scenarios: Array<ScenarioMeta> = [
    {
      name: "NORMAL",
      badgeColor:
        "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)] border border-[var(--state-safe-border)]",
      title: "1. Baseline Safe Operation",
      category: "Water Safety",
      description:
        "Injects nominal water parameters (pH 7.35, Turbidity 1.2 NTU, Heavy Metals 0.02 ppm, TDS 210 ppm).",
      expectedState:
        "Score: 100 | Gate: PASS | Release: ALLOWED | Pump: RUNNING | Alarms: None",
    },
    {
      name: "UNSAFE_HEAVY_METALS",
      badgeColor:
        "bg-[var(--state-danger-bg)] text-[var(--state-danger-text)] border border-[var(--state-danger-border)]",
      title: "2. Heavy Metals Contamination (Gate Lockout)",
      category: "Water Safety",
      description:
        "Injects toxic heavy metals reading (0.85 ppm > 0.10 limit) simulating industrial runoff.",
      expectedState:
        "Score: 55 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Pump: STOPPED | Alert: CRITICAL",
    },
    {
      name: "UNSAFE_PH",
      badgeColor:
        "bg-[var(--state-danger-bg)] text-[var(--state-danger-text)] border border-[var(--state-danger-border)]",
      title: "3. Severe Acidic Inflow",
      category: "Water Safety",
      description: "Injects acidic pH 4.2 (< 6.5 threshold limit).",
      expectedState:
        "Score: 65 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Alert: CRITICAL",
    },
    {
      name: "UNSAFE_TURBIDITY",
      badgeColor:
        "bg-[var(--state-danger-bg)] text-[var(--state-danger-text)] border border-[var(--state-danger-border)]",
      title: "4. High Turbidity Inflow (Silt Spill)",
      category: "Water Safety",
      description: "Injects heavy turbidity (18.5 NTU > 5.0 threshold).",
      expectedState:
        "Score: 78 | Gate: FAIL | Release: BLOCKED | Valve: CLOSED | Alert: CRITICAL",
    },
    {
      name: "LEAK",
      badgeColor:
        "bg-[var(--state-danger-bg)] text-[var(--state-danger-text)] border border-[var(--state-danger-border)]",
      title: "5. Distribution Pipeline Leak",
      category: "Hydraulics & Nodes",
      description:
        "Simulates outlet flow drop to 32 L/min (28.8% mismatch > 15.0% threshold).",
      expectedState:
        "Leak: DETECTED | Gate: FAIL | Valve: CLOSED (ISOLATED) | Alert: CRITICAL",
    },
    {
      name: "SENSOR_DRIFT",
      badgeColor:
        "bg-[var(--state-warn-bg)] text-[var(--state-warn-text)] border border-[var(--state-warn-border)]",
      title: "6. pH Probe Degradation & Drift",
      category: "Hydraulics & Nodes",
      description:
        "Simulates calibration loss (+0.85 drift) on primary pH electrode.",
      expectedState:
        "Probe: DEGRADED | Confidence drops to 73% | Alert: WARNING (Calibration Required)",
    },
    {
      name: "DEVICE_OFFLINE",
      badgeColor:
        "bg-[var(--state-danger-bg)] text-[var(--state-danger-text)] border border-[var(--state-danger-border)]",
      title: "7. Primary Node Power / Heartbeat Timeout",
      category: "Hydraulics & Nodes",
      description:
        "Simulates power loss or signal failure on Primary Sensor Node.",
      expectedState:
        "Device: OFFLINE | Gate: FAIL | Release: BLOCKED | Alert: CRITICAL",
    },
    {
      name: "DEVICE_ONLINE",
      badgeColor:
        "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)] border border-[var(--state-safe-border)]",
      title: "8. Node Reconnect & Heartbeat Recovery",
      category: "Hydraulics & Nodes",
      description: "Restores primary sensor node connectivity.",
      expectedState: "Device: ONLINE | Event: SYSTEM_RECOVERED",
    },
    {
      name: "FILTER_WARNING",
      badgeColor:
        "bg-[var(--state-warn-bg)] text-[var(--state-warn-text)] border border-[var(--state-warn-border)]",
      title: "9. Activated Carbon Filter Life Warning",
      category: "Maintenance & Reset",
      description: "Reduces Stage 2 filter media remaining life to 18%.",
      expectedState: "Carbon Life: 18% | Mode: MAINTENANCE | Alert: WARNING",
    },
    {
      name: "RESET",
      badgeColor:
        "bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-strong)]",
      title: "10. Full System Baseline Reset",
      category: "Maintenance & Reset",
      description:
        "Clears all active faults, restarts feed pump, opens valve, and restores clean 100 score.",
      expectedState:
        "System Clean: Score 100, Gate PASS, Release ALLOWED, Pump RUNNING",
    },
  ];

  const handleExecuteScenario = async (scenario: string) => {
    if (!activeSiteId) return;
    setLoadingScenario(scenario);
    setErrorMessage(null);
    setLastResult(null);

    try {
      const res = await api.triggerSimulator({
        siteId: activeSiteId,
        scenario,
      });
      setLastResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      setErrorMessage(msg);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Sandbox Header Callout */}
      <div className="space-y-1 rounded border border-[var(--brand-secondary)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--brand-primary)] uppercase">
          <span className="py-0.2 rounded bg-[var(--brand-primary)] px-1.5 text-[9px] text-white">
            DEMO LAB
          </span>
          <span>Controlled Scenario & Fault Injection Controller</span>
        </div>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          Inject deterministic hardware, water contamination, and hydraulic
          failure scenarios to verify real-time SCADA reactions across all
          monitoring tabs.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
        <h2 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
          Scenario Catalog (10 Scenarios)
        </h2>

        {!canMutate && (
          <div className="rounded border border-[var(--state-warn-border)] bg-[var(--state-warn-bg)] px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--state-warn-text)]">
            🔒 Switch to OPERATOR or ADMIN to trigger fault scenarios
          </div>
        )}
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios.map((sc) => (
          <div
            key={sc.name}
            className="ops-panel flex flex-col justify-between p-4"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`py-0.2 rounded px-1.5 font-mono text-[9px] font-bold uppercase ${sc.badgeColor}`}
                >
                  {sc.category}
                </span>
                <span className="font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase">
                  API: {sc.name}
                </span>
              </div>

              <h3 className="mb-1 font-mono text-sm font-bold text-[var(--text-primary)]">
                {sc.title}
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-[var(--text-muted)]">
                {sc.description}
              </p>

              <div className="mb-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5 font-mono text-xs text-[var(--text-primary)]">
                <span className="block text-[9px] font-bold text-[var(--text-dim)] uppercase">
                  Expected System Response:
                </span>
                {sc.expectedState}
              </div>
            </div>

            <button
              disabled={!canMutate || loadingScenario === sc.name}
              onClick={() => handleExecuteScenario(sc.name)}
              className="flex w-full items-center justify-center gap-2 rounded bg-[var(--brand-primary)] py-2 font-mono text-xs font-bold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-50"
            >
              {loadingScenario === sc.name ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Injecting Scenario...
                </>
              ) : (
                `▶ Inject Scenario: ${sc.name}`
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Strict Scenario Error Handling Verification Box */}
      <div className="ops-panel space-y-2 p-4">
        <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
          Strict Validation Demo (HTTP 400 Bad Request)
        </h3>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          Demonstrates that unknown or mistyped scenario names are strictly
          rejected with HTTP 400 and never silently fall back.
        </p>

        <button
          disabled={!canMutate || Boolean(loadingScenario)}
          onClick={() => handleExecuteScenario("UNKNOWN_BOGUS_SCENARIO")}
          className="rounded border border-purple-800 bg-purple-900 px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-purple-950 disabled:opacity-50"
        >
          ⚡ Inject Invalid Scenario ("UNKNOWN_BOGUS_SCENARIO")
        </button>
      </div>

      {/* Execution Feedback / Inspector */}
      {errorMessage && (
        <div className="rounded border border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] p-4 font-mono text-xs break-words text-[var(--state-danger-text)]">
          <div className="mb-1 flex items-center gap-2 font-bold">
            <span>✗</span>
            <span>BACKEND VALIDATION RESPONSE:</span>
          </div>
          {errorMessage}
        </div>
      )}

      {lastResult && (
        <div className="ops-panel space-y-3 border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] p-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[var(--state-safe-border)] pb-2 font-bold text-[var(--state-safe-text)]">
            <span>✓ SCENARIO INJECTED: {lastResult.scenario}</span>
            <span className="text-[10px]">
              {new Date(lastResult.simulatedAt).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Score / Conf
              </span>
              <span className="telemetry-val font-bold">
                {lastResult.safety.score} / {lastResult.safety.confidence}%
              </span>
            </div>
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Quality Gate
              </span>
              <span className="font-bold">{lastResult.safety.qualityGate}</span>
            </div>
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Water Release
              </span>
              <span className="font-bold">
                {lastResult.safety.waterRelease}
              </span>
            </div>
            <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Valve Status
              </span>
              <span className="font-bold">{lastResult.flow.valveStatus}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
