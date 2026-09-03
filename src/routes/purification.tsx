import {
  IconAlertTriangle,
  IconCheck,
  IconDroplet,
  IconFilter,
  IconFlask,
  IconInfoCircle,
  IconLoader2,
  IconSun,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { PurificationEfficiencyChart } from "../components/charts/PurificationEfficiencyChart";
import { PurificationTrajectoryChart } from "../components/charts/PurificationTrajectoryChart";
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
      icon: IconFilter,
      tech: "5-Micron Spun Polypropylene Matrix",
      action: "Mechanical Micro-Filtration",
      desc: "Captures physical particulate matter, rust particles, sand, and suspended silt down to 5 microns, protecting downstream carbon media beds from mechanical fouling.",
      spec: "Pore Rating: 5 µm | Max Flow: 60 L/min | Differential Pressure: 0.12 bar",
    },
    {
      key: "carbon" as const,
      step: 2,
      name: "Activated Carbon Bed",
      icon: IconDroplet,
      tech: "High-Porosity Granular Activated Carbon (GAC)",
      action: "Chemical Adsorption",
      desc: "Adsorbs heavy metals (Lead, Cadmium, Arsenic), free chlorine, volatile organic compounds (VOCs), and agricultural pesticides via surface micropore electrostatic attraction.",
      spec: "Media: Acid-Washed Coconut Shell | Iodine No: 1100 mg/g | Contact Time: 4.2 min",
    },
    {
      key: "calcite" as const,
      step: 3,
      name: "Calcite Remineralizer",
      icon: IconFlask,
      tech: "High-Purity Calcium Carbonate Media",
      action: "Alkaline pH Stabilization",
      desc: "Neutralizes acidic inflow, buffers alkalinity, and introduces essential natural calcium and magnesium electrolytes to balance potable taste and prevent pipe corrosion.",
      spec: "Media: Natural Calcite CaCO₃ | Target pH: 7.20 – 7.80 | Dissolution Rate: Self-Limiting",
    },
    {
      key: "uv" as const,
      step: 4,
      name: "UV-C Disinfection Reactor",
      icon: IconSun,
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
    <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Title Bar */}
      <div className="border-border/80 flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
        <div>
          <h1 className="font-display text-foreground text-lg font-extrabold tracking-tight">
            Sequential Water Treatment Pipeline
          </h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Physical separation, chemical adsorption, remineralization, and
            germicidal disinfection stages
          </p>
        </div>

        {status && (
          <div className="flex items-center gap-2">
            <Badge
              variant={status.pump === "RUNNING" ? "default" : "destructive"}
              className={`font-semibold ${
                status.pump === "RUNNING"
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : ""
              }`}
            >
              Feed Pump: {status.pump}
            </Badge>
            <Badge variant="outline" className="font-semibold">
              Mode: {status.mode}
            </Badge>
          </div>
        )}
      </div>

      {isLoading && !status ? (
        <div className="text-muted-foreground flex h-56 items-center justify-center gap-2 text-xs">
          <IconLoader2 className="size-5 animate-spin text-[var(--brand-secondary)]" />
          <span>Querying purification stage controllers...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Treatment Stage Sequence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                Treatment Stage Flow (Select to inspect)
              </h2>
              <span className="text-muted-foreground text-xs">
                4 Sequential Processes
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stagesMeta.map((s) => {
                const stageHealth = status?.stages[s.key] ?? "HEALTHY";
                const filterLife = status?.filters[s.key]?.lifePercent ?? 85;
                const isWarning = filterLife < 25;
                const isSelected = activeStageKey === s.key;
                const Icon = s.icon;

                return (
                  <Card
                    key={s.key}
                    onClick={() => setActiveStageKey(s.key)}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "bg-card border-[var(--brand-primary)] shadow-md ring-2 ring-[var(--brand-primary)]/20"
                        : "hover:border-border hover:bg-muted/40 shadow-2xs"
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex size-7 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-[var(--brand-primary)] text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <span className="text-muted-foreground text-[11px] font-bold uppercase">
                            Stage 0{s.step}
                          </span>
                        </div>
                        <Badge
                          variant={
                            stageHealth === "HEALTHY" ||
                            stageHealth === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            stageHealth === "HEALTHY" ||
                            stageHealth === "ACTIVE"
                              ? "border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-800 dark:text-emerald-300"
                              : "text-[10px]"
                          }
                        >
                          {stageHealth}
                        </Badge>
                      </div>

                      <CardTitle className="text-foreground pt-2 text-sm font-bold">
                        {s.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {s.action}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Media Life:
                          </span>
                          <span
                            className={`telemetry-val font-bold ${
                              isWarning ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {filterLife}%
                          </span>
                        </div>
                        <Progress
                          value={filterLife}
                          className={`h-2 ${
                            isWarning
                              ? "[&>div]:bg-rose-500"
                              : "[&>div]:bg-[var(--brand-secondary)]"
                          }`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 2. Selected Stage Detail */}
          <Card className="shadow-2xs">
            <CardHeader className="p-6 pb-3">
              <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <Badge className="bg-[var(--brand-primary)] text-xs font-bold text-white">
                    Stage 0{activeStage.step}
                  </Badge>
                  <CardTitle className="text-foreground text-base font-bold">
                    {activeStage.name}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    Operating Status:
                  </span>
                  <Badge
                    variant={
                      activeStageHealth === "HEALTHY" ||
                      activeStageHealth === "ACTIVE"
                        ? "default"
                        : "secondary"
                    }
                    className={
                      activeStageHealth === "HEALTHY" ||
                      activeStageHealth === "ACTIVE"
                        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                        : ""
                    }
                  >
                    {activeStageHealth}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
                <div className="space-y-3 lg:col-span-8">
                  <div>
                    <span className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                      Technology & Mechanism
                    </span>
                    <h3 className="mt-0.5 text-sm font-bold text-[var(--brand-secondary)]">
                      {activeStage.tech}
                    </h3>
                  </div>

                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {activeStage.desc}
                  </p>

                  <div className="border-border/80 bg-muted/40 text-muted-foreground rounded-xl border p-3 text-xs">
                    <span className="text-foreground mb-1 block text-[11px] font-bold uppercase">
                      Engineering Specifications:
                    </span>
                    <span>{activeStage.spec}</span>
                  </div>
                </div>

                {/* Media Lifecycle Gauge */}
                <Card className="border-border/80 bg-muted/30 shadow-2xs lg:col-span-4">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-foreground text-xs font-bold uppercase">
                      Media Capacity Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground text-xs">
                        Remaining Life:
                      </span>
                      <span className="telemetry-val text-foreground text-3xl font-black">
                        {activeFilterInfo.lifePercent}%
                      </span>
                    </div>

                    <Progress
                      value={activeFilterInfo.lifePercent}
                      className={`h-2.5 ${
                        activeFilterInfo.lifePercent < 25
                          ? "[&>div]:bg-rose-500"
                          : "[&>div]:bg-[var(--brand-secondary)]"
                      }`}
                    />

                    <div className="flex items-center gap-1.5 text-xs">
                      {activeFilterInfo.lifePercent < 25 ? (
                        <>
                          <IconAlertTriangle className="size-4 shrink-0 text-rose-500" />
                          <span className="font-medium text-rose-600 dark:text-rose-400">
                            Media capacity low. Schedule maintenance overhaul.
                          </span>
                        </>
                      ) : (
                        <>
                          <IconCheck className="size-4 shrink-0 text-emerald-500" />
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            Media adsorption capacity optimal.
                          </span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* 2.5 Multi-Barrier Efficiency & Media Degradation Analytics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PurificationEfficiencyChart
              status={status}
              className="h-full shadow-2xs"
            />
            <PurificationTrajectoryChart
              status={status}
              className="h-full shadow-2xs"
            />
          </div>

          {/* 3. Automated Interlock Bulletin */}
          <Alert className="border-border/80 bg-muted/30 shadow-2xs">
            <IconInfoCircle className="size-4 text-[var(--brand-secondary)]" />
            <AlertTitle className="text-xs font-bold uppercase">
              Automated Purification Interlock Architecture
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-1 text-xs leading-relaxed">
              The primary intake feed pump is automatically interlocked with the
              Quality Gate and leak detection engine. If water quality
              parameters fail safe thresholds or an emergency pipe breach is
              signaled, the pump immediately shuts down to isolate contaminated
              fluid.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </main>
  );
}
