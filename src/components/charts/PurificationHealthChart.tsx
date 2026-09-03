import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PurificationStatus } from "@/lib/types";

interface PurificationHealthChartProps {
  purification?: PurificationStatus;
  className?: string;
}

export function PurificationHealthChart({
  purification,
  className,
}: PurificationHealthChartProps) {
  const stages = [
    {
      id: "stage-1",
      name: "1. Pre-Filtration (Sediment 5µm)",
      target: "Coal dust, suspended solids & optical turbidity",
      color: "#06b6d4", // Electric Cyan
      health: purification?.stages[0]?.healthPercent ?? 94,
      status: purification?.stages[0]?.status ?? "HEALTHY",
      metricLabel: "Turbidity Rejection",
      metricValue: "98.4%",
    },
    {
      id: "stage-2",
      name: "2. Chemical Adsorption (Activated Carbon)",
      target: "Mining organic chemicals, chlorine & heavy odor",
      color: "#f59e0b", // Radiant Gold
      health: purification?.stages[1]?.healthPercent ?? 89,
      status: purification?.stages[1]?.status ?? "HEALTHY",
      metricLabel: "Adsorption Capacity",
      metricValue: "91.2%",
    },
    {
      id: "stage-3",
      name: "3. AMD Neutralizer (Calcite/Dolomite)",
      target: "Acid Mine Drainage pH balancing & alkaline remineralization",
      color: "#10b981", // Bright Emerald
      health: purification?.stages[2]?.healthPercent ?? 92,
      status: purification?.stages[2]?.status ?? "HEALTHY",
      metricLabel: "Neutralization Buffer",
      metricValue: "+1.8 pH",
    },
    {
      id: "stage-4",
      name: "4. UV-C Disinfection Chamber (254nm)",
      target:
        "Complete pathogen eradication & waterborne microbial elimination",
      color: "#8b5cf6", // Vivid Violet
      health: purification?.stages[3]?.healthPercent ?? 97,
      status: purification?.stages[3]?.status ?? "HEALTHY",
      metricLabel: "UV-C Intensity",
      metricValue: "99.9%",
    },
  ];

  const pumpRunning = (purification?.pumpStatus ?? "RUNNING") === "RUNNING";

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              <CardTitle className="text-foreground text-sm font-bold">
                4-Stage Multi-Barrier Purification Performance
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Continuous monitoring of media saturation, AMD neutralization
              buffer, and UV lamp life
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                pumpRunning
                  ? "border-emerald-500/40 bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 font-semibold text-amber-700 dark:text-amber-400"
              }
            >
              Feed Pump: {pumpRunning ? "● RUNNING" : "⏸ STANDBY"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 p-4 pt-2 sm:p-5 sm:pt-2">
        {stages.map((stage) => {
          const isWarning = stage.health < 40;
          const isCritical = stage.health < 15;

          return (
            <div
              key={stage.id}
              className="border-border/70 bg-card/60 hover:bg-muted/30 rounded-xl border p-3 shadow-2xs transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-foreground font-bold">
                    {stage.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[11px]">
                    {stage.metricLabel}:
                  </span>
                  <span className="text-foreground text-xs font-extrabold">
                    {stage.metricValue}
                  </span>
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] font-bold"
                    style={{
                      borderColor: `${stage.color}60`,
                      color: stage.color,
                      backgroundColor: `${stage.color}15`,
                    }}
                  >
                    {stage.health}% Life
                  </Badge>
                </div>
              </div>

              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                {stage.target}
              </p>

              {/* Media Life Progress Bar */}
              <div className="mt-2.5">
                <Progress
                  value={stage.health}
                  className="h-2.5 w-full"
                  indicatorClassName={
                    isCritical
                      ? "bg-red-500"
                      : isWarning
                        ? "bg-amber-500"
                        : stage.id === "stage-1"
                          ? "bg-cyan-500"
                          : stage.id === "stage-2"
                            ? "bg-amber-500"
                            : stage.id === "stage-3"
                              ? "bg-emerald-500"
                              : "bg-violet-500"
                  }
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
