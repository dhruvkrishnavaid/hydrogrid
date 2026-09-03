# HydroGrid Hardware Prototype Specification: Node Zero (IIITD)

## 1. Executive Summary & Prototype Identity

- **Node Identifier:** `Node Zero`
- **Deployment Location:** Indraprastha Institute of Information Technology Delhi (**IIIT-Delhi / IIITD**), Okhla Phase III, New Delhi, India
- **System Architecture:** Autonomous Edge Intelligence Node engineered to **REPLACE traditional SCADA**
- **Operational Profile:** Single-node decentralized edge deployment with local decision-making and emergency physical actuation

HydroGrid operates as a standalone water monitoring and automated quality gatekeeper. Unlike legacy SCADA systems that depend on centralized programmable logic controllers (PLCs) and continuous cloud telemetry, **Node Zero** executes local quality and hydraulic integrity evaluations on-device at the edge.

---

## 2. Physical Instrumentation & Sensory Payload

The physical prototype deployed at IIITD is provisioned with three primary sensory channels and one physical actuator:

| Subsystem / Sensor                  | Parameter                 | Measurement Range                          | Permissible Operational Band                         | Primary Safety Function                                          |
| :---------------------------------- | :------------------------ | :----------------------------------------- | :--------------------------------------------------- | :--------------------------------------------------------------- |
| **Optical Turbidity Sensor**        | Suspended Colloids / Silt | $0.00 - 50.00\text{ NTU}$                  | $\le 5.0\text{ NTU}$ (IS 10500:2012)                 | Detects silt ingress, particulate contamination, and cloudiness. |
| **Precision Temperature Probe**     | Fluid Temperature         | $-10.0^\circ\text{C} - 85.0^\circ\text{C}$ | $15.0^\circ\text{C} - 35.0^\circ\text{C}$            | Thermal baseline calibration and fluid stability monitoring.     |
| **Hall-Effect Turbine Flow Sensor** | Discharge Flow Rate ($Q$) | $0.0 - 60.0\text{ L/min}$                  | $30.0 - 50.0\text{ L/min}$ (Rated $45\text{ L/min}$) | Volumetric delivery monitoring and hydraulic mass-balance input. |
| **12V Solenoid Shutoff Valve**      | Pipeline Flow Gate        | Binary State (`OPEN` / `CLOSED`)           | Fail-Secure Closed on Lockout                        | Emergency cut-off valve physically halting water delivery.       |

---

## 3. Autonomous Edge Decision-Making & Actuation Logic

Node Zero operates closed-loop local decision logic without requiring cloud round-trips:

### 3.1 15% Differential Mass-Balance Leak Detection

- Continuously calculates differential flow mismatch percentage between intake and downstream distribution:
  $$\Delta Q = \frac{|Q_{\text{inlet}} - Q_{\text{outlet}}|}{Q_{\text{inlet}}} \times 100\%$$
- If $\Delta Q > 15.0\%$ persists across the evaluation window, a **CRITICAL LEAK** event is triggered locally.
- Node Zero energizes/de-energizes the **12V Solenoid Valve** to immediately isolate the pipeline, preventing non-revenue water loss and localized structural undermining.

### 3.2 Automated Quality Gatekeeper Shutoff

- If the optical turbidity reading exceeds $5.0\text{ NTU}$, or if composite safety score evaluates to `FAIL` / `CRITICAL`, the automated gatekeeper locks out water release:
  - Solenoid Valve switches to `CLOSED`.
  - Water release state updates to `BLOCKED`.
  - Visual beacon and telemetry audit events are dispatched via SSE.

---

## 4. Feature Flag Architecture & Profile Management

To accurately reflect the physical prototype during live demonstrations while preserving the full-scale platform capabilities, two environment feature flags are introduced:

```bash
# .env (or environment configuration)
VITE_ENABLE_PURIFICATION=false
VITE_ENABLE_ALL_SENSORS=false
```

### Feature Flag Behavioral Matrix

| Feature Flag               | When `false` (Prototype Profile - Active)                                                                                                                                                                                                                                                                                                                                                                      | When `true` (Full Facility Profile)                                                                                                                                                                         |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_PURIFICATION` | **Comments out and hides all purification interfaces:**<br>• Hides `/purification` link in navigation header.<br>• Hides 4-stage purification health chart on Dashboard.<br>• Hides purification treatment card in modules grid.<br>• Hides treatment link in lifecycle chain.<br>• Displays polite prototype notice if `/purification` is accessed directly.                                                  | Displays complete 4-stage multi-barrier pipeline (Sediment, GAC Carbon, Calcite/Dolomite AMD Neutralizer, UV-C Disinfection) with interactive stage diagnostics and trajectory charts.                      |
| `VITE_ENABLE_ALL_SENSORS`  | **Focuses UI on Node Zero physical hardware:**<br>• Dashboard KPI sparklines show **Turbidity**, **Water Temperature**, **Intake Flow Rate**, and **Differential Leak / Solenoid Valve Status**.<br>• Water quality channel tabs and compliance table display active physical sensors (Turbidity, Temperature).<br>• Radar chart is cleanly bypassed.<br>• Collapsible probe table filters to active channels. | Displays the comprehensive 9-channel analytical suite (pH, Turbidity, Heavy Metals, Dissolved Oxygen, TDS, Electrical Conductivity, Temperature, Flow Rate, Hardness) and multi-parameter potability radar. |

---

## 5. Preservation of Extended Telemetry & Dummy Data

> [!NOTE]
> **Zero Data Loss Guarantee:** Hiding non-prototype sensors and purification from the UI **does not** delete or drop any underlying data.

1. **InfluxDB Time-Series Telemetry**:
   - The cloud InfluxDB time-series bucket (`telemetry`) continues to store and retain all 9 physicochemical parameters across historical time-series intervals.
2. **Backend Evaluation Services**:
   - The Water Safety Evaluation engine ([`src/server/services/water-safety.ts`](src/server/services/water-safety.ts)) and Purification Pipeline service continue calculating composite scores, confidence ratings, and quality gate states.
3. **Simulation Testbench**:
   - The simulator testbench retains full capabilities to inject Acid Mine Drainage (AMD), hydraulic pulse leaks, and sensor degradation scenarios for laboratory demonstrations.
4. **Instant Toggleability**:
   - Flipping `VITE_ENABLE_ALL_SENSORS=true` and `VITE_ENABLE_PURIFICATION=true` in `.env` instantly restores the full 9-parameter and 4-stage UI without requiring server restarts or database migrations.

---

## 6. How to Run the Prototype Profile

1. Ensure `.env` specifies the prototype feature flags:
   ```env
   VITE_ENABLE_PURIFICATION=false
   VITE_ENABLE_ALL_SENSORS=false
   ```
2. Start the development server using Bun:
   ```bash
   bun run dev
   ```
3. Access the web interface at `http://localhost:3000/`.
4. The station context will display **Node Zero — IIITD Pilot**, streaming live data for Turbidity, Temperature, Flow Rate, and Solenoid Shutoff Valve.

---

## 7. Demo Scenario Injector (Node Zero Hardware Alignment)

The interactive Demo Scenario Injector (`src/components/SimulatorDrawer.tsx` quick drawer and `src/routes/simulator.tsx` dedicated lab) has been updated to directly mirror Node Zero's physical capabilities:

### 7.1 Primary Node Zero Scenarios

1. **Nominal Safe Baseline (`NORMAL` / `SAFE`):**
   - Turbidity: $1.2\text{ NTU}$, Fluid Temp: $24.0^\circ\text{C}$, Flow Rate: $45\text{ L/min}$.
   - Evaluates: Score $100$, Gate `PASS`, Water Release `ALLOWED`, Solenoid Valve `OPEN`.
2. **Turbidity Spill & Solenoid Lockout (`UNSAFE_TURBIDITY` / `TURBIDITY_SPILL`):**
   - Ingress of heavy silt ($28.5\text{ NTU} > 5.0\text{ NTU}$ limit).
   - Evaluates: Score $35$, Gate `FAIL`, Water Release `BLOCKED`, 12V Solenoid Valve `CLOSED`.
   - Dispatches critical audit event: `Optical turbidity spike. Node Zero automated solenoid valve shutoff tripped.`
3. **Thermal Inflow Anomaly (`UNSAFE_TEMPERATURE` / `THERMAL_ANOMALY`):**
   - Water temperature rises to $43.5^\circ\text{C}$ (outside $15.0 - 35.0^\circ\text{C}$ envelope).
   - Generates warning alert: `Thermal intake anomaly: 43.5°C detected by Node Zero precision temperature probe.`
4. **15% Differential Mass-Balance Leak Detection (`LEAK` / `LEAK_DETECTED`):**
   - Outlet turbine drops to $31.5\text{ L/min}$ ($30.0\%$ mismatch $> 15.0\%$ threshold).
   - Evaluates: Gate `FAIL`, Leak `DETECTED`, Solenoid Valve `CLOSED (ISOLATED)`.
5. **Optical Turbidity Nephelometer Drift (`SENSOR_DRIFT` / `TURBIDITY_DRIFT`):**
   - Optical degradation of the nephelometer ($+3.6\text{ NTU}$ drift).
   - Degrades confidence to $73\%$ and prompts routine recalibration on the Devices page.
6. **Node Zero Offline (`DEVICE_OFFLINE`):**
   - Simulates microcontroller power loss or heartbeat timeout at IIITD.
   - Evaluates: Device state `OFFLINE`, fail-secure solenoid lockout.
7. **Node Zero Online (`DEVICE_ONLINE`):**
   - Restores edge node telemetry sync and heartbeat stream.
8. **Full System Baseline Reset (`RESET`):**
   - Clears active faults, opens solenoid valve, and restores pristine score ($100$).

### 7.2 Extended Multi-Stage Facility Suite (AMD & Heavy Industry)

Scenarios that evaluate chemical contaminants not present on Node Zero's physical sensor head (Toxic Heavy Metals $0.85\text{ ppm}$, Acidic $\text{pH } 4.2$, High TDS $850\text{ ppm}$, and Activated Carbon Filter Life Warning) are housed inside a collapsible **Extended Facility Scenarios** accordion in the drawer and segregated on the Simulator Lab page, ensuring presenters can focus entirely on Node Zero's physical sensors without confusing audiences.
