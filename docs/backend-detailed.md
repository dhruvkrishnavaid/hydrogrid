**PS 26040 | JalRakshak | Backend Detailed MVP | FROZEN**

## 1. Purpose

This page is the detailed backend implementation specification for JalRakshak MVP.

It expands the short **Backend MVP Team Plan** into the technical contract for backend developers and coding agents.

The backend is a **single TanStack Start server running on Bun**. The frontend consumes REST/SSE APIs. Supabase provides authentication and PostgreSQL. InfluxDB stores telemetry/time-series data. The current demo uses a backend simulator instead of physical hardware.

---

## 2. Architecture

```
                    JalRakshak
                         |
          +--------------+--------------+
          |                             |
     Frontend                       Backend
TanStack Start                     TanStack Start
     React                            Server
          |                             |
          | REST + SSE                  |
          +---------------------------->|
                                        |
                 +----------------------+------------------+
                 |                  |                     |
                 v                  v                     v
          Supabase Auth        PostgreSQL             InfluxDB
          Identity/JWT         Metadata               Telemetry
                 |                  |                     |
                 +------------------+---------------------+
                                        |
                                        v
                                 Backend Services
                                        |
                              +---------+---------+
                              |                   |
                              v                   v
                         Events/Alerts      Simulator
```

Future hardware replaces the simulator:

```
ESP32 / Edge Controller
        |
        v
Future MQTT / HTTP ingestion
        |
        v
Same backend telemetry/event pipeline
        |
        v
Same frontend API contract
```

### Safety boundary

The cloud backend is **not** the emergency safety controller.

The edge controller is responsible for physical safety decisions such as water rejection and valve isolation.

Backend responsibilities:

- ingest/store/report telemetry
- expose current state
- evaluate/report backend-level application state where applicable
- persist events/alerts
- provide historical data
- provide simulator/demo state
- provide frontend realtime updates

---

# 3. Technology Decisions

| Area | Decision |
| --- | --- |
| Full-stack framework | TanStack Start |
| Runtime | Bun |
| Server | TanStack Start server |
| Auth | Supabase Auth |
| Relational DB | Supabase PostgreSQL |
| Time-series DB | InfluxDB |
| API style | REST + JSON |
| Realtime | Server-Sent Events (SSE) |
| Current device source | Backend simulator |
| Future device transport | MQTT / HTTP |

No separate Express server for MVP.

---

# 4. Authentication & Authorization

Supabase Auth owns identity.

### Supabase handles

- Signup
- Login
- Logout
- Session management
- Password reset
- JWT issuance

### Backend handles

- JWT verification
- User extraction
- Role checks
- Site-level authorization

MVP roles:

```
ADMIN
OPERATOR
VIEWER
```

Frontend sends:

```
Authorization: Bearer <supabase-access-token>
```

No custom backend login/register routes.

---

# 5. Core Domain Model

## Site

Represents one JalRakshak installation.

```
id
name
village
district
state
latitude
longitude
status
createdAt
updatedAt
```

Site states:

```
ONLINE
OFFLINE
DEGRADED
```

## Device

Represents an edge/controller/sensor node associated with a site.

```
id
siteId
name
type
status
firmwareVersion
lastSeenAt
createdAt
```

Device types:

```
SOURCE_SENSOR_NODE
PURIFICATION_CONTROLLER
DISTRIBUTION_NODE
```

Device states:

```
ONLINE
DEGRADED
OFFLINE
FAULT
```

## Site Membership

Associates authenticated users with sites.

```
userId
siteId
role
```

## Quality Configuration

Stores site-specific application thresholds/configuration.

```
siteId
minPh
maxPh
maxTds
maxTurbidity
maxFlowMismatchPercent
```

Important: the **complete Safety Score/Quality Gate threshold and weighting model for all 9 parameters is not yet frozen**. Do not invent final production thresholds.

---

# 6. Water Quality Model

The agreed MVP water-quality parameter set is:

```
pH
turbidity
heavy metals
dissolved oxygen
tds
electrical conductivity
temperature
flow rate
hardness
```

Suggested API field names:

```
ph
turbidity
heavyMetals
dissolvedOxygen
tds
electricalConductivity
temperature
flowRate
hardness
```

### EC MVP rule

Electrical Conductivity is a **supporting/observational parameter** for MVP.

Use it to:

- store telemetry
- display alongside TDS
- support trend analysis
- provide contextual information

Do **not** make EC an independent Quality Gate criterion in the MVP.

### Flow Rate

Flow rate has a second responsibility: leak detection.

```
inletFlowRate
outletFlowRate
```

---

# 7. Telemetry Storage

Use InfluxDB for time-series telemetry.

PostgreSQL should not become the primary high-volume sensor store.

### Logical measurement

```
water_quality
```

Fields:

```
ph
 turbidity
heavyMetals
dissolvedOxygen
tds
electricalConductivity
temperature
hardness
```

Distribution/flow measurement:

```
flow
```

Fields:

```
inletFlowRate
outletFlowRate
```

Useful tags:

```
siteId
deviceId
location
waterStage
```

`waterStage` may distinguish:

```
SOURCE
OUTPUT
```

The frontend API should return normalized JSON rather than exposing InfluxDB-specific structures.

---

# 8. Current Water Quality API

## GET `/api/sites/:siteId/water-quality/current`

Returns the most recent source and output readings.

Conceptual response:

```json
{
  "data": {
    "source": {
      "ph": 5.4,
      "turbidity": 38.2,
      "heavyMetals": 0.42,
      "dissolvedOxygen": 3.8,
      "tds": 1240,
      "electricalConductivity": 1850,
      "temperature": 28.4,
      "hardness": 420,
      "flowRate": 12.4
    },
    "output": {
      "ph": 7.1,
      "turbidity": 2.1,
      "heavyMetals": 0.08,
      "dissolvedOxygen": 5.7,
      "tds": 380,
      "electricalConductivity": 620,
      "temperature": 27.9,
      "hardness": 310,
      "flowRate": 12.1
    },
    "timestamp": "2026-08-24T10:30:00Z"
  }
}
```

The actual units for heavy metals and hardness must be established by the team when the simulated sensor schema is finalized. Do not invent units in UI/API documentation until defined.

---

# 9. Historical Water Quality

## GET `/api/sites/:siteId/water-quality/history`

Query:

```
?from=ISO_TIMESTAMP
&to=ISO_TIMESTAMP
&interval=5m
```

Return chart-ready points using the same field names as the current endpoint.

Example:

```json
{
  "data": [
    {
      "timestamp": "2026-08-24T10:00:00Z",
      "source": {
        "ph": 5.6,
        "turbidity": 35.2,
        "heavyMetals": 0.40,
        "dissolvedOxygen": 3.9,
        "tds": 1210,
        "electricalConductivity": 1800,
        "temperature": 28.1,
        "hardness": 415,
        "flowRate": 12.0
      },
      "output": {
        "ph": 7.0,
        "turbidity": 2.4,
        "heavyMetals": 0.07,
        "dissolvedOxygen": 5.6,
        "tds": 390,
        "electricalConductivity": 630,
        "temperature": 27.7,
        "hardness": 305,
        "flowRate": 11.9
      }
    }
  ]
}
```

---

# 10. Water Safety

## GET `/api/sites/:siteId/water-safety`

Response:

```json
{
  "data": {
    "score": 87,
    "confidence": 94,
    "status": "SAFE",
    "reasons": [],
    "timestamp": "2026-08-24T10:30:00Z"
  }
}
```

States:

```
SAFE
UNSAFE
UNKNOWN
```

The backend owns the reported safety result.

### Historical

## GET `/api/sites/:siteId/water-safety/history`

Query:

```
?from=ISO_TIMESTAMP
&to=ISO_TIMESTAMP
&interval=5m
```

---

# 11. Quality Gate

## GET `/api/sites/:siteId/quality-gate`

Conceptual response:

```json
{
  "data": {
    "status": "PASS",
    "waterRelease": "ALLOWED",
    "checks": {
      "ph": {
        "value": 7.1,
        "min": 6.5,
        "max": 8.5,
        "status": "PASS"
      },
      "tds": {
        "value": 380,
        "max": 500,
        "status": "PASS"
      },
      "turbidity": {
        "value": 2.1,
        "max": 5,
        "status": "PASS"
      }
    },
    "checkedAt": "2026-08-24T10:30:00Z"
  }
}
```

Possible gate states:

```
PASS
FAIL
```

Possible release states:

```
ALLOWED
BLOCKED
```

Do not interpret the example thresholds as the final complete nine-parameter safety standard. The full scoring/gating rules remain to be finalized.

---

# 12. Purification

## GET `/api/sites/:siteId/purification/status`

Treatment pipeline:

```
Sediment
   ↓
Activated Carbon
   ↓
Calcite / Dolomite
   ↓
UV
```

Response concept:

```json
{
  "data": {
    "mode": "NORMAL",
    "stages": {
      "sediment": "HEALTHY",
      "carbon": "HEALTHY",
      "calcite": "HEALTHY",
      "uv": "ACTIVE"
    },
    "pump": "RUNNING",
    "lastUpdated": "2026-08-24T10:30:00Z"
  }
}
```

Stage states may include:

```
HEALTHY
ACTIVE
WARNING
DEGRADED
FAULT
OFF
```

---

# 13. Flow + Leak Detection

## GET `/api/sites/:siteId/flow/current`

```json
{
  "data": {
    "inlet": 12.4,
    "outlet": 9.8,
    "differencePercent": 20.96,
    "thresholdPercent": 15,
    "status": "LEAK_DETECTED",
    "isolationValve": "CLOSED"
  }
}
```

## GET `/api/sites/:siteId/flow/history`

Query:

```
?from=ISO_TIMESTAMP
&to=ISO_TIMESTAMP
&interval=5m
```

## GET `/api/sites/:siteId/leaks`

Leak history.

## GET `/api/sites/:siteId/leaks/current`

Current leak/isolation state.

Leak states:

```
NORMAL
LEAK_DETECTED
ISOLATED
```

MVP mismatch trigger:

```
> 15%
```

The backend reports the state; physical isolation remains an edge responsibility.

---

# 14. Devices

## GET `/api/sites/:siteId/devices`

## GET `/api/devices/:deviceId`

## GET `/api/devices/:deviceId/health`

Example:

```json
{
  "data": {
    "status": "ONLINE",
    "lastSeenAt": "2026-08-24T10:30:00Z",
    "firmwareVersion": "0.1.0"
  }
}
```

---

# 15. Sensor Health

## GET `/api/devices/:deviceId/sensors/health`

Example:

```json
{
  "data": {
    "ph": {
      "status": "HEALTHY",
      "drift": 0.12
    },
    "tds": {
      "status": "HEALTHY",
      "drift": 3.4
    }
  }
}
```

Sensor states:

```
HEALTHY
DEGRADED
CALIBRATION_REQUIRED
FAULT
```

All nine agreed water-quality parameters may have sensor-health metadata when corresponding hardware/simulation exists.

---

# 16. Calibration

## GET `/api/sites/:siteId/calibration`

## POST `/api/sites/:siteId/calibration`

Conceptual calibration record:

```
sensor
status
offset
lastCalibratedAt
nextCalibrationAt
```

The backend records/statuses calibration; actual physical calibration remains an edge/hardware operation.

---

# 17. Maintenance

## GET `/api/sites/:siteId/maintenance`

## GET `/api/sites/:siteId/maintenance/status`

Filter set:

```
SEDIMENT
CARBON
CALCITE
UV
```

Example:

```json
{
  "data": {
    "filters": {
      "sediment": { "status": "HEALTHY", "lifePercent": 82 },
      "carbon": { "status": "WARNING", "lifePercent": 24 },
      "calcite": { "status": "HEALTHY", "lifePercent": 68 },
      "uv": { "status": "HEALTHY", "lifePercent": 91 }
    }
  }
}
```

These are MVP/demo maintenance indicators, not a validated predictive model.

---

# 18. Events

## GET `/api/sites/:siteId/events`

Query:

```
?type=
&severity=
&from=
&to=
```

Main event types:

```
QUALITY_GATE_PASSED
QUALITY_GATE_FAILED
LEAK_DETECTED
LEAK_ISOLATED
DEVICE_ONLINE
DEVICE_OFFLINE
FILTER_WARNING
SENSOR_DRIFT
CALIBRATION_REQUIRED
SYSTEM_RECOVERED
```

Severity:

```
INFO
WARNING
CRITICAL
```

Example:

```json
{
  "data": [
    {
      "id": "evt_001",
      "siteId": "site_001",
      "type": "LEAK_DETECTED",
      "severity": "CRITICAL",
      "message": "Flow mismatch exceeded 15%",
      "timestamp": "2026-08-24T10:31:00Z",
      "acknowledged": false
    }
  ]
}
```

---

# 19. Alerts

## GET `/api/alerts`

Filters:

```
?siteId=
&severity=
&status=
```

## GET `/api/alerts/:alertId`

## PATCH `/api/alerts/:alertId/acknowledge`

Alert status:

```
UNREAD
READ
ACKNOWLEDGED
```

Example:

```json
{
  "data": {
    "id": "alert_001",
    "siteId": "site_001",
    "eventId": "evt_001",
    "type": "LEAK_DETECTED",
    "severity": "CRITICAL",
    "status": "UNREAD",
    "message": "Pipeline leak detected and isolated",
    "createdAt": "2026-08-24T10:31:00Z"
  }
}
```

---

# 20. Dashboard Aggregation

## GET `/api/dashboard/overview`

Purpose: avoid excessive frontend requests for the main summary.

Example:

```json
{
  "data": {
    "sites": {
      "total": 4,
      "online": 3,
      "offline": 1
    },
    "waterQuality": {
      "safe": 3,
      "unsafe": 1
    },
    "leaks": {
      "active": 1
    },
    "alerts": {
      "critical": 2,
      "warning": 3
    },
    "lastUpdated": "2026-08-24T10:32:00Z"
  }
}
```

This endpoint is read-only and aggregates existing backend state.

---

# 21. Realtime SSE

## GET `/api/sites/:siteId/events/stream`

The frontend opens an SSE connection after initial REST data loads.

Event types:

```
water-quality.updated
water-safety.updated
quality-gate.changed
flow.updated
leak.detected
leak.isolated
device.status-changed
sensor.health-changed
maintenance.updated
alert.created
```

Example:

```json
{
  "type": "leak.detected",
  "data": {
    "siteId": "site_001",
    "differencePercent": 21.4,
    "thresholdPercent": 15
  }
}
```

SSE is for UI freshness and does not control hardware safety.

---

# 22. Simulator

The simulator is a first-class MVP backend component.

It must produce data through the same processing path that future hardware will use.

```
Simulator
   ↓
Telemetry / State
   ↓
Backend Processing
   ↓
Events / Alerts / Storage
   ↓
SSE
   ↓
Frontend
```

## Development routes

```
POST /api/dev/simulator/reset
POST /api/dev/simulator/normal
POST /api/dev/simulator/quality-failure
POST /api/dev/simulator/leak
POST /api/dev/simulator/device-offline
POST /api/dev/simulator/device-online
POST /api/dev/simulator/sensor-drift
POST /api/dev/simulator/calibration-required
POST /api/dev/simulator/filter-warning
```

Simulator routes are development/demo only and must be disabled in production.

---

# 23. Demo Scenarios

## Normal

```
Good source
→ normal treatment
→ acceptable output
→ Safety SAFE
→ Quality Gate PASS
→ Water RELEASED
```

## Unsafe Water

The simulator may make any relevant water-quality parameter abnormal.

Example:

```
pH        = 5.2
TDS       = 900
turbidity = 18
```

Expected:

```
Safety       → UNSAFE
Quality Gate → FAIL
Water        → BLOCKED
Event        → QUALITY_GATE_FAILED
Alert        → CRITICAL
```

The final exact parameter-specific thresholds are not frozen yet.

## Heavy-Metal Contamination

Simulator should be able to represent elevated heavy-metal data so the team can demonstrate that a mining-specific contamination signal can drive an unsafe condition once the final threshold/configuration is defined.

## Leak

```
Inlet  = 12 L/min
Outlet = 9 L/min
Difference > 15%
```

Expected:

```
LEAK_DETECTED
LEAK_ISOLATED
CRITICAL ALERT
```

## Sensor Drift

```
Sensor → DEGRADED
Event  → SENSOR_DRIFT
Alert  → WARNING
Calibration → REQUIRED
```

## Device Offline / Recovery

```
OFFLINE
→ DEVICE_OFFLINE
→ alert
→ ONLINE
→ SYSTEM_RECOVERED
```

## Filter Warning

```
Filter → WARNING
Event  → FILTER_WARNING
Alert  → WARNING
```

---

# 24. Request / Response Conventions

Base path:

```
/api
```

All timestamps are UTC ISO-8601.

Standard successful response:

```json
{
  "data": {}
}
```

Standard error:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Site not found"
  }
}
```

Common statuses:

```
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

---

# 25. Error Handling

Backend errors must be predictable.

Recommended codes:

```
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
SITE_NOT_FOUND
DEVICE_NOT_FOUND
INVALID_SITE_ACCESS
SIMULATOR_DISABLED
TELEMETRY_UNAVAILABLE
INTERNAL_ERROR
```

Do not expose raw database/InfluxDB errors to the frontend.

---

# 26. Idempotency / Telemetry Preparation

Future hardware will reconnect after offline periods.

Telemetry/event messages should therefore support an external unique identifier such as:

```
messageId
```

The backend should be designed so duplicate delivery does not create duplicate logical events.

This becomes important when the simulator is later replaced with real edge buffering + MQTT/HTTP delivery.

---

# 27. Backend Processing Rules

## Telemetry

```
Receive / generate reading
        ↓
Validate shape/ranges
        ↓
Persist time-series data
        ↓
Update current state
        ↓
Run relevant domain processing
```

## Quality

```
Water-quality reading
        ↓
Quality evaluation
        ↓
Safety result / reasons
        ↓
Quality Gate state
        ↓
Event if state changes/fails
        ↓
Alert if required
```

## Leak

```
Inlet flow + outlet flow
        ↓
Difference calculation
        ↓
Compare with 15% threshold
        ↓
Leak state
        ↓
Event / alert
```

The physical valve action remains outside the cloud safety path.

---

# 28. Data Lifecycle

```
Input
 ↓
Validation
 ↓
Current State
 ↓
Time-Series Storage
 ↓
Domain Processing
 ↓
Events
 ↓
Alerts
 ↓
SSE
 ↓
Frontend
```

The system should preserve the original telemetry needed for historical analysis.

---

# 29. MVP API Summary

```
GET    /api/dashboard/overview

GET    /api/sites
POST   /api/sites
GET    /api/sites/:siteId
PATCH  /api/sites/:siteId

GET    /api/sites/:siteId/devices
GET    /api/devices/:deviceId
GET    /api/devices/:deviceId/health
GET    /api/devices/:deviceId/sensors/health

GET    /api/sites/:siteId/water-quality/current
GET    /api/sites/:siteId/water-quality/history

GET    /api/sites/:siteId/water-safety
GET    /api/sites/:siteId/water-safety/history

GET    /api/sites/:siteId/quality-gate

GET    /api/sites/:siteId/purification/status

GET    /api/sites/:siteId/calibration
POST   /api/sites/:siteId/calibration

GET    /api/sites/:siteId/maintenance
GET    /api/sites/:siteId/maintenance/status

GET    /api/sites/:siteId/flow/current
GET    /api/sites/:siteId/flow/history
GET    /api/sites/:siteId/leaks
GET    /api/sites/:siteId/leaks/current

GET    /api/sites/:siteId/events
GET    /api/sites/:siteId/events/stream

GET    /api/alerts
GET    /api/alerts/:alertId
PATCH  /api/alerts/:alertId/acknowledge
```

Development only:

```
POST   /api/dev/simulator/reset
POST   /api/dev/simulator/normal
POST   /api/dev/simulator/quality-failure
POST   /api/dev/simulator/leak
POST   /api/dev/simulator/device-offline
POST   /api/dev/simulator/device-online
POST   /api/dev/simulator/sensor-drift
POST   /api/dev/simulator/calibration-required
POST   /api/dev/simulator/filter-warning
```

---

# 30. MVP Boundary

### Build now

```
Supabase Auth integration
Authorization
Sites
Devices
Water-quality telemetry model
Water-quality current/history APIs
Water Safety Score API
Quality Gate API
Purification status
Flow/leak APIs
Sensor health
Calibration
Maintenance
Events
Alerts
Dashboard aggregation
SSE
Simulator
```

### Do not build now

```
Real ESP32 integration
Production MQTT/LoRaWAN
TTN integration
Production Twilio delivery
ML / Isolation Forest filter-life prediction
WQMIS integration
OTA firmware
Advanced fleet management
Cloud-based emergency hardware control
```

---

# 31. Implementation Order

Recommended backend implementation sequence:

```
1. Server/config foundation
2. Supabase Auth verification
3. PostgreSQL schema
4. Sites + authorization
5. Devices
6. Telemetry types/validation
7. InfluxDB integration
8. Water-quality current/history
9. Water Safety + Quality Gate
10. Purification status
11. Flow + leak processing
12. Events + alerts
13. SSE
14. Simulator
15. Dashboard aggregation
16. Integration tests
```

Do not begin by building every route independently. Shared domain services should drive both simulator and future hardware ingestion.

---

# 32. Agent Rules

When using a coding agent such as Agy:

1. Read the Backend MVP Team Plan and this document before implementation.
2. Treat the route list and semantics as frozen MVP contract.
3. Do not invent missing API behavior.
4. Do not silently change endpoint schemas.
5. Keep simulator data compatible with the future hardware contract.
6. Keep safety-critical physical decisions outside the cloud backend.
7. Keep EC observational/supporting in MVP; do not make it an independent Quality Gate criterion.
8. Keep the nine agreed water-quality parameters consistent across telemetry, simulator, APIs, and frontend responses.
9. Use UTC timestamps.
10. Do not expose raw infrastructure errors.
11. Preserve idempotency preparation for future offline/hardware ingestion.
12. Run tests/validation after implementation changes.

If a requirement conflicts with this document, stop and resolve the contract before implementing it.

---

# 33. Authoritative Documentation

Use these documents in order:

```
Backend MVP Team Plan
    ↓
Backend Detailed MVP
    ↓
Frontend Design MVP Plan
    ↓
Frontend LLM Integration Contract
```

The short team plan defines **what the MVP is**.

This document defines **how the backend is expected to behave and be implemented**.

The frontend documents define **how the frontend consumes the backend**.

If a conflict appears, do not silently choose an interpretation. Resolve it with the team before changing the frozen contract.

---

# Team Rule

**Build the backend around one consistent domain pipeline: telemetry → validation → state → processing → events/alerts → storage → realtime frontend.**

The simulator must use the same backend processing path that future hardware will use.