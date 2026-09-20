from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class RawKeyEvent(BaseModel):
    key: str # Anonymized or key code identifier e.g. "KeyT", "KeyH"
    down_ts: float # Milliseconds timestamp
    up_ts: float # Milliseconds timestamp

class RawWindowPayload(BaseModel):
    events: List[RawKeyEvent]
    client_duration_ms: Optional[float] = 5000.0
    backspace_count: Optional[int] = 0
    paste_detected: Optional[bool] = False

class EnrollStartResponse(BaseModel):
    enroll_session_id: str
    required_windows: int
    windows_captured: int
    status: str
    prompt_text: str

class EnrollSubmitRequest(BaseModel):
    enroll_session_id: str
    window_index: int
    payload: RawWindowPayload

class EnrollSubmitResponse(BaseModel):
    enroll_session_id: str
    window_index: int
    quality: str # ACCEPT, REJECT_BACKSPACE, REJECT_PASTE, REJECT_TOO_SHORT
    windows_captured: int
    required_windows: int
    message: str
    is_ready_to_train: bool

class EnrollCompleteResponse(BaseModel):
    user_id: str
    model_version: str
    status: str
    n_training_samples: int
    message: str
