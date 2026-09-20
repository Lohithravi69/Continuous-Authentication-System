# UI / UX Design Documentation
## Continuous Keystroke Dynamics Authentication System

**Document Version:** 2.0 (FYP Ready)  
**Design Tokens & Component Specifications**  

---

## 1. Visual Design Tokens & Palette

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| **Brand Navy** | `#0F172A` | Background header, dark surface cards, primary text |
| **Primary Blue** | `#0284C7` | Active buttons, progress indicators, interactive highlights |
| **Security Green (Low Risk)** | `#10B981` | 🟢 Status banner (*"Security Active - Normal Behavior"*)|
| **Warning Yellow (Med Risk)**| `#F59E0B` | 🟡 Status banner (*"Unusual Typing Detected - Strike 1/2"*)|
| **Danger Red (High Risk)** | `#EF4444` | 🔴 Step-Up modal header, lockout screen, critical alerts |
| **Surface Dark** | `#1E293B` | Card backgrounds, telemetry tables |
| **Border Slate** | `#334155` | Subtle container borders |

---

## 2. Core UI Components

### A. The Dynamic Security Status Banner
Located at the top of the authenticated application shell:
* **Green State (`Risk < 0.40`)**:
  ```
  [ 🟢 Security Active | Profile: v1.0 | Status: Verified Normal (Risk: 0.12) ]
  ```
* **Yellow State (`0.40 ≤ Risk ≤ 0.70`)**:
  ```
  [ 🟡 Security Warning: Typing pattern variance detected | Strike 1 of 2 ]
  ```
* **Red State (`Risk > 0.70` or `Strikes ≥ 2`)**:
  ```
  [ 🔴 High Anomaly Detected | Triggering Identity Verification... ]
  ```

### B. Step-Up Verification Modal
* **Trigger**: Automatic on RED state.
* **UX Behavior**: Backdrop blur (`backdrop-blur-md`), non-dismissible (no `Escape` key, no background click dismiss).
* **Telemetry Protection**: Background listener completely disabled while modal is open.
* **Controls**:
  - Challenge input field (clean styling, autofocus).
  - *"Verify Identity"* primary action button.
  - Attempt indicator: *"Attempt 1 of 3 (Session will lock after 3 failures)"*.

### C. Live Telemetry & Evaluation Diagnostics Widget
For examiners and demonstration purposes (accessible via dashboard toggle):
* Live WPM speedometer gauge.
* Rolling 5-second keystroke sparkline.
* Current Dwell Time Mean & Flight Time Mean displays.
* Anomaly Risk Score meter $[0.0 \dots 1.0]$.
* Active strike badges (`[●][○]`).

### D. Terminal Lockout Screen
* Full-screen blocking view replacing application shell.
* Red shield icon with message: *"Security Lockdown: Anomalous session behavior detected and verification failed."*
* Primary button: *"Return to Login"*.
