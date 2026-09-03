# HydroGrid AI Agent Directives (AGENTS.md)

## 1. Project Context & Identity

- **Project Name:** HydroGrid
- **System Nature:** Standalone system engineered to **REPLACE traditional SCADA**, consisting of offline decision-making capable edge nodes for rural and mining-affected areas.
- **Problem Statement:** PS 26040 (Smart Water Purification and Quality Monitoring System for Rural and Mining-Affected Areas - Government of Jharkhand)
- **Core Stack:** TanStack Start, React, Vite, TypeScript, Tailwind CSS
- **Package Manager/Runtime:** Bun
- **UI Library:** shadcn/ui
- **Architecture:** Full-stack TanStack Start single-server application
- **Backend API:** TanStack Start API routes under `src/routes/api/`
- **Authentication:** Supabase Auth
- **Relational Database:** PostgreSQL via Supabase
- **Time-Series Database:** InfluxDB

The system operates autonomously at the edge (Quality Gatekeeper with automated 12V solenoid shutoff valve, 15% differential flow leak detection, 4-stage purification with Calcite/Dolomite AMD neutralization, and local SQLite offline buffering).

The physical ESP32/Raspberry Pi hardware is NOT implemented in this repository; a backend simulator acts as the hardware/data source for the software demonstration.

---

## 2. Documentation Is the Source of Truth

Before implementing or modifying backend functionality, read:

1. `docs/backend-mvp.md`
2. `docs/backend-detailed.md`
3. `docs/frontend-integration.md`

These documents define the finalized HydroGrid MVP contract.

### Documentation hierarchy

`docs/backend-mvp.md`

- Defines the frozen MVP scope
- Defines required features
- Defines demo workflow
- Defines demo scenarios
- Defines what is explicitly out of scope

`docs/backend-detailed.md`

- Defines detailed backend architecture
- Defines backend implementation requirements
- Defines domain behavior
- Defines API/data contracts

`docs/frontend-integration.md`

- Defines what the frontend expects from the backend
- Defines API integration requirements
- Defines frontend-facing data contracts

If documentation conflicts with existing implementation code, the documentation defines the intended system.

Do not silently invent or change:

- API routes
- Water-quality parameters
- Quality Gate rules
- Safety Score rules
- Event types
- Alert types
- Simulator behavior
- Database responsibilities

If a requirement is ambiguous or conflicting, stop and report the conflict before making an architectural decision.

---

## 3. Supreme Directives

### 3.1 Never Run Build

**DO NOT RUN `bun run build` or any equivalent build command.**

Use development, type-checking, linting, and targeted runtime tests instead.

### 3.2 Use Sub-Agents / Workflows

When implementing a large feature, divide the work logically.

Possible personas:

- **UI Agent:** Frontend components and pages
- **API Agent:** TanStack Start server routes
- **Backend Infrastructure Agent:** Database, configuration, logging, validation
- **Integration Agent:** Frontend/backend integration
- **Testing Agent:** API and integration verification

Do not create unnecessary sub-agents for trivial changes.

### 3.3 Backend and Frontend Only

This repository contains the web application.

Do NOT implement:

- ESP32 C++
- Raspberry Pi hardware Python
- LoRaWAN firmware
- GPIO control software
- Physical sensor drivers

Hardware will eventually replace the simulator as the data source.

---

## 4. Architecture

HydroGrid uses a **single-server TanStack Start architecture**.

Do NOT create:

- Express server
- NestJS application
- Separate backend repository
- Separate HTTP server
- Microservices

The backend remains inside the existing TanStack Start application.

### Backend structure

Server API routes:

```text
src/routes/api/
```

Server-only infrastructure:

```text
src/server/
```

Shared schemas/types:

```text
src/lib/
```

Only place code in `src/lib/` when it genuinely needs to be shared between frontend and backend.

---

## 5. Backend Technology Rules

### Runtime

Use:

```text
Bun
```

Never use:

```text
npm
pnpm
yarn
```

### API

Use TanStack Start API routes:

```ts
import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
```

Do NOT use Express-style route handlers.

### Authentication

Supabase Auth is the authentication provider.

Do NOT implement custom:

- JWT authentication
- password authentication
- session management
- OAuth provider logic

unless explicitly required by the finalized documentation.

### Database

Relational application data:

```text
Supabase PostgreSQL
```

Time-series telemetry:

```text
InfluxDB
```

Do NOT use SQLite as the application database.

SQLite is NOT part of the finalized MVP architecture.

### Validation

Use:

```text
Zod
```

for request and configuration validation.

---

## 6. Final MVP Water Parameters

The MVP uses exactly these parameters:

- pH
- Turbidity
- Heavy Metals
- Dissolved Oxygen
- TDS
- Electrical Conductivity
- Temperature
- Flow Rate
- Hardness

Do not introduce additional water-quality parameters without updating the finalized documentation first.

### Electrical Conductivity

Electrical Conductivity (EC) is an MVP supporting/observational parameter.

EC:

- Must be stored
- Must be available to the frontend
- Should be displayed alongside TDS
- Can support trend/data-quality analysis

EC must NOT independently cause a Quality Gate failure in the MVP.

Do not invent an EC safety threshold.

---

## 7. Backend Responsibilities

The backend MVP is responsible for:

- Water-quality monitoring
- Water Safety Score
- Water Safety status
- Quality Gate
- Purification state
- Flow monitoring
- Leak detection
- Device health
- Sensor health
- Calibration
- Maintenance
- Events
- Alerts
- Realtime updates
- Hardware simulation

The detailed behavior is defined in:

```text
docs/backend-detailed.md
```

---

## 8. Simulator

Because physical hardware is not connected during the MVP:

```text
Simulator
    ↓
Backend processing
    ↓
Database
    ↓
SSE
    ↓
Frontend
```

The simulator must behave as a temporary hardware/data source.

It must support the scenarios defined in:

```text
docs/backend-mvp.md
```

The simulator is NOT throwaway code.

When physical hardware becomes available:

```text
Simulator
    ↓
replaced by
    ↓
ESP32 / Edge Controller
```

The rest of the backend workflow should remain unchanged.

---

## 9. API Route Rules

All backend API routes belong under:

```text
src/routes/api/
```

Use:

```ts
createAPIFileRoute(...)
```

Do not create duplicate API mechanisms.

Before creating a new route:

1. Check `docs/backend-detailed.md`
2. Check existing API routes
3. Confirm that the route belongs to the frozen MVP
4. Follow the documented request/response contract

Do not invent routes for convenience.

---

## 10. API Response and Error Handling

All APIs must use consistent response structures.

Errors must be:

- predictable
- machine-readable
- safe for frontend consumption
- free of secrets or internal credentials

Do not expose:

- API keys
- database credentials
- Supabase secrets
- internal stack traces
- environment variables

---

## 11. Environment Variables

Never hardcode secrets.

Use environment variables for:

- Supabase configuration
- PostgreSQL configuration where required
- InfluxDB configuration
- Other external service credentials

Maintain:

```text
.env.example
```

with variable names only.

Never commit real credentials.

---

## 12. Logging

Backend logging must be structured and useful for debugging.

Do not log:

- passwords
- access tokens
- API keys
- database credentials
- sensitive user information

Prefer meaningful events such as:

```text
API request
Telemetry ingestion
Quality Gate evaluation
Leak detection
Simulator scenario change
Database failure
External service failure
```

---

## 13. UI / UX Rules

HydroGrid uses:

```text
shadcn/ui
Tailwind CSS
TanStack Router
```

Keep components under:

```text
src/components/
```

Keep routes under:

```text
src/routes/
```

Do not redesign existing frontend components unless explicitly requested.

---

## 14. Design System

Use the project's established custom palette.

- White Chalk: `#f6f4f1`
- Radiant Dawn: `#ece2ce`
- Sneezeweeds: `#f2b635`
- Tobiko Orange: `#e45c10`
- Kyuri Green: `#4b5d16`
- Blind Forest: `#223300`

Do not introduce default Shadcn slate/zinc colors.

Do not hardcode colors when existing CSS variables should be used.

---

## 15. Naming & Positioning

The project is strictly named:

```text
HydroGrid
```

Do NOT use:

- `JalRakshak`
- `SCADA Demo` / `SCADA Monitor` / `SCADA System`
- Any other alternative name

in application code, UI, API responses, commits, or documentation.

HydroGrid is NOT a SCADA demo or SCADA-compatible API. It is a standalone, offline-first system engineered to **REPLACE traditional SCADA**, utilizing decentralized edge nodes capable of autonomous local decision making.

---

## 16. Implementation Workflow

Before modifying code:

1. Read `AGENTS.md`
2. Read the relevant documentation under `docs/`
3. Inspect the existing implementation
4. Identify the minimum required files
5. Implement the requested milestone
6. Run formatting/checking
7. Run linting
8. Run targeted tests
9. Run the development server when required
10. Test the affected API/feature
11. Fix actual failures
12. Re-run validation
13. Report exactly what changed

Never claim something works without actually validating it.

---

## 17. Do Not Over-Engineer

Avoid premature:

- microservices
- repository abstractions
- event buses
- complex dependency injection
- unnecessary interfaces
- speculative modules
- unused infrastructure
- duplicate data models
- unnecessary dependencies

Prefer the simplest architecture that satisfies the frozen MVP contract.

---

## 18. Milestone Discipline

Do NOT implement the entire backend in one step.

Implement backend milestones incrementally.

Each milestone must:

1. Have a clearly defined scope
2. Modify only necessary files
3. Be validated independently
4. Leave the repository in a working state
5. Stop before automatically starting the next milestone

Do not expand scope without explicit instruction.

---

## 19. Build Restriction

Never run:

```bash
bun run build
```

or any equivalent production build command.

Allowed validation includes:

```bash
bun run check
bun run lint
```

and appropriate development/runtime API testing.

---

## 20. Final Verification Checklist

Before completing a task, verify:

- No build command was executed
- Bun was used
- Documentation was followed
- No undocumented API routes were introduced
- No undocumented water parameters were introduced
- No custom authentication was introduced
- No SQLite application database was introduced
- No hardware code was introduced
- No secrets were committed
- Existing frontend behavior was not unnecessarily broken
- Relevant validation was executed
- Actual runtime behavior was tested where applicable
