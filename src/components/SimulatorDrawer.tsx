import { useState } from "react";
import type React from "react";

import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";

export const SimulatorDrawer: React.FC = () => {
  const { activeSiteId, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const canMutate = role === "ADMIN" || role === "OPERATOR";

  const triggerScenario = async (scenario: string) => {
    if (!activeSiteId) return;
    setLoadingScenario(scenario);
    setIsError(false);
    setLastResult(null);

    try {
      const res = await api.triggerSimulator({
        siteId: activeSiteId,
        scenario,
      });
      setLastResult(
        `✓ [${scenario}] Score: ${res.safety.score} | Gate: ${res.safety.qualityGate} | Release: ${res.safety.waterRelease}`,
      );
    } catch (err: unknown) {
      setIsError(true);
      const msg = err instanceof Error ? err.message : "Simulation failed";
      setLastResult(`✗ [ERROR] ${msg}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-40">
      {/* Floating Pill Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-xs font-bold text-[var(--text-primary)] shadow-md transition hover:bg-[var(--bg-subtle)]"
          title="Open Controlled Demonstration Scenario Injector"
        >
          <span className="font-black text-[var(--brand-secondary)]">⚡</span>
          <span>Demo Injector</span>
        </button>
      )}

      {/* Drawer Control Panel */}
      {isOpen && (
        <div className="w-80 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 shadow-xl backdrop-blur-md sm:w-96">
          <div className="mb-3 flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[var(--brand-secondary)]">
                ⚡
              </span>
              <h3 className="m-0 font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                Demo Scenario Injector
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="font-mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              [✕ Close]
            </button>
          </div>

          {!canMutate && (
            <div className="mb-3 rounded border border-[var(--state-warn-border)] bg-[var(--state-warn-bg)] p-2 font-mono text-[11px] font-semibold text-[var(--state-warn-text)]">
              🔒 Switch persona to OPERATOR or ADMIN to inject scenarios.
            </div>
          )}

          <div className="space-y-3 font-mono text-xs">
            {/* Water Quality Contaminants */}
            <div>
              <span className="mb-1 block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                Water Contamination Scenarios
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("NORMAL")}
                  className="rounded border border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] px-2 py-1 text-left font-semibold text-[var(--state-safe-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ● Safe / Normal
                </button>
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("UNSAFE_HEAVY_METALS")}
                  className="rounded border border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] px-2 py-1 text-left font-semibold text-[var(--state-danger-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ▲ Heavy Metals
                </button>
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("UNSAFE_PH")}
                  className="rounded border border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] px-2 py-1 text-left font-semibold text-[var(--state-danger-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ▲ Acidic pH (4.2)
                </button>
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("UNSAFE_TURBIDITY")}
                  className="rounded border border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] px-2 py-1 text-left font-semibold text-[var(--state-danger-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ▲ Turbidity Spill
                </button>
              </div>
            </div>

            {/* Pipeline & Hardware Faults */}
            <div>
              <span className="mb-1 block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                Hydraulic & Node Faults
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("LEAK")}
                  className="rounded border border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] px-2 py-1 text-left font-semibold text-[var(--state-danger-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ▲ Pipe Leak (28%)
                </button>
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("SENSOR_DRIFT")}
                  className="rounded border border-[var(--state-warn-border)] bg-[var(--state-warn-bg)] px-2 py-1 text-left font-semibold text-[var(--state-warn-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ◆ pH Probe Drift
                </button>
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("DEVICE_OFFLINE")}
                  className="rounded border border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] px-2 py-1 text-left font-semibold text-[var(--state-danger-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ▲ Node Offline
                </button>
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("DEVICE_ONLINE")}
                  className="rounded border border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] px-2 py-1 text-left font-semibold text-[var(--state-safe-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ● Node Online
                </button>
              </div>
            </div>

            {/* Maintenance & Reset */}
            <div>
              <span className="mb-1 block text-[10px] font-bold text-[var(--text-dim)] uppercase">
                Maintenance & Reset
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("FILTER_WARNING")}
                  className="rounded border border-[var(--state-warn-border)] bg-[var(--state-warn-bg)] px-2 py-1 text-left font-semibold text-[var(--state-warn-text)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ◆ Filter Warning
                </button>
                <button
                  disabled={!canMutate || Boolean(loadingScenario)}
                  onClick={() => triggerScenario("RESET")}
                  className="rounded border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-2 py-1 text-left font-semibold text-[var(--text-primary)] transition hover:brightness-95 disabled:opacity-50"
                >
                  ↺ Baseline Reset
                </button>
              </div>
            </div>
          </div>

          {loadingScenario && (
            <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-muted)]">
              <span className="h-2 w-2 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
              Injecting scenario {loadingScenario}...
            </div>
          )}

          {lastResult && (
            <div
              className={`mt-2.5 rounded border p-2 font-mono text-[11px] break-words ${
                isError
                  ? "border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] text-[var(--state-danger-text)]"
                  : "border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
              }`}
            >
              {lastResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
