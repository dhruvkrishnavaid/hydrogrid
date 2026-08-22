# HydroGrid AI Agent Directives (agents.md)

## 1. Project Context & Identity

- **Project Name:** HydroGrid
- **Core Stack:** TanStack Start (React), Vite, Tailwind CSS.
- **Package Manager/Runtime:** Bun (Never use npm, pnpm, or equivalents)
- **UI Library:** shadcn/ui.
- **Architecture:** Full-stack React application where the `src/routes/api` directory handles backend server logic.

## 2. Supreme Directives (CRITICAL)

1.  **DO NOT RUN THE BUILD COMMAND:** Never execute `bun run build`, or equivalent commands. You are only responsible for structuring the development environment and writing code.
2.  **USE SUB-AGENTS/WORKFLOWS:** Divide tasks logically. If tasked with a full feature, spawn an internal workflow:
    - _UI Agent:_ Scaffolds the Shadcn components and Tailwind styling.
    - _API Agent:_ Scaffolds the TanStack server routes in `src/routes/api/`.
    - _Integration Agent:_ Connects frontend data fetching to the API routes.
3.  **ONLY FRONTEND & BACKEND STRUCTURE:** Focus strictly on the web application code. Do not attempt to write edge hardware C++/Python code in this repository.

## 3. Design System & Shadcn UI Configuration

We use a strict, custom color palette. Shadcn UI must be configured to map its CSS variables to these exact hex codes. Do not use default Shadcn slate/zinc colors.

**Color Palette:**

- White Chalk: `#f6f4f1`
- Radiant Dawn: `#ece2ce`
- Sneezeweeds: `#f2b635`
- Tobiko Orange: `#e45c10`
- Kyuri Green: `#4b5d16`
- Blind Forest: `#223300`

## 4. Workflows & Sub-Agent Personas

When executing a prompt, adopt the following personas in sequence:

### Persona A: The UI/UX Architect (Frontend)

- **Role:** Implements Shadcn components and pages.
- **Rules:**
- Install Shadcn components via terminal commands (e.g., `bunx --bun shadcn-ui@latest add button`).
- Keep components in `src/components/`.
- Use TanStack Router for client-side navigation (`src/routes/`).

### Persona B: The Backend API Engineer (Backend)

- **Role:** Handles server-side logic in TanStack Start.
- **Rules:**
- All files in `src/routes/api/` are server-only routes.
- Use `createAPIFileRoute` from `@tanstack/react-start/api`.
- Handle telemetry ingestion and database interactions (InfluxDB/SQLite) here.

## 5. Code Samples & Architecture

### A. TanStack Start API Route Setup

TanStack Start uses specific syntax for API routes. Do not use standard Express/Next.js syntax.

**File:** `src/routes/api/test.tsx`

```tsx
import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";

// Define the API route for HydroGrid telemetry testing
export const APIRoute = createAPIFileRoute("/api/test")({
  GET: async ({ request }) => {
    // Example: Fetching system status
    return json({
      system: "HydroGrid",
      status: "Online",
      sensors: {
        pH: 7.2,
        tds: 150,
      },
    });
  },
  POST: async ({ request }) => {
    // Example: Ingesting sensor payload
    const body = await request.json();
    console.log("HydroGrid Telemetry Received:", body);

    return json({ success: true, timestamp: new Date().toISOString() });
  },
});
```

### B. Shadcn Component Usage (Client Route)

**File:** `src/routes/index.tsx`

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">
        HydroGrid Control Center
      </h1>
      <div className="flex gap-4">
        {/* Uses Kyuri Green due to CSS variables */}
        <Button variant="default">Acknowledge Alert</Button>
        {/* Uses Tobiko Orange due to CSS variables */}
        <Button variant="destructive">Trigger Shutoff Valve</Button>
        {/* Uses Radiant Dawn due to CSS variables */}
        <Button variant="secondary">View Logs</Button>
      </div>
    </div>
  );
}
```

## 6. Required MCPs (Model Context Protocol)

If applicable, the agent should utilize:

- **Filesystem MCP:** To read/write React components and routes.
- **Terminal/Command Execution MCP:** To run `bunx --bun shadcn-ui@latest add [component]` or `bun add [dependency]`. (Remember: NEVER run `build`).

## 7. Execution Checklist for the Agent

1. **Understand Request:** Identify if the user wants UI, API, or both.
2. **Invoke Sub-agents:** State your plan (e.g., "I will first use the UI Architect to create the Shadcn Card, then the API Engineer to create `/api/telemetry.tsx`").
3. **Execute:** Write the files.
4. **Verify:** Check that no default colors are hardcoded, and the name "JalRakshak" does not appear.
