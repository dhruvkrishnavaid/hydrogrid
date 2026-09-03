**PS 26040 | Frontend + Agent Integration Context | FROZEN**

This page is the canonical context for **frontend developers, frontend coding agents, and LLMs** working on HydroGrid.

The frontend is a consumer of the frozen backend contract. Do not invent backend behavior, duplicate backend decision logic, or create alternative API shapes.

---

# 1. Product Context

HydroGrid is an offline-first water monitoring and purification system for rural and mining-affected areas.

The MVP is a **software + simulator demonstration**. Physical hardware is not connected yet.

The backend simulator represents the hardware data source. The frontend must behave as if real hardware were connected.

Primary product loop:

```
Source / Device Data
        ↓
Water Quality
        ↓
Safety Evaluation
        ↓
Quality Gate
        ↓
Release / Block Water
        ↓
Flow + Leak Monitoring
        ↓
Events / Alerts
        ↓
Frontend Realtime Dashboard
```

---

# 2. Frontend Responsibility

The frontend is responsible for:

- Visualizing current system state
- Showing water quality
- Showing Safety Score and confidence
- Showing Quality Gate status
- Showing purification stages
- Showing flow and leak state
- Showing device and sensor health
- Showing maintenance state
- Showing events and alerts
- Showing historical telemetry
- Consuming realtime SSE updates
- Providing simulator controls for the demo

The frontend is **not** responsible for:

- Calculating the authoritative Safety Score
- Deciding whether water is safe
- Applying Quality Gate rules
- Detecting leaks independently
- Deciding valve isolation
- Inventing alert severity
- Replacing backend state with frontend assumptions

Backend state is authoritative.

---

# 3. Backend API Surface

These are the frozen MVP API groups available to the frontend:

```
/dashboard
/sites
/devices
/water-quality
/water-safety
/quality-gate
/purification
/calibration
/maintenance
/flow
/leaks
/events
/alerts
/events/stream
/dev/simulator
```

## Route Ownership

| Route            | Frontend Purpose                          |
| ---------------- | ----------------------------------------- |
| `/dashboard`     | Aggregated dashboard state                |
| `/sites`         | Site selection and site information       |
| `/devices`       | Device state and health                   |
| `/water-quality` | Current and historical water readings     |
| `/water-safety`  | Safety Score, confidence, status, reasons |
| `/quality-gate`  | Water release / block decision            |
| `/purification`  | Treatment stages and pump/filter state    |
| `/calibration`   | Calibration state and requirements        |
| `/maintenance`   | Filter and maintenance information        |
| `/flow`          | Flow measurements and mismatch            |
| `/leaks`         | Leak state and isolation state            |
| `/events`        | Historical/system events                  |
| `/alerts`        | Active and historical alerts              |
| `/events/stream` | Realtime SSE updates                      |
| `/dev/simulator` | Hackathon demo scenario controls          |

Detailed request/response schemas belong to the separate **Frontend LLM Integration Contract**. If a schema is not defined there, do not invent one; ask the backend team.

---

# 4. Core Backend States

Agents must preserve these exact semantic states:

```
SAFE
UNSAFE
UNKNOWN

PASS
FAIL

RELEASED
BLOCKED

NORMAL
WARNING
DEGRADED
OFFLINE

ISOLATED

CALIBRATION REQUIRED

CRITICAL
```

Do not rename these states in frontend API models.

A UI label may be human-friendly, but the underlying value must remain unchanged.

---

# 5. Water Quality Data

The frontend may receive these water-quality parameters:

```
pH
Turbidity
Heavy Metals
Dissolved Oxygen (DO)
TDS
Electrical Conductivity (EC)
Temperature
Flow Rate
Hardness
```

EC is an MVP supporting/observational parameter. Display and store it alongside TDS, but do not treat EC as an independent Quality Gate criterion unless the backend contract explicitly provides such a decision.

Use:

- Current-value cards for current readings
- Charts for historical readings
- Clear units
- Timestamp / last update
- Sensor/device association where available

The frontend should never infer missing sensor values as safe.

---

# 6. Water Safety

Display:

```
Safety Score: 0–100
Confidence: 0–100
Status: SAFE / UNSAFE / UNKNOWN
Safety reasons
```

The frontend displays the backend result.

Example:

```
Safety Score: 91
Confidence: 96
Status: SAFE
```

or:

```
Safety Score: 42
Confidence: 94
Status: UNSAFE
Reason: pH outside configured range
```

---

# 7. Quality Gate

This is a primary operational state and must be highly visible.

Display:

```
PASS → water may be released
FAIL → water release is blocked
```

The frontend must not independently calculate the gate.

Example:

```
QUALITY GATE
PASS
Water can be released
```

```
QUALITY GATE
FAIL
Water release blocked
```

---

# 8. Purification

Represent the treatment pipeline in this order:

```
Sediment
    ↓
Activated Carbon
    ↓
Calcite / Dolomite
    ↓
UV
```

Display:

- Individual stage state
- Pump state
- Overall purification state
- Filter health
- Filter warnings

The visualization should make the treatment flow understandable without technical explanation.

---

# 9. Flow + Leak Monitoring

Backend provides flow information for leak monitoring.

Relevant concepts:

```
Inlet Flow
Outlet Flow
Flow Difference
15% mismatch threshold
Leak Status
Isolation Status
```

When the backend reports a leak:

```
LEAK DETECTED
Flow mismatch > threshold
Valve isolated / closed
```

The frontend displays the decision. It does not actuate or calculate the authoritative isolation state.

---

# 10. Device + Sensor Health

Display:

```
ONLINE
DEGRADED
OFFLINE
CALIBRATION REQUIRED
FAULT
```

Relevant information:

- Device status
- Sensor status
- Sensor drift
- Calibration requirement
- Device faults
- Last seen / last update

Health information should be accessible from the dashboard and detailed device views.

---

# 11. Maintenance

Display:

- Filter health
- Filter life estimate
- Replacement status
- Calibration requirements
- Maintenance events

Maintenance warnings should be visible without overwhelming normal operational information.

---

# 12. Events + Alerts

Events may represent:

```
QUALITY_GATE_FAILED
LEAK_DETECTED
LEAK_ISOLATED
DEVICE_OFFLINE
SENSOR_DRIFT
CALIBRATION_REQUIRED
FILTER_WARNING
SYSTEM_RECOVERED
```

Alerts communicate severity.

Known severity levels:

```
WARNING
CRITICAL
```

Each event/alert should show, when available:

- Type
- Severity
- Timestamp
- Site
- Device/sensor
- Human-readable reason

---

# 13. Realtime SSE

Realtime updates come from:

```
/events/stream
```

SSE updates should update the relevant frontend state without requiring a full page refresh.

Realtime-sensitive UI:

- Sensor readings
- Safety Score
- Quality Gate
- Water release state
- Purification state
- Flow state
- Leak state
- Device state
- Alerts
- Events

The frontend should handle connection loss gracefully and show connection state when appropriate.

---

# 14. Main Frontend Screens

## Dashboard

Primary operational screen.

Show:

- Active site
- Overall system status
- Safety Score
- Confidence
- Quality Gate
- Current water quality
- Purification status
- Flow/leak status
- Device/sensor health
- Active alerts
- Recent events
- Realtime connection status

The user should understand the current water-system condition within seconds.

## Sites

Show:

- Site list
- Site location
- Site status
- Current safety state
- Device summary

## Site Detail

Show:

- Site information
- Source water quality
- Treated water quality
- Safety state
- Quality Gate
- Purification
- Flow/leak state
- Devices
- Sensors
- Events

## Water Quality

Show current values and historical charts for:

- pH
- Turbidity
- Heavy Metals
- Dissolved Oxygen (DO)
- TDS
- Electrical Conductivity (EC)
- Temperature
- Flow Rate
- Hardness

## Purification

Show the four treatment stages and their current state.

## Devices & Sensors

Show health, status, drift, calibration, faults, and last-seen information.

## Maintenance

Show filters, maintenance state, calibration requirements, and history.

## Events & Alerts

Show active and historical operational events and alerts.

---

# 15. Recommended Navigation

```
Dashboard
Sites
Water Quality
Purification
Leaks
Devices & Sensors
Maintenance
Events & Alerts
```

Dashboard is the main operational entry point.

---

# 16. Demo Simulator

The simulator is required for the MVP because hardware is not connected.

Simulator flow:

```
Frontend Demo Control
        ↓
/dev/simulator
        ↓
Backend generates scenario state
        ↓
Backend processing
        ↓
Database + Events + Alerts
        ↓
/events/stream
        ↓
Frontend updates
```

The simulator must be treated as a hardware replacement, not as a separate frontend mock.

---

# 17. Required Demo Scenarios

## Normal Water

Input example:

```
pH        = 7.1
TDS       = 380
Turbidity = 2.1
Flow      = normal
```

Expected backend state:

```
Safety       → SAFE
Quality Gate → PASS
Water        → RELEASED
Purification → NORMAL
Alerts       → none
```

Frontend must visibly reflect all states.

## Unsafe Water

Input example:

```
pH        = 5.2
TDS       = 900
Turbidity = 18
```

Expected:

```
Safety       → UNSAFE
Quality Gate → FAIL
Water        → BLOCKED
Event        → QUALITY_GATE_FAILED
Alert        → CRITICAL
```

The dashboard must make the blocked state immediately obvious.

## Pipeline Leak

Input example:

```
Inlet  = 12 L/min
Outlet = 9 L/min
Difference > 15%
```

Expected:

```
Leak   → DETECTED
Valve  → ISOLATED/CLOSED
Event  → LEAK_DETECTED
Event  → LEAK_ISOLATED
Alert  → CRITICAL
```

## Sensor Drift

Expected:

```
Sensor health → DEGRADED
Event         → SENSOR_DRIFT
Alert         → WARNING
Calibration   → REQUIRED
```

## Device Offline

Expected:

```
Device → OFFLINE
Event  → DEVICE_OFFLINE
Alert  → WARNING/CRITICAL
```

Recovery:

```
Device → ONLINE
Event  → SYSTEM_RECOVERED
```

## Filter Warning

Expected:

```
Filter → WARNING
Event  → FILTER_WARNING
Alert  → WARNING
```

---

# 18. Demo Completion Criteria

The frontend MVP is complete when the team can demonstrate:

```
1. Open dashboard
2. Select site
3. See live sensor values
4. See Safety Score + confidence
5. See Quality Gate
6. See purification status
7. Trigger UNSAFE scenario
8. See release become BLOCKED
9. Trigger LEAK scenario
10. See leak detected + isolation
11. Trigger sensor drift
12. See calibration/maintenance warning
13. Trigger device offline
14. Restore device
15. See events/alerts appear
16. See updates arrive through SSE
```

---

# 19. Data / UI Rules for Agents

When modifying or generating frontend code:

1. Use backend response fields as the source of truth.
2. Do not invent API routes.
3. Do not invent response fields when the contract does not define them.
4. Do not duplicate safety, quality-gate, or leak-decision logic in the UI.
5. Keep backend enum/state values unchanged in API types.
6. Keep simulator behavior compatible with the backend contract.
7. Handle `UNKNOWN` explicitly; never treat missing data as `SAFE`.
8. Show timestamps/last-update information where telemetry is displayed.
9. Handle loading, empty, error, offline, and realtime-disconnected states.
10. Keep components reusable across Dashboard, Site, Device, Quality, and Alert views.
11. Do not add MVP features outside this document without backend/team agreement.

---

# 20. MVP Boundary

Do not build UI around:

```
Real ESP32 integration
MQTT / LoRaWAN management
TTN management
ML / Isolation Forest predictions
WQMIS integration
OTA firmware
Advanced fleet management
Production Twilio configuration
Direct cloud hardware control
```

These are future integrations.

---

# 21. Authoritative Documentation

Use the documents in this order:

```
1. Backend MVP Team Plan
   → What the system does and the frozen MVP workflow

2. Frontend + Agent Integration Context
   → How frontend/agents consume the backend

3. Frontend LLM Integration Contract
   → Exact endpoint request/response schemas
```

If two documents appear inconsistent, **do not silently choose an implementation**. Ask the backend team before changing the contract.

---

# Team Rule

**Frontend visualizes backend state; backend owns system decisions.**

**Build against the frozen API contract and simulator workflow so the frontend works now and can consume real hardware data later without a rewrite.**
