import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { NoStationSelected } from "../components/NoStationSelected";
import { api } from "../lib/api-client";
import { useAuth } from "../lib/auth-context";
import type { PurificationStatus } from "../lib/types";

export const Route = createFileRoute("/purification")({
  component: PurificationPage,
});

function PurificationPage() {
  const {
    activeSiteId,
    isStationEntered,
    isLoading: isAuthLoading,
  } = useAuth();
  const [status, setStatus] = useState<PurificationStatus | null>(null);
  const [activeStageKey, setActiveStageKey] = useState<
    "sediment" | "carbon" | "calcite" | "uv"
  >("carbon");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!activeSiteId || !isStationEntered) {
      if (!isAuthLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    api
      .getPurificationStatus(activeSiteId)
      .then(setStatus)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [activeSiteId, isAuthLoading, isStationEntered]);

  if (!isStationEntered || !activeSiteId) {
    return <NoStationSelected title="Purification Pipeline" />;
  }

  const stagesMeta = [
    {
      key: "sediment" as const,
      step: 1,
      name: "Sediment Pre-Filter",
      tech: "5-Micron Spun Polypropylene Matrix",
      action: "Mechanical Micro-Filtration",
      desc: "Captures physical particulate matter, rust particles, sand, and suspended silt down to 5 microns, protecting downstream carbon media beds from mechanical fouling.",
      spec: "Pore Rating: 5 µm | Max Flow: 60 L/min | Differential Pressure: 0.12 bar",
    },
    {
      key: "carbon" as const,
      step: 2,
      name: "Activated Carbon Bed",
      tech: "High-Porosity Granular Activated Carbon (GAC)",
      action: "Chemical Adsorption",
      desc: "Adsorbs heavy metals (Lead, Cadmium, Arsenic), free chlorine, volatile organic compounds (VOCs), and agricultural pesticides via surface micropore electrostatic attraction.",
      spec: "Media: Acid-Washed Coconut Shell | Iodine No: 1100 mg/g | Contact Time: 4.2 min",
    },
    {
      key: "calcite" as const,
      step: 3,
      name: "Calcite Remineralizer",
      tech: "High-Purity Calcium Carbonate Media",
      action: "Alkaline pH Stabilization",
      desc: "Neutralizes acidic inflow, buffers alkalinity, and introduces essential natural calcium and magnesium electrolytes to balance potable taste and prevent pipe corrosion.",
      spec: "Media: Natural Calcite CaCO₃ | Target pH: 7.20 – 7.80 | Dissolution Rate: Self-Limiting",
    },
    {
      key: "uv" as const,
      step: 4,
      name: "UV-C Disinfection Reactor",
      tech: "254nm High-Intensity Low-Pressure UV-C Lamp",
      action: "Germicidal Sterilization",
      desc: "Disrupts the DNA/RNA cellular structures of bacteria, viruses, and protozoan cysts (Giardia/Cryptosporidium) providing 99.99% disinfection without chemical chlorination by-products.",
      spec: "Wavelength: 253.7 nm | Dosage: > 40 mJ/cm² | Reactor Chamber: 316L Stainless Steel",
    },
  ];

  const activeStage = stagesMeta.find((s) => s.key === activeStageKey)!;
  const activeFilterInfo = status?.filters[activeStage.key] ?? {
    status: "HEALTHY",
    lifePercent: 85,
  };
  const activeStageHealth = status?.stages[activeStage.key] ?? "HEALTHY";

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h1 className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
            Sequential Water Treatment Pipeline
          </h1>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
            Physical separation, chemical adsorption, remineralization, and
            germicidal disinfection stages
          </p>
        </div>

        {status && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span
              className={`rounded border px-2 py-0.5 font-bold ${
                status.pump === "RUNNING"
                  ? "border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                  : "border-[var(--state-danger-border)] bg-[var(--state-danger-bg)] font-black text-[var(--state-danger-text)]"
              }`}
            >
              FEED PUMP: {status.pump}
            </span>
            <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-bold text-[var(--text-primary)]">
              MODE: {status.mode}
            </span>
          </div>
        )}
      </div>

      {isLoading && !status ? (
        <div className="flex h-56 items-center justify-center font-mono text-xs text-[var(--text-muted)]">
          <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--brand-secondary)] border-t-transparent" />
          Querying purification stage controllers...
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. PHYSICAL TREATMENT JOURNEY (Interactive Timeline) */}
          <div className="ops-card space-y-3 p-4">
            <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
              Treatment Stage Sequence (Click to inspect stage)
            </h3>

            <div className="grid grid-cols-1 gap-2 font-mono text-xs sm:grid-cols-2 lg:grid-cols-4">
              {stagesMeta.map((s) => {
                const stageHealth = status?.stages[s.key] ?? "HEALTHY";
                const filterLife = status?.filters[s.key]?.lifePercent ?? 85;
                const isWarning = filterLife < 25;
                const isSelected = activeStageKey === s.key;

                return (
                  <button
                    key={s.key}
                    onClick={() => setActiveStageKey(s.key)}
                    className={`cursor-pointer space-y-2 rounded border p-3 text-left transition ${
                      isSelected
                        ? "border-[var(--brand-primary)] bg-[var(--bg-surface)] shadow-xs ring-1 ring-[var(--brand-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">
                        Stage 0{s.step}
                      </span>
                      <span
                        className={`py-0.2 rounded px-1.5 text-[9px] font-bold ${
                          stageHealth === "HEALTHY" || stageHealth === "ACTIVE"
                            ? "bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                            : "bg-[var(--state-warn-bg)] text-[var(--state-warn-text)]"
                        }`}
                      >
                        {stageHealth}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-[var(--text-primary)]">
                        {s.name}
                      </h4>
                      <span className="block font-sans text-[10px] text-[var(--text-muted)]">
                        {s.action}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[var(--text-dim)]">
                          Media Life:
                        </span>
                        <span
                          className={`telemetry-val font-bold ${
                            isWarning
                              ? "text-[var(--state-danger-text)]"
                              : "text-[var(--state-safe-text)]"
                          }`}
                        >
                          {filterLife}%
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded bg-[var(--bg-subtle)]">
                        <div
                          className={`h-full ${
                            isWarning
                              ? "bg-[var(--state-danger-text)]"
                              : "bg-[var(--brand-secondary)]"
                          }`}
                          style={{ width: `${filterLife}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. STAGE TECHNICAL DEEP DIVE (Selected Stage Detail) */}
          <div className="ops-card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[var(--brand-primary)] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                  STAGE 0{activeStage.step}
                </span>
                <h2 className="font-mono text-base font-extrabold text-[var(--text-primary)] uppercase">
                  {activeStage.name}
                </h2>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[var(--text-dim)]">
                  Operating Status:
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-bold ${
                    activeStageHealth === "HEALTHY" ||
                    activeStageHealth === "ACTIVE"
                      ? "border border-[var(--state-safe-border)] bg-[var(--state-safe-bg)] text-[var(--state-safe-text)]"
                      : "border border-[var(--state-warn-border)] bg-[var(--state-warn-bg)] text-[var(--state-warn-text)]"
                  }`}
                >
                  {activeStageHealth}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
              <div className="space-y-3 lg:col-span-8">
                <div>
                  <span className="block font-mono text-[10px] font-bold text-[var(--text-dim)] uppercase">
                    Technology & Mechanism
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--brand-secondary)]">
                    {activeStage.tech}
                  </span>
                </div>

                <p className="font-sans text-xs leading-relaxed text-[var(--text-secondary)]">
                  {activeStage.desc}
                </p>

                <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-2.5 font-mono text-xs text-[var(--text-muted)]">
                  <span className="mb-0.5 block text-[9px] font-bold text-[var(--text-dim)] uppercase">
                    Engineering Parameters:
                  </span>
                  {activeStage.spec}
                </div>
              </div>

              <div className="space-y-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] p-4 font-mono text-xs lg:col-span-4">
                <span className="block font-bold text-[var(--text-primary)] uppercase">
                  Media Lifecycle Status
                </span>

                <div className="flex items-baseline justify-between">
                  <span className="text-[var(--text-muted)]">
                    Remaining Media Life:
                  </span>
                  <span className="telemetry-val text-2xl font-black text-[var(--text-primary)]">
                    {activeFilterInfo.lifePercent}%
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded bg-[var(--bg-subtle)]">
                  <div
                    className={`h-full ${
                      activeFilterInfo.lifePercent < 25
                        ? "bg-[var(--state-danger-text)]"
                        : "bg-[var(--brand-secondary)]"
                    }`}
                    style={{ width: `${activeFilterInfo.lifePercent}%` }}
                  />
                </div>

                <span className="block text-[11px] text-[var(--text-dim)]">
                  {activeFilterInfo.lifePercent < 25
                    ? "▲ Media capacity degraded. Schedule filter replacement."
                    : "● Media adsorption capacity optimal."}
                </span>
              </div>
            </div>
          </div>

          {/* 3. INTERLOCK & PUMP CUTOFF CONTROLLER */}
          <div className="ops-card space-y-2 p-4">
            <h3 className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
              Automated Purification Interlock Controller
            </h3>
            <p className="font-sans text-xs leading-relaxed text-[var(--text-muted)]">
              The primary intake feed pump is automatically linked to the
              Quality Gate and leak detection engine. If water quality fails or
              an emergency cutoff condition is triggered, the feed pump
              immediately halts to isolate contaminated inflows.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
