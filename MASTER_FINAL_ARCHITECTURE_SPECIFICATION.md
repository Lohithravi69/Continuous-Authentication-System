# Master Architecture & Technical Specification
## Privacy-Preserving Risk-Based Continuous User Authentication Using Keystroke Dynamics

**Status:** Finalized & Frozen Specification (v2.0)  
**Target:** Academic Final Year Project (FYP) & Robust Defense Prototype  
**Date:** August 2026  

---

## 1. Executive Summary & Core Concept
The **Continuous Authentication System** continuously verifies an authenticated user's identity using behavioral keystroke timing dynamics. 

During enrollment, the system collects keystroke timing characteristics (dwell time, flight time, digraph latencies, and pause ratios) **without storing typed plaintext or passwords**. These derived timing features train a personalized, user-specific **One-Class Support Vector Machine (One-Class SVM)** profile.

During active sessions, typing events are captured in **5-second windows** and validated against a **$\ge 15$ keystroke threshold** (preventing zero-division errors and idle-state skew). The backend extracts features and feeds them into the One-Class SVM. The raw model output is normalized to a $[0.0, 1.0]$ **Risk Score**.

An independent **Risk Policy Engine** maps this score to **Green (Allow)**, **Yellow (Warning / Strike +1)**, or **Red (Step-Up Challenge)** states. Crucially, **telemetry capture is paused during Step-Up verification** to prevent challenge inputs from contaminating the behavioral model. Three failed verification attempts trigger **server-side session termination and locking in PostgreSQL**. Every security transition is permanently written to an **Audit Log**.

System performance is evaluated rigorously using **FAR (False Acceptance Rate), FRR (False Rejection Rate), EER (Equal Error Rate), ROC-AUC, Detection Delay, and Scoring Latency**.

---

## 2. The 8-Stage System Architecture

```
1. AUTHENTICATION & LOGIN (Argon2id + JWT + PostgreSQL Session)
      ↓
2. CONSENT & ENROLLMENT CHECK (Has valid v1.0 Model Artifact?)
      │
   ┌──┴───────────────────────────────────────┐
   ▼ (No Model)                               ▼ (Model Ready)
3. ENROLLMENT WIZARD                      5. ACTIVE MONITORING LOOP
   • Multi-session typing tasks              • 5-second capture cadence
   • Privacy-first timing capture            • ≥ 15-keystroke minimum gate
   • Backspace & paste sanity filter         • Idle state detection
      ↓                                       ↓
4. FEATURE EXTRACTION & TRAINING          6. ANOMALY SCORING & RISK ENGINE
   • Dwell, Flight, Digraph extraction       • One-Class SVM inference
   • Standardization & Scaling               • Score normalization (0.0 - 1.0)
   • Train One-Class SVM (RBF kernel)        • Strike counter (+1 on anomaly)
   • Save artifact: models/user_{id}_v1.pkl   • Strike decay (-1 per 30s clean)
      │                                       ↓
      └───────────────────────────────────► 7. STEP-UP AUTHENTICATION
                                               • PAUSE telemetry listener
                                               • Blocking challenge modal
                                               • Pass: strike=0, resume capture
                                               • Fail: retry (3x max)
                                               • 3 Failures: Server-side Lock
                                              ↓
                                            8. ACCESS DECISION & AUDIT LOG
```

---

## 3. The Core Engineering Decoupling: ML Layer $
eq$ Policy Engine

A critical requirement of this architecture is the clean separation of responsibilities:

```
┌────────────────────────────────────────────────────────┐
│                        ML LAYER                        │
│   Question: "How abnormal is this typing window?"      │
│   • Input: Normalized feature vector (15-dim)          │
│   • Model: One-Class SVM (RBF kernel, nu=0.05)         │
│   • Output: Raw distance d = decision_function(X)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   SCORE NORMALIZATION                  │
│   Calibrated scaling: Raw distance → Risk Score [0, 1] │
│   Risk = 1.0 / (1.0 + exp(alpha * (d - threshold)))    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   RISK POLICY ENGINE                   │
│   Question: "What should the application do about it?" │
│   • Score < 0.40  → 🟢 LOW RISK   (Allow / Decay)      │
│   • 0.40 - 0.70   → 🟡 MED RISK   (+1 Strike)          │
│   • Score > 0.70  → 🔴 HIGH RISK  (Trigger Step-Up)    │
│   • Strikes ≥ 2   → 🔴 HIGH RISK  (Trigger Step-Up)    │
└────────────────────────────────────────────────────────┘
```

---

## 4. Priority Matrix (P0 / P1 / P2)

### 🔴 P0 — Core MVP (Must Work for Demo & Evaluation)
1. **User Authentication & Session Management**: Register, Login, Argon2id hashing, JWT session tracking, server-side session lock (`sessions.locked = true`).
2. **Behavioral Enrollment**: Consent capture, 3 typing sessions, timing feature extraction (Dwell, Flight, Digraphs), One-Class SVM training, model artifact generation (`models/user_{id}_v1.pkl`).
3. **Active Telemetry & Monitoring**: Client-side 5-second capture buffer, $\ge 15$ keystroke gate, HTTP POST window transmission.
4. **Decoupled Risk Engine**: One-Class SVM scoring, calibrated 0.0–1.0 risk normalization, strike counter, Green/Yellow/Red state transitions.
5. **Step-Up Verification with Telemetry Isolation**: Modal popup with explicit `captureEnabled = false` pause, verification retry counter, 3-strike lockout.
6. **PostgreSQL Audit Logging**: Immutable record of all logins, window scores, strikes, step-up attempts, and lockouts.

### 🟡 P1 — Hardening & Thesis Evaluation (Add After Core Works)
1. **Strike Decay**: $-1$ strike for every 30 seconds of sustained normal typing ($	ext{Risk} < 0.35$).
2. **Enrollment Quality Control**: Rejection of windows with $>20\%$ backspaces, paste events, or timing variance $<2	ext{ms}$.
3. **Model Readiness Routing Guard**: Automatic redirect to `/enrollment` if user logs in without a trained model.
4. **Evaluation Harness**: Impostor vs. genuine benchmarking script calculating **FAR, FRR, EER, and ROC curves**.

### 🟢 P2 — Future Work (Document in Report / Do Not Delay MVP)
* WebAuthn / Passkey Hardware Authenticators
* Distributed Redis JWT Blacklisting
* WebSocket streaming
* Deep Learning (LSTM / Transformers)
* Apache Kafka / Kubernetes / Cloud S3

---

## 5. Team Responsibilities & Ownership

| Team Role | Core Ownership & Deliverables | Assigned Tasks |
| :--- | :--- | :--- |
| **Member 1**<br>*(Frontend & Telemetry)* | React UI, Keystroke Collector Hook, State Machine | • Login & Register UI<br>• Enrollment typing tasks & progress bar<br>• 5s telemetry buffer & $\ge 15$-key gate<br>• Green/Yellow/Red visual banner<br>• Step-Up Modal with **telemetry pause**<br>• Session locked screen |
| **Member 2**<br>*(Backend & Database)* | FastAPI REST API, PostgreSQL Models, Session Lock | • Auth endpoints (`/register`, `/login`, `/logout`)<br>• Enrollment endpoints (`/enroll/start`, `/enroll/submit`, `/enroll/complete`)<br>• Window ingestion API (`/telemetry/window`)<br>• Step-up & session lock APIs (`/session/lock`)<br>• PostgreSQL schema migrations & audit logger |
| **Member 3**<br>*(ML & Feature Engineering)* | Python Preprocessing, One-Class SVM, Risk Engine | • Feature extractor (Dwell, Flight, Digraphs, Pauses)<br>• Data scaler & One-Class SVM trainer (`joblib`)<br>• Score normalizer (0.0 to 1.0 Risk)<br>• Strike counter & 30s decay logic<br>• Enrollment quality sanity filters |
| **Member 4**<br>*(Testing & Evaluation)* | Dataset Collection, Attack Simulator, Report Metrics | • Participant dataset collection (genuine sessions)<br>• Cross-user impostor attack test script<br>• Metric calculation: FAR, FRR, EER, Detection Delay<br>• ROC curves & Score Distribution plotting |

---

## 6. Technical Stack Summary

* **Frontend**: React (TypeScript) + Tailwind CSS / Vanilla CSS
* **Backend**: Python 3.11+ with FastAPI & Pydantic
* **ML Service**: Scikit-learn (One-Class SVM, StandardScaler), NumPy, SciPy
* **Database**: PostgreSQL (10 normalized tables)
* **Auth**: Argon2id password hashing + JWT + PostgreSQL session state
* **Deployment**: Docker Compose
