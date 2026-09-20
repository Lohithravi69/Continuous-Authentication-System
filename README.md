# Privacy-Preserving Risk-Based Continuous User Authentication Using Keystroke Dynamics

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_+_Vite-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![Scikit-Learn](https://img.shields.io/badge/ML-One--Class_SVM-F7931E.svg?style=flat&logo=scikit-learn)](https://scikit-learn.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

> **Academic Final Year Project (FYP) — Version 2.0**  
> A continuous behavioral biometric authentication system that verifies active user identity through non-reversible keystroke timing dynamics without recording typed text.

---

## 🌟 Key Architecture & Features

1. **Privacy-First Timing Feature Extraction**:
   - Zero typed text or passwords stored.
   - Measures non-reversible statistical features: Dwell Hold Time ($T_{\text{hold}}$), Flight Down-to-Down ($T_{\text{DD}}$), Flight Up-to-Down ($T_{\text{UD}}$), common Digraph latencies, WPM, and Pause ratios.
2. **One-Class SVM Profile with Calibrated Risk Score ($0.0 - 1.0$)**:
   - Trains user-specific $RBF$ One-Class SVM on 3 enrollment sessions.
   - Calibrated sigmoid scaling translates decision distances into an application risk score.
3. **Decoupled Risk Policy Engine**:
   - 🟢 **Green (Risk < 0.40)**: Verified genuine behavior (30s clean typing decays strikes).
   - 🟡 **Yellow (0.40 ≤ Risk ≤ 0.70)**: Anomaly warning (+1 Strike).
   - 🔴 **Red (Risk > 0.70 or Strikes ≥ 2)**: High risk triggering Step-Up verification.
4. **15-Keystroke Threshold Gate & Idle Handling**:
   - 5-second windows with $< 15$ keys are tagged as `IDLE` with zero penalty.
5. **Step-Up Telemetry Isolation**:
   - Keystroke listener is paused during Step-Up modal input to prevent challenge typing from corrupting behavioral profiles.
6. **Server-Side Session Lockout**:
   - 3 consecutive failed verification attempts lock the session in PostgreSQL/SQLite (`sessions.locked = TRUE`).
7. **Empirical Biometric Benchmarking**:
   - Computes FAR, FRR, EER, and plots interactive ROC curves.

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Launch Full System (Single Command)
From the project root:
```bash
python run_full_system.py
```

* **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
* **Interactive API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧪 Running Automated Tests

Run the full end-to-end integration and behavioral pipeline test suite:
```bash
cd backend
python tests/test_full_pipeline.py
```

---

## 📂 Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/          # REST API endpoints (auth, enroll, telemetry, session, audit)
│   │   ├── core/         # Config, Argon2id & JWT security
│   │   ├── db/           # SQLAlchemy 10-table schema & session
│   │   ├── ml/           # Feature extractor, One-Class SVM trainer, risk engine, evaluator
│   │   ├── schemas/      # Pydantic request/response models
│   │   └── main.py       # FastAPI application
│   ├── models_store/     # User .joblib model artifacts
│   ├── tests/            # Automated test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # Navbar, SecurityBanner, StepUpModal, TelemetryDiagnostics, LockScreen
│   │   ├── context/      # AuthContext & state machine
│   │   ├── hooks/        # useKeystrokeCollector (5s buffer & pause protection)
│   │   ├── pages/        # Login, Register, EnrollmentWizard, Dashboard, EvaluationReport
│   │   ├── services/     # API client
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── run_full_system.py    # Single-command launcher
└── Documentation/        # Architecture, PRD, TRD, Schema, App Flow & UI/UX Docs
```
