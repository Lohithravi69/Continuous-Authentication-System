# Final Backend Database Schema (FYP Version)
## Privacy-Preserving Continuous Keystroke Authentication System

**Database Engine:** PostgreSQL 15+  
**ORM:** SQLAlchemy 2.0 (Async) / SQLModel  
**Tables:** 10 Tables (Optimized for FYP MVP & Auditability)  

---

## 1. Entity-Relationship Overview

```
                         ┌─────────────┐
                         │    users    │
                         └──────┬──────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
       user_devices          sessions       enroll_sessions
                                │                  │
                                ▼                  ▼
                             windows        enroll_windows
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                 alerts     audit_logs    models
                                             │
                                             ▼
                                      model_metrics
```

---

## 2. Table Definitions (DDL)

### 1. `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'user' NOT NULL,
    consent BOOLEAN DEFAULT FALSE NOT NULL,
    consent_at TIMESTAMPTZ,
    data_retention_days INT DEFAULT 90 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 2. `user_devices`
```sql
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    device_hash VARCHAR(128) NOT NULL,
    device_label VARCHAR(128),
    last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 3. `sessions`
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_hash VARCHAR(128),
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    risk_score FLOAT DEFAULT 0.0 NOT NULL,
    strike_count INT DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE' NOT NULL, -- 'ACTIVE', 'STEP_UP', 'LOCKED', 'TERMINATED'
    locked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 4. `enroll_sessions`
```sql
CREATE TABLE enroll_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    required_windows INT DEFAULT 3 NOT NULL,
    windows_captured INT DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT 'CAPTURING' NOT NULL, -- 'CAPTURING', 'COMPLETED', 'TRAINING', 'READY'
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 5. `enroll_windows`
```sql
CREATE TABLE enroll_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enroll_session_id UUID REFERENCES enroll_sessions(id) ON DELETE CASCADE NOT NULL,
    window_index INT NOT NULL,
    n_keystrokes INT NOT NULL,
    features JSONB NOT NULL, -- {"dwell_mean": 0.085, "dwell_std": 0.012, "dd_mean": 0.118...}
    quality VARCHAR(32) DEFAULT 'ACCEPT' NOT NULL, -- 'ACCEPT', 'REJECT_BACKSPACE', 'REJECT_PASTE'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 6. `windows`
```sql
CREATE TABLE windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    window_index INT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    n_keystrokes INT NOT NULL,
    features JSONB NOT NULL,
    raw_score FLOAT NOT NULL,
    risk_score FLOAT NOT NULL,
    decision VARCHAR(32) NOT NULL, -- 'ALLOW', 'WARN', 'STEP_UP', 'IDLE'
    model_version VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 7. `models`
```sql
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    version VARCHAR(32) DEFAULT 'v1.0' NOT NULL,
    model_type VARCHAR(64) DEFAULT 'OneClassSVM' NOT NULL,
    artifact_path VARCHAR(255) NOT NULL, -- "models/user_123_v1.pkl"
    scaler_path VARCHAR(255) NOT NULL,   -- "models/user_123_v1_scaler.pkl"
    n_training_samples INT NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 8. `model_metrics`
```sql
CREATE TABLE model_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
    metric_name VARCHAR(64) NOT NULL, -- 'EER', 'FAR', 'FRR', 'ROC_AUC', 'LATENCY_P95'
    metric_value FLOAT NOT NULL,
    evaluation_dataset VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 9. `audit_logs`
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL, -- 'LOGIN', 'ENROLL_START', 'WINDOW_EVAL', 'STRIKE_INC', 'STEPUP_TRIGGER', 'STEPUP_PASS', 'SESSION_LOCK'
    event_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 10. `alerts`
```sql
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    severity VARCHAR(32) NOT NULL, -- 'INFO', 'WARNING', 'CRITICAL'
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```
