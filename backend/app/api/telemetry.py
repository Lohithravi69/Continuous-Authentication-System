from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import json
import numpy as np

from app.db.session import get_db
from app.db.models import User, Session, Window, AuditLog, Alert, Model
from app.api.auth import get_current_user_and_session
from app.schemas.telemetry import (
    TelemetryWindowRequest, TelemetryWindowResponse, FeatureSummary
)
from app.ml.feature_extractor import KeystrokeFeatureExtractor
from app.ml.model_trainer import ModelArtifactManager
from app.ml.risk_engine import RiskPolicyEngine
from app.core.config import settings

router = APIRouter(prefix="/telemetry", tags=["Active Telemetry & Monitoring"])

@router.post("/window", response_model=TelemetryWindowResponse)
async def process_telemetry_window(
    req: TelemetryWindowRequest,
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    now_ts = datetime.now(timezone.utc)
    events = req.payload.events
    n_keys = len(events)
    
    # 1. Check Minimum Keystroke Gate (15-key threshold)
    if n_keys < settings.MIN_KEYSTROKES_GATE:
        # User is reading, thinking, or typing very slowly -> tag as IDLE
        return TelemetryWindowResponse(
            decision="IDLE",
            risk_score=session.risk_score,
            raw_anomaly_score=0.0,
            strike_count=session.strike_count,
            state="GREEN" if session.strike_count == 0 else "YELLOW",
            message=f"Keystroke count ({n_keys}) below minimum gate ({settings.MIN_KEYSTROKES_GATE}). Telemetry idle, no penalty.",
            features=None,
            session_locked=session.locked
        )

    # 2. Extract Features
    feat_vec, feat_dict = KeystrokeFeatureExtractor.extract_features(
        events, duration_ms=req.payload.client_duration_ms or 5000.0
    )
    
    # 3. Model Scoring & Score Normalization
    try:
        raw_distance, risk_score = ModelArtifactManager.score_window(
            user_id=user.id,
            feature_vector=feat_vec,
            version="v1.0"
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=400, 
            detail="User behavioral profile not enrolled yet. Please complete enrollment first."
        )

    # 4. Decoupled Risk Policy Engine Evaluation
    state, decision, new_strikes, updated_clean_ts, msg = RiskPolicyEngine.evaluate(
        risk_score=risk_score,
        current_strikes=session.strike_count,
        last_clean_ts=session.last_clean_ts or session.started_at,
        now_ts=now_ts
    )
    
    # 5. Update Session State
    session.risk_score = round(risk_score, 3)
    session.strike_count = new_strikes
    session.last_clean_ts = updated_clean_ts
    session.last_activity_at = now_ts
    
    if decision == "STEP_UP":
        session.status = "STEP_UP"
    elif decision == "WARN":
        session.status = "ACTIVE"
    else:
        session.status = "ACTIVE"
        
    # 6. Record in Database: Windows table
    window_record = Window(
        session_id=session.id,
        user_id=user.id,
        window_index=req.window_index,
        window_start=datetime.fromtimestamp(events[0].down_ts / 1000.0, tz=timezone.utc) if events[0].down_ts > 1e11 else now_ts,
        window_end=now_ts,
        n_keystrokes=n_keys,
        features_json=json.dumps(feat_dict),
        raw_score=round(raw_distance, 4),
        risk_score=round(risk_score, 4),
        decision=decision,
        model_version="v1.0"
    )
    db.add(window_record)
    
    # Record Audit Log on notable events
    if decision in ["WARN", "STEP_UP"]:
        audit = AuditLog(
            user_id=user.id,
            session_id=session.id,
            event_type=f"WINDOW_{decision}",
            event_data_json=json.dumps({
                "window_index": req.window_index,
                "risk_score": risk_score,
                "strike_count": new_strikes,
                "decision": decision
            })
        )
        db.add(audit)
        
    await db.commit()
    
    feat_summary = FeatureSummary(
        dwell_mean_ms=feat_dict["dwell_mean"],
        dwell_std_ms=feat_dict["dwell_std"],
        flight_dd_mean_ms=feat_dict["flight_dd_mean"],
        flight_ud_mean_ms=feat_dict["flight_ud_mean"],
        wpm=feat_dict["wpm"],
        n_keystrokes=n_keys
    )
    
    return TelemetryWindowResponse(
        decision=decision,
        risk_score=round(risk_score, 3),
        raw_anomaly_score=round(raw_distance, 3),
        strike_count=new_strikes,
        state=state,
        message=msg,
        features=feat_summary,
        session_locked=session.locked
    )
