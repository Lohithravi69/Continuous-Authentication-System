from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class StepUpChallengeRequest(BaseModel):
    session_id: str
    password_or_answer: str

class StepUpChallengeResponse(BaseModel):
    success: bool
    message: str
    strike_count: int
    attempts_remaining: int
    session_locked: bool

class SessionLockRequest(BaseModel):
    session_id: str
    reason: Optional[str] = "MANUAL_OR_EXCEEDED_ATTEMPTS"

class SessionStatusResponse(BaseModel):
    session_id: str
    user_id: str
    status: str # ACTIVE, STEP_UP, LOCKED, TERMINATED
    risk_score: float
    strike_count: int
    locked: bool
    last_activity_at: datetime
