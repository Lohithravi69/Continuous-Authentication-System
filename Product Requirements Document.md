# Product Requirements Document (PRD)
## Privacy-Preserving Risk-Based Continuous User Authentication Using Keystroke Dynamics

**Document Version:** 2.0 (Finalized & Hardened)  
**Status:** Approved Specification  
**Scope:** Core MVP + Academic Research Evaluation  

---

## 1. Problem Statement & Objective
Traditional authentication mechanisms (passwords, OTPs, SMS codes) verify identity only at initial login. Once logged in, the session remains vulnerable to session hijacking, device theft, and unauthorized secondary users.

This project delivers a **privacy-preserving, continuous behavioral authentication layer** that passively monitors keystroke timing dynamics throughout an active session. It calculates an evolving behavioral risk score and triggers automated security interventions (Allow, Warn, Step-Up Challenge, or Lockout) when typing patterns deviate from the enrolled baseline.

---

## 2. Privacy-First Principle (Core Requirement)
To protect user privacy and comply with biometric ethical standards:
1. **Zero Text Retention**: The system **never** captures, logs, or stores raw alphanumeric characters, typed sentences, or sensitive inputs.
2. **Derived Timing Only**: The browser collector only extracts non-reversible temporal dynamics:
   - **Dwell Time ($T_{	ext{hold}}$)**: Time a single key remains depressed ($t_{	ext{keyup}} - t_{	ext{keydown}}$).
   - **Flight Time / Down-to-Down ($T_{	ext{DD}}$)**: Time elapsed between pressing key $i$ and pressing key $i+1$.
   - **Up-to-Down ($T_{	ext{UD}}$)**: Time elapsed between releasing key $i$ and pressing key $i+1$.
   - **Digraph Latency**: Flight times between high-frequency key pairs (e.g., `th`, `er`, `in`).
   - **Typing Velocity & Pauses**: Keystrokes per minute and pauses $>500	ext{ms}$.

---

## 3. Functional Requirements

### FR-1: Authentication & Consent
* System shall register users with Argon2id password hashing.
* System shall record explicit user consent before behavioral data collection begins.
* System shall check if an enrolled model exists upon login; if missing, redirect to `/enrollment`.

### FR-2: Behavioral Enrollment
* User completes 3 typing sessions of predefined neutral text (or free text $\ge 60$ seconds).
* System applies enrollment quality control: rejects windows with $>20\%$ backspaces or paste events.
* Backend computes feature vectors, trains a One-Class SVM, and saves artifact as `models/user_{id}_v1.pkl`.

### FR-3: Active Session Monitoring
* Frontend collects keystroke timestamps in rolling 5-second windows.
* Minimum Keystroke Gate: Windows with $<15$ keystrokes are flagged as `IDLE` and bypassed (no penalty).
* Windows with $\ge 15$ keystrokes are posted to `/v1/telemetry/window`.

### FR-4: Risk Policy & Strike Engine
* Backend calculates anomaly score and normalizes it to a $[0.0, 1.0]$ Risk Score.
* **Low Risk ($<0.40$)**: Green state. Sustained 30s clean typing reduces strike count by 1.
* **Medium Risk ($0.40 - 0.70$)**: Yellow state. Increments strike counter by $+1$.
* **High Risk ($>0.70$ or Strikes $\ge 2$)**: Red state. Triggers Step-Up Authentication.

### FR-5: Step-Up Authentication & Telemetry Isolation
* System renders a blocking verification modal.
* **Crucial Rule**: The client keystroke listener MUST pause (`captureEnabled = false`) during Step-Up to prevent challenge input from corrupting behavioral profiles.
* Step-Up Pass: Strikes reset to 0, session returns to Green, telemetry resumes.
* Step-Up Fail: Retry counter increments (up to 3 attempts).
* 3 Failures: Server marks session locked (`sessions.locked = true`), terminates JWT, and logs user out.

### FR-6: Audit & Logging
* Immutable database log of all authentication events, window scores, warnings, challenges, and locks.

---

## 4. Non-Functional Requirements & Evaluation Metrics

| Metric | Target / Requirement | Verification Method |
| :--- | :--- | :--- |
| **FAR (False Acceptance Rate)** | Research Target $\le 5 - 7\%$ | Evaluated with cross-user impostor typing sessions. |
| **FRR (False Rejection Rate)** | Target $\le 8 - 10\%$ | Evaluated with held-out genuine sessions. |
| **EER (Equal Error Rate)** | Research Benchmark $\le 7\%$ | Intersection of FAR and FRR curves across threshold sweeps. |
| **Detection Delay** | $\le 10 - 15	ext{ seconds}$ (2–3 windows) | Time elapsed from impostor takeover to Step-Up trigger. |
| **Scoring Latency** | P95 $< 100	ext{ms}$ | Backend inference + feature extraction turnaround time. |
| **Telemetry Payload Size** | $< 2	ext{ KB}$ per 5s window | Network payload efficiency. |
