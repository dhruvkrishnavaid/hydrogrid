import { IconDroplet, IconLayersSubtract } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="border-border/80 border-b pb-3.5">
        <h1 className="font-display text-foreground text-lg font-extrabold tracking-tight">
          About HydroGrid System Architecture
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Edge-first intelligent water quality monitoring and automated
          purification control platform
        </p>
      </div>

      <div className="space-y-6">
        <Card className="shadow-2xs">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center gap-2">
              <IconDroplet className="size-4 text-[var(--brand-secondary)]" />
              <CardTitle className="text-foreground text-sm font-bold">
                End-to-End Operational Lifecycle
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-1">
            <p className="text-muted-foreground text-xs leading-relaxed">
              HydroGrid is an industrial water safety operating system designed
              for rural and semi-urban water distribution networks. It performs
              real-time physicochemical monitoring across 9 sensor probes,
              evaluates continuous deterministic Quality Gate algorithms,
              supervises a 4-stage treatment train (Sediment → Carbon → Calcite
              → UV-C), and detects distribution pipeline leaks via continuous
              mass-balance differential flow calculations (|Q₁ - Q₂| / Q₁).
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconLayersSubtract className="size-4 text-[var(--brand-secondary)]" />
                <CardTitle className="text-foreground text-sm font-bold">
                  Core Technology Stack
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                PS 26040 Reference Implementation
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 pt-1">
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div className="border-border/70 bg-muted/20 space-y-1 rounded-xl border p-3">
                <span className="text-foreground font-bold">
                  Frontend Experience
                </span>
                <p className="text-muted-foreground">
                  React 19, TanStack Start, TanStack Router, Tailwind CSS v4,
                  shadcn/ui primitives.
                </p>
              </div>

              <div className="border-border/70 bg-muted/20 space-y-1 rounded-xl border p-3">
                <span className="text-foreground font-bold">
                  Backend Server Engine
                </span>
                <p className="text-muted-foreground">
                  TanStack Start API file routes, Nitro Runtime, Bun
                  high-performance runtime.
                </p>
              </div>

              <div className="border-border/70 bg-muted/20 space-y-1 rounded-xl border p-3">
                <span className="text-foreground font-bold">
                  Relational Database & ORM
                </span>
                <p className="text-muted-foreground">
                  PostgreSQL with Prisma ORM & 3-tier RBAC (ADMIN &gt; OPERATOR
                  &gt; VIEWER).
                </p>
              </div>

              <div className="border-border/70 bg-muted/20 space-y-1 rounded-xl border p-3">
                <span className="text-foreground font-bold">
                  Time-Series Telemetry
                </span>
                <p className="text-muted-foreground">
                  InfluxDB 2.x continuous telemetry aggregation and real-time
                  query engine.
                </p>
              </div>

              <div className="border-border/70 bg-muted/20 space-y-1 rounded-xl border p-3">
                <span className="text-foreground font-bold">
                  Real-Time Event Streaming
                </span>
                <p className="text-muted-foreground">
                  Server-Sent Events (SSE) via Web ReadableStreams for
                  zero-latency operator feedback.
                </p>
              </div>

              <div className="border-border/70 bg-muted/20 space-y-1 rounded-xl border p-3">
                <span className="text-foreground font-bold">
                  Deterministic Safety Engine
                </span>
                <p className="text-muted-foreground">
                  Rule-based Quality Gate lockouts, continuous health penalties,
                  and automated valve isolation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
