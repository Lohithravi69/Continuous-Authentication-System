from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.schemas.enrollment import RawWindowPayload

class TelemetryWindowRequest(BaseModel):
    session_id: str
    window_index: int
    payload: RawWindowPayload

class FeatureSummary(BaseModel):
    dwell_mean_ms: float
    dwell_std_ms: float
    flight_dd_mean_ms: float
    flight_ud_mean_ms: float
    wpm: float
    n_keystrokes: int

class TelemetryWindowResponse(BaseModel):
    decision: str # ALLOW, WARN, STEP_UP, IDLE
    risk_score: float # 0.0 to 1.0
    raw_anomaly_score: float
    strike_count: int
    state: str # GREEN, YELLOW, RED
    message: str
    features: Optional[FeatureSummary] = None
    session_locked: bool = False
