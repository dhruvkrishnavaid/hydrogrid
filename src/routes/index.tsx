import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { DashboardOverview } from "../lib/types";
import { useSSE } from "../lib/use-sse";

export const Route = createFileRoute("/")({ component: DashboardPage });

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse space-y-6 p-4 sm:p-6">
      <div className="skeleton h-8 w-72" />
      <div className="skeleton h-44 w-full" />
      <div className="skeleton h-20 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-32" />
        ))}
      </div>
      <div className="skeleton h-64 w-full" />
    </main>
  );
}

function DashboardPage() {
  const {
    activeSiteId,
    sites,
    isStationEntered,
    enterStation,
    role,
    isLoading: isAuthLoading,
    isAuthenticating,
    useDemoPersona,
  } = useAuth();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [isTelemetryExpanded, setIsTelemetryExpanded] = useState<boolean>(true);

  const fetchOverview = useCallback(async () => {
    if (!activeSiteId) {
      setIsLoadingData(false);
      return;
    }

    try {
      setError(null);
      const overview = await api.getDashboardOverview(activeSiteId);
      setData(overview);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load telemetry");
    } finally {
      setIsLoadingData(false);
    }
  }, [activeSiteId]);

  useEffect(() => {
    if (activeSiteId) {
      setIsLoadingData(true);
      fetchOverview();
    } else if (!isAuthLoading && !isAuthenticating) {
      setIsLoadingData(false);
    }
  }, [activeSiteId, fetchOverview, isAuthLoading, isAuthenticating]);

  // Reactive SSE update listener
  useSSE({
    siteId: activeSiteId,
    onEvent: () => {
      fetchOverview();
    },
  });

  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!activeSiteId) return;
    setAcknowledgingId(alertId);
    try {
      await api.acknowledgeAlert(activeSiteId, alertId);
      await fetchOverview();
    } catch {
      // ignore
    } finally {
      setAcknowledgingId(null);
    }
  };

  // 1. Loading state while authenticating or bootstrapping
  if ((isAuthLoading || isAuthenticating) && sites.length === 0) {
    return <DashboardSkeleton />;
  }

  // 2. Unauthenticated or empty site state
  if (!activeSiteId && sites.length === 0 && !isLoadingData) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="ops-card mx-auto max-w-md space-y-4 p-8 text-center">
          <div className="font-mono text-sm font-bold tracking-wider text-[var(--brand-primary)] uppercase">
            HYDROGRID OPERATIONS
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            No Active Station Membership
          </h2>
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Connect to the local water station console using the pre-configured
            administrator demo credentials.
          </p>
          <button
            onClick={() => useDemoPersona("ADMIN")}
            className="rounded bg-[var(--brand-primary)] px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-[var(--brand-secondary)]"
          >
            Connect as Administrator Demo
          </button>
        </div>
      </main>
    );
  }

  // 3. ENTRY / STATION SELECTION GATE (Shown when no station is entered yet)
  if (!isStationEntered) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
        <div className="border-b border-[var(--border-subtle)] pb-4">
          <div className="font-mono text-xs font-bold tracking-wider text-[var(--brand-primary)] uppercase">
            HydroGrid Operations Console
          </div>
          <h1 className="mt-0.5 font-mono text-lg font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
            Select Operational Station
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
            Choose an active regional water treatment plant to enter the SCADA
            telemetry and quality supervision console.
          </p>
        </div>

        <div className="space-y-4">
          {sites.map((site) => (
            <div
              key={site.id}
              className="ops-card p-5 transition-all hover:border-[var(--brand-secondary)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        site.status === "ONLINE"
                          ? "bg-[var(--state-safe-text)]"
                          : site.status === "DEGRADED"
                            ? "bg-[var(--state-warn-text)]"
                            : "bg-[var(--state-danger-text)]"
                      }`}
                    />
                    <h2 className="font-mono text-base font-extrabold text-[var(--text-primary)] uppercase">
                      {site.name}
                    </h2>
                  </div>

                  <p className="font-mono text-xs text-[var(--text-muted)]">
                    {site.location ?? "Erode Regional Station, Tamil Nadu"}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs text-[var(--text-secondary)]">
                    <span className="rounded bg-[var(--state-safe-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--state-safe-text)]">
                      STATUS: {site.status}
                    </span>
                    <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px]">
                      TELEMETRY: LIVE
                    </span>
                    <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px]">
                      NODE: 1/1 ONLINE
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => enterStation(site.id)}
                  className="rounded bg-[var(--brand-primary)] px-5 py-2.5 font-mono text-xs font-extrabold tracking-wider text-white shadow-xs transition hover:bg-[var(--brand-secondary)]"
                >
                  [ ENTER STATION ]
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // 4. Loading state for telemetry inside the station
  if (isLoadingData && !data) {
    return <DashboardSkeleton />;
  }

  // 5. Error fallback state
  if (error && !data) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <div className="ops-card mx-auto max-w-md space-y-3 border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] p-6 text-center">
          <h2 className="font-mono text-xs font-bold text-[var(--state-danger-text)] uppercase">
            Telemetry Connection Interrupted
          </h2>
          <p className="font-mono text-xs text-[var(--text-primary)]">
            {error}
          </p>
          <button
            onClick={fetchOverview}
            className="rounded bg-[var(--brand-primary)] px-3.5 py-1.5 font-mono text-xs font-bold text-white"
          >
            Retry Telemetry Sync
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const {
    site,
    safety,
    latestReading,
    purification,
    flow,
    activeAlerts,
    recentEvents,
    devices,
  } = data;

  const isGatePass = safety.qualityGate === "PASS";
  const isReleaseAllowed = safety.waterRelease === "ALLOWED";
  const isLeak = flow.leakStatus === "LEAK_DETECTED";
  const isPumpRunning = purification.pump === "RUNNING";
  const isValveOpen = flow.valveStatus === "OPEN";

  const isSafeSystem = isGatePass && isReleaseAllowed && !isLeak;

  // Contextual assessment points
  const assessmentPoints = isSafeSystem
    ? [
        "All 9 physicochemical water quality parameters within standard operating limits",
        "4-stage physical, chemical, and UV-C treatment units operating normally",
        "Hydraulic differential within permissible 15.0% tolerance (no pipeline leak)",
        "Automated Quality Gate satisfied: Water distribution is ALLOWED",
      ]
    : [
        ...(safety.reasons && safety.reasons.length > 0
          ? safety.reasons
          : ["Quality Gate decision returned FAIL due to threshold violation"]),
        isLeak
          ? `Pipeline mass-balance differential (${flow.mismatchPercent.toFixed(1)}%) exceeded 15.0% trip limit`
          : null,
        !isReleaseAllowed
          ? "Automated shutoff engaged: Water release is BLOCKED"
          : null,
      ].filter((p): p is string => Boolean(p));

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* 1. STATION CONTEXT & STATUS HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                site.status === "ONLINE"
                  ? "bg-[var(--state-safe-text)]"
                  : site.status === "DEGRADED"
                    ? "bg-[var(--state-warn-text)]"
                    : "bg-[var(--state-danger-text)]"
              }`}
            />
            <h1 className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
              {site.name} — Station Overview
            </h1>
          </div>

          <span className="font-mono text-xs text-[var(--border-strong)]">
            |
          </span>

          <span className="font-mono text-xs text-[var(--text-muted)]">
            {site.location ?? "Erode Regional Station, Tamil Nadu"}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-muted)]">
          <span>
            Telemetry Sync:{" "}
            <strong className="text-[var(--text-primary)]">
              {new Date(data.lastUpdated).toLocaleTimeString()}
            </strong>
          </span>
          <Link
            to="/simulator"
            className="rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
          >
            ⚡ Test Scenarios
          </Link>
        </div>
      </div>

      {/* 2. EXECUTIVE DECISION HERO (Answers: "Can this plant safely release water right now?") */}
      <div
        className={`ops-card p-5 transition-colors ${
          isSafeSystem
            ? "border-[var(--state-safe-border)] bg-[var(--state-safe-bg)]"
            : "border-[var(--state-danger-border)] bg-[var(--state-danger-bg)]"
        }`}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* Main Decision Badge & Score */}
          <div className="space-y-2 lg:col-span-6">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xs font-extrabold tracking-wider uppercase ${
                  isSafeSystem
                    ? "text-[var(--state-safe-text)]"
                    : "text-[var(--state-danger-text)]"
                }`}
              >
                {isSafeSystem
                  ? "● SYSTEM STATUS: SAFE TO RELEASE"
                  : "▲ SYSTEM STATUS: SAFETY LOCKOUT ENGAGED"}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="flex items-baseline gap-1">
                <span
                  className={`telemetry-val text-5xl font-black ${
                    safety.score >= 80
                      ? "text-[var(--state-safe-text)]"
                      : safety.score >= 50
                        ? "text-[var(--state-warn-text)]"
                        : "text-[var(--state-danger-text)]"
                  }`}
                >
                  {safety.score}
                </span>
                <span className="font-mono text-sm font-semibold text-[var(--text-muted)]">
                  / 100
                </span>
              </div>

              <div className="space-y-0.5 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">
                    QUALITY GATE:
                  </span>
                  <span
                    className={`py-0.2 rounded px-1.5 text-[11px] font-extrabold ${
                      isGatePass
                        ? "border border-[var(--state-safe-border)] bg-[var(--bg-surface)] text-[var(--state-safe-text)]"
                        : "border border-[var(--state-danger-border)] bg-[var(--bg-surface)] text-[var(--state-danger-text)]"
                    }`}
                  >
                    {safety.qualityGate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">
                    WATER RELEASE:
                  </span>
                  <span
                    className={`py-0.2 rounded px-1.5 text-[11px] font-extrabold ${
                      isReleaseAllowed
                        ? "border border-[var(--state-safe-border)] bg-[var(--bg-surface)] text-[var(--state-safe-text)]"
                        : "border border-[var(--state-danger-border)] bg-[var(--bg-surface)] text-[var(--state-danger-text)]"
                    }`}
                  >
                    {safety.waterRelease}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Actuator & Node State Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4 lg:col-span-6">
            <div className="space-y-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Feed Pump
              </span>
              <span
                className={`font-bold ${
                  isPumpRunning
                    ? "text-[var(--state-safe-text)]"
                    : "font-black text-[var(--state-danger-text)]"
                }`}
              >
                {purification.pump}
              </span>
            </div>

            <div className="space-y-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Isolation Valve
              </span>
              <span
                className={`font-bold ${
                  isValveOpen
                    ? "text-[var(--state-safe-text)]"
                    : "font-black text-[var(--state-danger-text)]"
                }`}
              >
                {flow.valveStatus}
              </span>
            </div>

            <div className="space-y-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Edge Nodes
              </span>
              <span className="font-bold text-[var(--state-safe-text)]">
                {devices.filter((d) => d.status === "ONLINE").length}/
                {devices.length} ONLINE
              </span>
            </div>

            <div className="space-y-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
              <span className="block text-[9px] text-[var(--text-dim)] uppercase">
                Confidence
              </span>
              <span
                className={`telemetry-val font-bold ${
                  safety.confidence >= 85
                    ? "text-[var(--state-safe-text)]"
                    : "text-[var(--state-warn-text)]"
                }`}
              >
                {safety.confidence}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL LIFECYCLE (Physical flow: 1 Intake -> 2 Sensing -> 3 Treatment -> 4 Hydraulics -> 5 Quality Gate -> 6 Release) */}
      <div className="ops-card space-y-3 p-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
            Operational Lifecycle & Verification Flow
          </span>
          <span className="font-mono text-[10px] text-[var(--text-dim)]">
            Continuous SCADA Supervision
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-3 lg:grid-cols-6">
          {/* Step 1 */}
          <div className="space-y-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5">
            <span className="block text-[9px] font-bold text-[var(--text-dim)] uppercase">
              1. Intake
            </span>
            <span className="block font-bold text-[var(--text-primary)]">
              Raw Source
            </span>
            <span className="block font-sans text-[10px] text-[var(--text-muted)]">
              Well extraction
            </span>
          </div>

          {/* Step 2 */}
          <Link
            to="/water-quality"
            className="block space-y-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5 transition hover:border-[var(--brand-secondary)]"
          >
            <span className="block text-[9px] font-bold text-[var(--text-dim)] uppercase">
              2. Sensing
            </span>
            <span
              className={`block font-bold ${
                isGatePass
                  ? "text-[var(--state-safe-text)]"
                  : "text-[var(--state-danger-text)]"
              }`}
            >
              9 Probes {isGatePass ? "●" : "▲"}
            </span>
            <span className="block font-sans text-[10px] text-[var(--text-muted)]">
              Physicochemical
            </span>
          </Link>

          {/* Step 3 */}
          <Link
            to="/purification"
            className="block space-y-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5 transition hover:border-[var(--brand-secondary)]"
          >
            <span className="block text-[9px] font-bold text-[var(--text-dim)] uppercase">
              3. Treatment
            </span>
            <span
              className={`block font-bold ${
                purification.mode === "NORMAL"
                  ? "text-[var(--state-safe-text)]"
                  : "text-[var(--state-warn-text)]"
              }`}
            >
              4 Stages {purification.mode === "NORMAL" ? "●" : "◆"}
            </span>
            <span className="block font-sans text-[10px] text-[var(--text-muted)]">
              Filter train
            </span>
          </Link>

          {/* Step 4 */}
          <Link
            to="/flow"
            className="block space-y-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5 transition hover:border-[var(--brand-secondary)]"
          >
            <span className="block text-[9px] font-bold text-[var(--text-dim)] uppercase">
              4. Hydraulics
            </span>
            <span
              className={`block font-bold ${
                !isLeak
                  ? "text-[var(--state-safe-text)]"
                  : "font-black text-[var(--state-danger-text)]"
              }`}
            >
              Diff: {flow.mismatchPercent.toFixed(1)}% {!isLeak ? "●" : "▲"}
            </span>
            <span className="block font-sans text-[10px] text-[var(--text-muted)]">
              Leak check
            </span>
          </Link>

          {/* Step 5 */}
          <div className="space-y-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5">
            <span className="block text-[9px] font-bold text-[var(--text-dim)] uppercase">
              5. Quality Gate
            </span>
            <span
              className={`block font-bold ${
                isGatePass
                  ? "text-[var(--state-safe-text)]"
                  : "text-[var(--state-danger-text)]"
              }`}
            >
              {safety.qualityGate}
            </span>
            <span className="block font-sans text-[10px] text-[var(--text-muted)]">
              Rule evaluation
            </span>
          </div>

          {/* Step 6 */}
          <div
            className={`space-y-1 rounded border p-2.5 ${
              isReleaseAllowed
                ? "border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                : "border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
            }`}
          >
            <span className="block text-[9px] font-bold uppercase opacity-75">
              6. Release
            </span>
            <span className="block font-bold">{safety.waterRelease}</span>
            <span className="block font-sans text-[10px] opacity-90">
              Distribution valve
            </span>
          </div>
        </div>
      </div>

      {/* 4. CURRENT ASSESSMENT (Answers: "Why is the system safe or unsafe?") */}
      <div className="ops-card space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
            Operational Assessment Summary
          </span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isSafeSystem
                ? "bg-[var(--state-safe-text)]"
                : "bg-[var(--state-danger-text)]"
            }`}
          />
        </div>

        <ul className="space-y-1 font-sans text-xs text-[var(--text-secondary)]">
          {assessmentPoints.map((pt, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 font-mono font-bold text-[var(--text-muted)]">
                {isSafeSystem ? "✓" : "▲"}
              </span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 5. MAJOR SUBSYSTEM HUBS (Clean drill-down entry points) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Water Quality Subsystem */}
        <div className="ops-card flex flex-col justify-between space-y-3 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase">
                Water Quality
              </span>
              <span
                className={`py-0.2 rounded px-1.5 font-mono text-[9px] font-bold ${
                  isGatePass
                    ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                    : "bg-[var(--state-danger-bg)] text-[var(--state-danger-text)]"
                }`}
              >
                {isGatePass ? "SAFE" : "EXCEEDED"}
              </span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-[var(--text-muted)]">
              9 physicochemical parameters monitored in real-time against WHO
              standards.
            </p>
            <div className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
              <span>pH {latestReading.ph.toFixed(2)}</span> ·{" "}
              <span>Turbidity {latestReading.turbidity.toFixed(1)} NTU</span>
            </div>
          </div>

          <Link
            to="/water-quality"
            className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 font-mono text-xs font-bold text-[var(--brand-secondary)] hover:underline"
          >
            <span>Inspect Evidence</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Purification Subsystem */}
        <div className="ops-card flex flex-col justify-between space-y-3 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase">
                Purification
              </span>
              <span
                className={`py-0.2 rounded px-1.5 font-mono text-[9px] font-bold ${
                  purification.mode === "NORMAL"
                    ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                    : "bg-[var(--state-warn-bg)] text-[var(--state-warn-text)]"
                }`}
              >
                {purification.mode}
              </span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-[var(--text-muted)]">
              4 sequential treatment stages with active media lifecycle
              monitoring.
            </p>
            <div className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
              <span>Carbon Bed {purification.filters.carbon.lifePercent}%</span>{" "}
              · <span>Pump {purification.pump}</span>
            </div>
          </div>

          <Link
            to="/purification"
            className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 font-mono text-xs font-bold text-[var(--brand-secondary)] hover:underline"
          >
            <span>Inspect Stages</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Hydraulic Subsystem */}
        <div className="ops-card flex flex-col justify-between space-y-3 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase">
                Hydraulics
              </span>
              <span
                className={`py-0.2 rounded px-1.5 font-mono text-[9px] font-bold ${
                  !isLeak
                    ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                    : "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                }`}
              >
                {flow.leakStatus}
              </span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-[var(--text-muted)]">
              Inlet vs outlet mass-balance differential and automated shutoff
              valve.
            </p>
            <div className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
              <span>Flow {flow.inletFlowRate.toFixed(1)} L/min</span> ·{" "}
              <span>Diff {flow.mismatchPercent.toFixed(1)}%</span>
            </div>
          </div>

          <Link
            to="/flow"
            className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 font-mono text-xs font-bold text-[var(--brand-secondary)] hover:underline"
          >
            <span>Inspect Hydraulics</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* Hardware Fleet Subsystem */}
        <div className="ops-card flex flex-col justify-between space-y-3 p-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase">
                Hardware Nodes
              </span>
              <span className="py-0.2 rounded bg-[var(--state-safe-bg)] px-1.5 font-mono text-[9px] font-bold text-[var(--state-safe-text)]">
                {devices.filter((d) => d.status === "ONLINE").length}/
                {devices.length} ONLINE
              </span>
            </div>
            <p className="font-sans text-xs leading-relaxed text-[var(--text-muted)]">
              Edge microcontroller telemetry fleet, probe health, and
              calibration offsets.
            </p>
            <div className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
              <span>Primary Node Synced</span>
            </div>
          </div>

          <Link
            to="/devices"
            className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 font-mono text-xs font-bold text-[var(--brand-secondary)] hover:underline"
          >
            <span>Inspect Nodes</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* 6. DETAILED SENSOR TELEMETRY (Structured registry with progressive disclosure) */}
      <div className="ops-card space-y-3 p-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
          <div>
            <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
              Detailed Sensor Readings & Physicochemical Channels (9 Probes)
            </h3>
            <p className="font-mono text-[11px] text-[var(--text-muted)]">
              Live calibrated readings ingested from edge microcontroller node
            </p>
          </div>

          <button
            onClick={() => setIsTelemetryExpanded(!isTelemetryExpanded)}
            className="font-mono text-xs font-semibold text-[var(--brand-secondary)] hover:underline"
          >
            {isTelemetryExpanded ? "[Collapse Readings]" : "[Expand Readings]"}
          </button>
        </div>

        {isTelemetryExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[10px] text-[var(--text-dim)] uppercase">
                <tr>
                  <th className="px-3 py-2 font-bold">Parameter Channel</th>
                  <th className="px-3 py-2 font-bold">Current Reading</th>
                  <th className="px-3 py-2 font-bold">Safe Standard Limit</th>
                  <th className="px-3 py-2 font-bold">Operating Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {/* pH */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    pH Acidity
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.ph.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    6.50 – 8.50
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                        latestReading.ph >= 6.5 && latestReading.ph <= 8.5
                          ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                          : "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                      }`}
                    >
                      {latestReading.ph >= 6.5 && latestReading.ph <= 8.5
                        ? "NORMAL"
                        : "OUT_OF_RANGE"}
                    </span>
                  </td>
                </tr>

                {/* Turbidity */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Turbidity
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.turbidity.toFixed(1)} NTU
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    Max 5.0 NTU
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                        latestReading.turbidity <= 5.0
                          ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                          : "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                      }`}
                    >
                      {latestReading.turbidity <= 5.0 ? "NORMAL" : "EXCEEDED"}
                    </span>
                  </td>
                </tr>

                {/* Heavy Metals */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Heavy Metals
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.heavyMetals.toFixed(2)} ppm
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    Max 0.10 ppm
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                        latestReading.heavyMetals <= 0.1
                          ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                          : "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                      }`}
                    >
                      {latestReading.heavyMetals <= 0.1 ? "NORMAL" : "CRITICAL"}
                    </span>
                  </td>
                </tr>

                {/* TDS */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Total Dissolved Solids (TDS)
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.tds.toFixed(0)} ppm
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    Max 500 ppm
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                        latestReading.tds <= 500
                          ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                          : "bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
                      }`}
                    >
                      {latestReading.tds <= 500 ? "NORMAL" : "EXCEEDED"}
                    </span>
                  </td>
                </tr>

                {/* Dissolved Oxygen */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Dissolved Oxygen
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.dissolvedOxygen.toFixed(1)} mg/L
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    &gt; 6.5 mg/L
                  </td>
                  <td className="px-3 py-2">
                    <span className="py-0.2 rounded bg-[var(--state-safe-bg)] px-1.5 text-[10px] font-bold text-[var(--state-safe-text)]">
                      NORMAL
                    </span>
                  </td>
                </tr>

                {/* Electrical Conductivity */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Electrical Conductivity
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.electricalConductivity.toFixed(0)} µS/cm
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    Observational
                  </td>
                  <td className="px-3 py-2">
                    <span className="py-0.2 rounded bg-[var(--state-safe-bg)] px-1.5 text-[10px] font-bold text-[var(--state-safe-text)]">
                      NORMAL
                    </span>
                  </td>
                </tr>

                {/* Hardness */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Total Hardness
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.hardness.toFixed(0)} mg/L
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    Max 300 mg/L
                  </td>
                  <td className="px-3 py-2">
                    <span className="py-0.2 rounded bg-[var(--state-safe-bg)] px-1.5 text-[10px] font-bold text-[var(--state-safe-text)]">
                      NORMAL
                    </span>
                  </td>
                </tr>

                {/* Temperature */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Water Temperature
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.temperature.toFixed(1)} °C
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    15.0 – 35.0 °C
                  </td>
                  <td className="px-3 py-2">
                    <span className="py-0.2 rounded bg-[var(--state-safe-bg)] px-1.5 text-[10px] font-bold text-[var(--state-safe-text)]">
                      NORMAL
                    </span>
                  </td>
                </tr>

                {/* Flow Rate */}
                <tr className="hover:bg-[var(--bg-subtle)]">
                  <td className="px-3 py-2 font-bold text-[var(--text-primary)]">
                    Intake Discharge Flow
                  </td>
                  <td className="telemetry-val px-3 py-2 font-bold">
                    {latestReading.flowRate.toFixed(1)} L/min
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    Rated 45.0 L/min
                  </td>
                  <td className="px-3 py-2">
                    <span className="py-0.2 rounded bg-[var(--state-safe-bg)] px-1.5 text-[10px] font-bold text-[var(--state-safe-text)]">
                      NORMAL
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7. ALARMS & INCIDENT STREAM */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Active Alarms */}
        <div className="ops-card space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <span className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
              Active Alarms Queue ({activeAlerts.length})
            </span>
            <Link
              to="/alerts"
              className="font-mono text-xs font-semibold text-[var(--brand-secondary)] hover:underline"
            >
              All Alerts &rarr;
            </Link>
          </div>

          {activeAlerts.length === 0 ? (
            <div className="py-6 text-center font-mono text-xs text-[var(--text-muted)]">
              ● All operating parameters within safe tolerance limits.
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start justify-between gap-3 rounded border p-2.5 font-mono text-xs ${
                    alert.severity === "CRITICAL"
                      ? "border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] text-[var(--state-danger-text)]"
                      : "border-[var(--state-warn-border)] bg-[var(--state-warn-bg)] text-[var(--state-warn-text)]"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase">
                        [{alert.severity}] {alert.type}
                      </span>
                    </div>
                    <p className="m-0 font-sans text-xs text-[var(--text-primary)]">
                      {alert.message}
                    </p>
                    <span className="text-[10px] opacity-75">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  {alert.status === "UNREAD" && (
                    <button
                      disabled={
                        role === "VIEWER" || acknowledgingId === alert.id
                      }
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="shrink-0 rounded bg-[var(--brand-primary)] px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-50"
                    >
                      {acknowledgingId === alert.id ? "Saving..." : "ACK"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational Audit Log */}
        <div className="ops-card space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <span className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
              Operational Event Audit Stream
            </span>
            <Link
              to="/alerts"
              className="font-mono text-xs font-semibold text-[var(--brand-secondary)] hover:underline"
            >
              Full Log &rarr;
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <div className="py-6 text-center font-mono text-xs text-[var(--text-muted)]">
              No recent events logged.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] font-mono text-xs">
              {recentEvents.slice(0, 5).map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        evt.severity === "CRITICAL"
                          ? "bg-[var(--state-danger-text)]"
                          : evt.severity === "WARNING"
                            ? "bg-[var(--state-warn-text)]"
                            : "bg-[var(--state-safe-text)]"
                      }`}
                    />
                    <span className="font-bold text-[var(--text-primary)]">
                      {evt.type}:
                    </span>
                    <span className="truncate font-sans text-[var(--text-muted)]">
                      {evt.message}
                    </span>
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--text-dim)]">
                    {new Date(evt.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
