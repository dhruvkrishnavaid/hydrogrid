**PS 26040 | Backend MVP | FROZEN**

This document is only for the backend team.  

It defines **what we are building**, the **system workflow**, and the **demo behavior**.

---

## 1. What We Are Building

A backend for an offline-first water monitoring and purification system that can:

- Monitor source and purified-water quality.
- Calculate/report Water Safety Score.
- Verify the Quality Gate before water release.
- Monitor purification stages.
- Detect flow mismatch / leaks.
- Track device and sensor health.
- Track calibration and maintenance.
- Generate events and alerts.
- Provide live updates to the frontend.
- Simulate the complete system for the hackathon demo.

---

# 2. Core Features

### Water Monitoring

- pH
- Turbidity
- Heavy Metals
- Dissolved Oxygen (DO)
- TDS
- Electrical Conductivity (EC) — supporting/observational parameter for MVP; displayed and stored alongside TDS, not an independent Quality Gate criterion
- Temperature
- Flow Rate
- Hardness

### Water Safety

- Safety Score: `0–100`
- Confidence: `0–100`
- `SAFE / UNSAFE / UNKNOWN`
- Safety reasons based on the agreed water-quality parameters
- Quality Gate: `PASS / FAIL`
- TDS may be used in the water-quality/safety assessment once its threshold is finalized
- EC is supporting/observational only for MVP and is not an independent Quality Gate criterion

The Safety Score and Quality Gate use the agreed water-quality parameter set. Exact thresholds/weights are not yet frozen.

### Purification

- Sediment
- Activated Carbon
- Calcite/Dolomite
- UV
- Pump status
- Purification mode

### Leak Detection

- Inlet flow
- Outlet flow
- Flow difference
- `15%` mismatch threshold
- Leak detected
- Leak isolated

### Device & Sensor Health

- Online/offline status
- Sensor health
- Sensor drift
- Calibration required
- Device faults

### Maintenance

- Filter health
- Filter life estimate
- Replacement status
- Maintenance events

### Events & Alerts

- Quality failure
- Leak detection
- Leak isolation
- Device offline
- Sensor drift
- Calibration required
- Filter warning
- System recovery

### Realtime

- SSE stream for live dashboard updates.

---

# 3. Backend Workflow

```
                 DATA / DEMO INPUT
                        |
                        v
             +---------------------+
             | ESP32 / Simulator   |
             | Sensor Readings     |
             +----------+----------+
                        |
                        v
             +---------------------+
             | Backend Processing  |
             +----------+----------+
                        |
       +----------------+----------------+
       |                |                |
       v                v                v
Water Quality     Safety / Gate      Flow / Leak
       |                |                |
       +----------------+----------------+
                        |
                        v
                 Events / Alerts
                        |
          +-------------+-------------+
          |                           |
          v                           v
     Database                      SSE
          |                           |
          v                           v
    History/Data                Frontend
```

---

# 4. Actual Demo Workflow

Since real hardware is not connected yet, the **backend simulator acts as the ESP32/hardware layer**.

The frontend should see the simulator exactly like real device data.

```
Frontend Demo Control
        |
        v
Simulator
        |
        v
Generate sensor/device state
        |
        v
Backend processing
        |
        +--> Update telemetry
        |
        +--> Calculate/report safety
        |
        +--> Evaluate Quality Gate
        |
        +--> Detect leak
        |
        +--> Update purification state
        |
        +--> Generate event
        |
        +--> Generate alert
        |
        v
Database
        |
        v
SSE
        |
        v
Frontend Dashboard
```

---

# 5. Demo Scenarios

The simulator must support these scenarios.

### A. Normal Water

```
pH        = 7.1
TDS       = 380
Turbidity = 2.1
Flow      = normal
```

Expected:

```
Safety       → SAFE
Quality Gate → PASS
Water        → RELEASED
Purification → NORMAL
Alerts       → none
```

---

### B. Unsafe Water

Example:

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

---

### C. Pipeline Leak

Example:

```
Inlet  = 12 L/min
Outlet = 9 L/min
Difference > 15%
```

Expected:

```
Leak         → DETECTED
Valve        → ISOLATED/CLOSED
Event        → LEAK_DETECTED
Event        → LEAK_ISOLATED
Alert        → CRITICAL
```

---

### D. Sensor Drift

Expected:

```
Sensor health → DEGRADED
Event         → SENSOR_DRIFT
Alert         → WARNING
Calibration   → REQUIRED
```

---

### E. Device Offline

Expected:

```
Device → OFFLINE
Event  → DEVICE_OFFLINE
Alert  → WARNING/CRITICAL
```

Then restore:

```
Device → ONLINE
Event  → SYSTEM_RECOVERED
```

---

### F. Filter Warning

Expected:

```
Filter → WARNING
Event  → FILTER_WARNING
Alert  → WARNING
```

---

# 6. Main Backend API Groups

Only these groups are required for MVP:

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

Detailed endpoint contracts are maintained separately in the **Frontend LLM Integration Contract**.

---

# 7. Storage

### PostgreSQL / Supabase

```
Sites
Devices
Users / memberships
Events
Alerts
Calibration
Maintenance
Configuration
```

### InfluxDB

```
Sensor telemetry
Flow telemetry
Historical quality data
Safety-score history
```

---

# 8. What Is NOT Being Built Now

Do not spend MVP time on:

```
Real ESP32 integration
Real MQTT/LoRaWAN
TTN integration
Production Twilio integration
ML / Isolation Forest
WQMIS integration
OTA firmware
Advanced fleet management
Production hardware control
```

These are future integrations.

---

# 9. Final MVP

At the end of the MVP, we should be able to demonstrate:

```
1. Open dashboard
2. Select a water site
3. See live sensor values
4. See Safety Score + confidence
5. See Quality Gate
6. See purification status
7. Trigger UNSAFE scenario
8. See water release become BLOCKED
9. Trigger LEAK scenario
10. See leak detected + isolation
11. Trigger sensor drift
12. See maintenance/calibration warning
13. See device offline/recovery
14. See alerts/events appear live
15. See frontend update through SSE
```

The entire demo must work **without physical hardware**.

When hardware becomes available later:

```
Simulator
   ↓
replaced by
   ↓
ESP32 / Edge Controller
```

The rest of the backend and frontend workflow should remain unchanged.

---

## Team Rule

**Build this MVP around the demo workflow first.**

The simulator is not throwaway code; it is the temporary hardware/data source that lets the complete system work before the physical prototype is connected.