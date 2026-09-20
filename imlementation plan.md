# Implementation Plan & Team Sprint Roadmap
## 6–8 Week Accelerated FYP Sprint Schedule

**Document Version:** 2.0 (Finalized Execution Plan)  
**Milestones:** 4 Critical Sprints (Core P0 $ightarrow$ Hardening P1 $ightarrow$ Evaluation)  

---

## Sprint 1: Foundation, Database & Primary Auth (Weeks 1–2)
**Goal:** Deliver a working full-stack system with user authentication, database persistence, and session tracking.

### Tasks:
1. Initialize project repository with Docker Compose (PostgreSQL 15 + FastAPI + React).
2. Implement 10 PostgreSQL tables via SQLAlchemy migrations (`users`, `sessions`, `windows`, etc.).
3. Build `/v1/auth/register`, `/v1/auth/login`, and `/v1/auth/logout` with Argon2id and JWT.
4. Implement server-side session lock check middleware (`if session.locked: raise 423`).
5. Build React App Shell with Login/Register views and authenticated route guard.

**Milestone 1:** A user can register, log in, view the dashboard, and have an active session tracked in PostgreSQL.

---

## Sprint 2: Enrollment & Feature Engineering Pipeline (Weeks 3–4)
**Goal:** Capture typing dynamics, extract non-text timing features, and train the baseline One-Class SVM.

### Tasks:
1. Build React Enrollment Wizard (consent modal, progress bar, 3-session typing prompts).
2. Build Python Feature Extraction Engine in backend (`dwell_mean`, `dwell_std`, `flight_dd`, `flight_ud`, `digraphs`, `wpm`).
3. Add Enrollment Quality Filters (reject windows with $>20\%$ backspaces or paste events).
4. Implement `/v1/enroll/submit` and `/v1/enroll/complete` endpoints.
5. Train One-Class SVM + `StandardScaler` using `scikit-learn` and save artifact as `models/user_{id}_v1.pkl`.

**Milestone 2:** User can complete enrollment, and a personalized `.pkl` model artifact is trained and registered in DB.

---

## Sprint 3: Active Monitoring, Risk Engine & Step-Up (Weeks 5–6)
**Goal:** Live continuous telemetry evaluation, strike counter, and step-up challenge modal.

### Tasks:
1. Implement React `useKeystrokeCollector` hook with 5-second buffer and $\ge 15$ keystroke gate.
2. Build `/v1/telemetry/window` endpoint to score live windows against user's One-Class SVM model.
3. Implement calibrated Score Normalization ($0.0 - 1.0$ Risk Score) and Risk Policy Engine.
4. Build Dynamic Security Banner (Green / Yellow / Red states).
5. Build Step-Up Modal with **explicit telemetry pause (`captureEnabled = false`)**.
6. Implement Strike Decay ($-1$ strike per 30s clean typing) and 3-strike server-side session lockout.

**Milestone 3:** Live typing dynamically changes banner color; typing erratically or using an impostor triggers Step-Up; 3 failed verifications locks the session.

---

## Sprint 4: Empirical Evaluation, Impostor Testing & Report (Weeks 7–8)
**Goal:** Collect empirical benchmark data, generate thesis graphs, and finalize documentation.

### Tasks:
1. Collect multi-session genuine typing data from 15–20 participants.
2. Run automated Impostor Evaluation script (testing user models against cross-user typing).
3. Compute quantitative metrics: **FAR, FRR, EER, Detection Delay, and Scoring Latency**.
4. Generate ROC Curves and Genuine vs. Impostor Score Distribution plots.
5. Finalize FYP Thesis Report, slides, and live demonstration sandbox.

**Milestone 4:** Full academic thesis completed with empirical ROC/EER charts and working defense demo.
