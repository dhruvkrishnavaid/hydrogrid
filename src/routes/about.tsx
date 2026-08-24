import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="border-b border-[var(--border-subtle)] pb-3">
        <h1 className="font-mono text-base font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
          About HydroGrid System Architecture
        </h1>
        <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
          Edge-first intelligent water quality monitoring and automated
          purification control platform
        </p>
      </div>

      <div className="space-y-4 font-mono text-xs">
        <div className="ops-panel space-y-2 p-5">
          <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase">
            End-to-End Operational Lifecycle
          </h2>
          <p className="font-sans text-xs leading-relaxed text-[var(--text-muted)]">
            HydroGrid is an industrial water safety operating system designed
            for rural and semi-urban water distribution networks. It performs
            real-time physicochemical monitoring across 9 sensor probes,
            evaluates continuous deterministic Quality Gate algorithms,
            supervises a 4-stage treatment train (Sediment &rarr; Carbon &rarr;
            Calcite &rarr; UV-C), and detects distribution pipeline leaks via
            continuous mass-balance differential flow calculations ($|Q_1 - Q_2|
            / Q_1$).
          </p>
        </div>

        <div className="ops-panel space-y-3 p-5">
          <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase">
            Core Technology Stack
          </h2>
          <ul className="list-inside list-disc space-y-1.5 font-sans text-xs text-[var(--text-muted)]">
            <li>
              <strong className="font-mono text-[var(--text-primary)]">
                Frontend:
              </strong>{" "}
              React 19, TanStack Start, TanStack Router, Tailwind CSS.
            </li>
            <li>
              <strong className="font-mono text-[var(--text-primary)]">
                Backend Engine:
              </strong>{" "}
              TanStack Start Server Handlers, Nitro Runtime, Bun runtime.
            </li>
            <li>
              <strong className="font-mono text-[var(--text-primary)]">
                Database:
              </strong>{" "}
              Supabase PostgreSQL with Row Level Security & 3-tier RBAC (ADMIN
              &gt; OPERATOR &gt; VIEWER).
            </li>
            <li>
              <strong className="font-mono text-[var(--text-primary)]">
                Time-Series Engine:
              </strong>{" "}
              InfluxDB 2.x with continuous Flux aggregation.
            </li>
            <li>
              <strong className="font-mono text-[var(--text-primary)]">
                Realtime Telemetry:
              </strong>{" "}
              Server-Sent Events (SSE) via Web ReadableStreams.
            </li>
            <li>
              <strong className="font-mono text-[var(--text-primary)]">
                Safety Engine:
              </strong>{" "}
              Deterministic evaluation rules with multi-parameter penalties and
              sensor-drift awareness.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
