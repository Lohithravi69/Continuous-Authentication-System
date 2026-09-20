# Technical Requirements Document (TRD)
## Privacy-Preserving Risk-Based Continuous User Authentication Using Keystroke Dynamics

**Document Version:** 2.0 (Finalized & Hardened)  
**Status:** Approved Technical Architecture  

---

## 1. System Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (Vite / TS)                      │
│                                                                        │
│   ┌───────────────────┐    ┌────────────────────┐    ┌──────────────┐  │
│   │ Enrollment Wizard │    │ Keystroke Collector│    │Step-Up Modal │  │
│   │ (3-Session Task)  │    │ (5s Buffer / ≥15k) │    │(Pause Guard) │  │
│   └─────────┬─────────┘    └──────────┬─────────┘    └──────┬───────┘  │
└─────────────┼─────────────────────────┼─────────────────────┼──────────┘
              │                         │                     │
              │ POST /v1/enroll/submit  │ POST /v1/telemetry  │ POST /v1/stepup
              ▼                         ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND API                           │
│                                                                        │
│   ┌───────────────────┐    ┌────────────────────┐    ┌──────────────┐  │
│   │ Auth & JWT Guard  │    │ Feature Extraction │    │ Risk Policy  │  │
│   │ (Argon2id / Sess) │    │ (Dwell, Flight...) │    │ & Strikes    │  │
│   └─────────┬─────────┘    └──────────┬─────────┘    └──────┬───────┘  │
└─────────────┼─────────────────────────┼─────────────────────┼──────────┘
              │                         │                     │
              │ Reads / Writes          │ Runs Inference      │ Writes Logs
              ▼                         ▼                     ▼
   ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐
   │ PostgreSQL Database  │  │ Scikit-learn Worker  │  │  Audit Logs  │
   │ (10 Normalized Tables│  │ (One-Class SVM .pkl) │  │  & Alerts    │
   └──────────────────────┘  └──────────────────────┘  └──────────────┘
```

---

## 2. Feature Extraction Mathematical Definitions

From raw keydown ($t_d$) and keyup ($t_u$) timestamps of keys $k_1, k_2, \dots, k_n$:

1. **Dwell Time ($T_{	ext{hold}}$)**:
   $$T_{	ext{hold}}(i) = t_u(i) - t_d(i)$$
   Features: Mean ($\mu_{	ext{dwell}}$), Std ($\sigma_{	ext{dwell}}$), Median, IQR.

2. **Down-to-Down Flight Time ($T_{	ext{DD}}$)**:
   $$T_{	ext{DD}}(i) = t_d(i+1) - t_d(i)$$
   Features: Mean ($\mu_{	ext{DD}}$), Std ($\sigma_{	ext{DD}}$).

3. **Up-to-Down Flight Time ($T_{	ext{UD}}$)**:
   $$T_{	ext{UD}}(i) = t_d(i+1) - t_u(i)$$
   Features: Mean ($\mu_{	ext{UD}}$), Std ($\sigma_{	ext{UD}}$).

4. **Typing Speed & Pause Statistics**:
   $$	ext{WPM} = rac{n_{	ext{keystrokes}} / 5}{\Delta t_{	ext{minutes}}}$$
   $$	ext{Pause Ratio} = rac{\sum 	ext{delays} > 500	ext{ms}}{\Delta t_{	ext{total}}}$$

5. **Top Common Digraph Latencies**: Timing for frequent pairs: `['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd']`.

---

## 3. ML Model & Risk Engine Algorithms

### Model: One-Class Support Vector Machine (One-Class SVM)
* **Kernel**: RBF (Radial Basis Function)
* **Hyperparameters**: $
u = 0.05$ (expected outlier fraction), $\gamma = 	ext{'scale'}$
* **Preprocessing**: `StandardScaler()` fit on user enrollment vectors.

### Calibrated Score Transformation:
The raw decision function $d = f(\mathbf{x})$ yields positive scores for inliers and negative scores for outliers.
The calibrated **Risk Score $R \in [0.0, 1.0]$** is calculated as:
$$R = rac{1}{1 + e^{lpha \cdot d}}$$
*(Where $lpha pprox 1.5 - 2.0$, calibrated during training so inlier median risk is $<0.20$ and outlier risk is $>0.75$).*

### Risk State Machine:
```python
def evaluate_risk(score: float, current_strikes: int, clean_duration_sec: int):
    if score < 0.40:
        # Low risk: check for strike decay
        new_strikes = max(0, current_strikes - 1) if clean_duration_sec >= 30 else current_strikes
        return "GREEN", new_strikes, "ALLOW"
    elif 0.40 <= score <= 0.70:
        # Medium risk: increment strike
        new_strikes = current_strikes + 1
        if new_strikes >= 2:
            return "RED", new_strikes, "STEP_UP"
        return "YELLOW", new_strikes, "WARN"
    else:
        # High risk: immediate step-up
        return "RED", current_strikes + 1, "STEP_UP"
```

---

## 4. API Endpoints Specification

| Method | Endpoint | Description | Key Request / Response Data |
| :--- | :--- | :--- | :--- |
| `POST` | `/v1/auth/register` | Register user with consent | `{ username, email, password, consent: true }` |
| `POST` | `/v1/auth/login` | Authenticate & create session | `{ username, password }` $ightarrow$ `{ access_token, model_status }` |
| `POST` | `/v1/enroll/start` | Initialize 3-session enrollment | `{ session_id }` $ightarrow$ `{ enroll_session_id, required_windows: 3 }` |
| `POST` | `/v1/enroll/submit` | Submit enrollment typing window | `{ enroll_session_id, raw_timings }` $ightarrow$ `{ quality: "ACCEPT", progress: "2/3" }` |
| `POST` | `/v1/enroll/complete`| Trigger One-Class SVM training | `{ enroll_session_id }` $ightarrow$ `{ model_version: "v1.0", status: "READY" }` |
| `POST` | `/v1/telemetry/window`| Send 5s active window ($\ge 15$ keys)| `{ session_id, window_index, raw_timings }` $ightarrow$ `{ risk_score, state: "GREEN" }` |
| `POST` | `/v1/session/stepup` | Submit step-up challenge | `{ session_id, challenge_response }` $ightarrow$ `{ verified: true, strikes: 0 }` |
| `POST` | `/v1/session/lock` | Server-side session termination | `{ session_id, reason: "3_STEPUP_FAILURES" }` $ightarrow$ `{ locked: true }` |
| `GET` | `/v1/audit/logs` | Fetch user audit trail | `Bearer JWT` $ightarrow$ `List[AuditLog]` |
