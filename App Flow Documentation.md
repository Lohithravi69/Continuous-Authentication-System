# App Flow & State Machine Documentation
## Privacy-Preserving Risk-Based Continuous Keystroke Authentication

**Document Version:** 2.0 (Hardened FYP Flow)  
**Status:** Approved Master Flow  

---

## 1. Master Application Flow Lifecycle

```
[User Arrives] ──► [Register / Login] ──► [Model Exists Check]
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼ (False)                                                       ▼ (True)
     [Phase 1: Enrollment]                                           [Phase 2: Active Monitoring]
               │                                                               │
     • Consent Modal                                                 • Rolling 5s capture buffer
     • 3 Typing Sessions                                             • ≥ 15-key threshold gate
     • Quality Sanity Check                                          • Score Normalization (0 - 1)
     • Train One-Class SVM                                           • Strike Counter & Decay (-1 / 30s)
     • Save v1.0 Artifact                                                      │
               │                                             ┌─────────────────┼─────────────────┐
               └──────────────────────►                      ▼                 ▼                 ▼
                                                        🟢 GREEN          🟡 YELLOW         🔴 RED
                                                        (Score < 0.40)    (0.40 - 0.70)     (Score > 0.70 or
                                                        Allow & Decay     +1 Strike         Strikes ≥ 2)
                                                                                                 │
                                                                                                 ▼
                                                                                   [Phase 3: Step-Up Auth]
                                                                                   • PAUSE Telemetry Listener
                                                                                   • Show Blocking Modal
                                                                                   • Verify Identity
                                                                                                 │
                                                                                   ┌─────────────┴─────────────┐
                                                                                   ▼ (Success)                 ▼ (Failure)
                                                                             [Reset Strikes]             [Retry (Max 3)]
                                                                             [Resume Telemetry]                │
                                                                             [Return to GREEN]           [3 Failed Tries]
                                                                                                               │
                                                                                                               ▼
                                                                                                       [Phase 4: Lockout]
                                                                                                       • Server-Side Lock
                                                                                                       • Revoke JWT
                                                                                                       • Show Lock Screen
```

---

## 2. Phase-by-Phase Technical Details

### Phase 1: Enrollment (Trust & Baseline Building)
1. **Consent Gate**: User checks *"I consent to anonymous keystroke timing collection (no text stored)"*.
2. **Typing Collector**: User types 3 paragraphs or 60-second text prompts.
3. **Quality Sanity Gate**:
   - `if backspaces / total_keys > 0.20` $ightarrow$ Reject & prompt retry.
   - `if paste_detected` $ightarrow$ Reject & clear buffer.
   - `if total_keys < 80` $ightarrow$ Request more typing.
4. **Model Creation**: FastAPI background task trains One-Class SVM + StandardScaler, stores `models/user_{id}_v1.pkl`, and sets `enroll_sessions.status = 'READY'`.

### Phase 2: Active Monitoring (The Silent Sentinel)
1. **Keystroke Listener**: React hook `useKeystrokeCollector` captures `keydown` and `keyup` in memory.
2. **5-Second Flush**:
   - `if keystrokes.length < 15`: Emit status `IDLE` (no backend request, zero strike penalty).
   - `if keystrokes.length >= 15`: Dispatch `POST /v1/telemetry/window` with timing arrays.
3. **Risk State Evaluation**:
   - `Risk < 0.40`: Green Banner (*"Security Active"*). If user stays green for $\ge 30$ seconds, decrement strike counter (`strikes = max(0, strikes - 1)`).
   - `0.40 <= Risk <= 0.70`: Yellow Banner (*"Unusual Typing Detected - Strike 1/2"*).
   - `Risk > 0.70` or `Strikes >= 2`: Transition to Red State.

### Phase 3: Step-Up Authentication (Identity Recovery)
1. **Critical Pause**: `setCaptureEnabled(false)` halts all background key listeners.
2. **Blocking Modal**: Screen blurs; modal prompts for Step-Up verification (re-enter password or fixed challenge phrase).
3. **Verification Branch**:
   - **Pass**: Strike counter resets to 0, modal closes, `setCaptureEnabled(true)` resumes telemetry, Green banner restores.
   - **Fail**: Increments attempt counter (`1/3`, `2/3`).
   - **3 Failures**: Client calls `POST /v1/session/lock`.

### Phase 4: Server-Side Lockout (Terminal State)
1. Backend updates PostgreSQL: `UPDATE sessions SET locked = TRUE, status = 'LOCKED' WHERE id = :session_id`.
2. Backend revokes active JWT token and writes `SESSION_LOCK` event to `audit_logs`.
3. Client displays permanent red Lockout Screen with instruction to re-authenticate or contact administrator.
