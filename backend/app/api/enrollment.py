from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import json
import numpy as np

from app.db.session import get_db
from app.db.models import User, Session, EnrollSession, EnrollWindow, Model, AuditLog
from app.api.auth import get_current_user_and_session
from app.schemas.enrollment import (
    EnrollStartResponse, EnrollSubmitRequest, EnrollSubmitResponse, EnrollCompleteResponse
)
from app.ml.feature_extractor import KeystrokeFeatureExtractor, FEATURE_NAMES
from app.ml.model_trainer import ModelArtifactManager

router = APIRouter(prefix="/enroll", tags=["Behavioral Enrollment"])

SAMPLE_PROMPTS = [
    "Security is not a product, but a process. Continuous authentication verifies human identity without interrupting the user workflow.",
    "The quick brown fox jumps over the lazy dog while privacy preserving machine learning extracts timing patterns in real time.",
    "Behavioral biometrics evaluate natural typing rhythm and cognitive habit to protect sensitive accounts from unauthorized intrusion."
]

@router.post("/start", response_model=EnrollStartResponse)
async def start_enrollment(
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    
    # Create new EnrollSession
    enroll = EnrollSession(
        user_id=user.id,
        required_windows=3,
        windows_captured=0,
        status="CAPTURING"
    )
    db.add(enroll)
    
    audit = AuditLog(
        user_id=user.id,
        session_id=session.id,
        event_type="ENROLL_START",
        event_data_json=json.dumps({"enroll_session_id": enroll.id})
    )
    db.add(audit)
    await db.commit()
    
    return EnrollStartResponse(
        enroll_session_id=enroll.id,
        required_windows=enroll.required_windows,
        windows_captured=0,
        status="CAPTURING",
        prompt_text=SAMPLE_PROMPTS[0]
    )

@router.post("/submit", response_model=EnrollSubmitResponse)
async def submit_enroll_window(
    req: EnrollSubmitRequest,
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    
    # Query enrollment session
    res = await db.execute(select(EnrollSession).where(EnrollSession.id == req.enroll_session_id, EnrollSession.user_id == user.id))
    enroll = res.scalars().first()
    if not enroll:
        raise HTTPException(status_code=404, detail="Enrollment session not found.")
        
    if enroll.status not in ["CAPTURING", "IN_PROGRESS"]:
        raise HTTPException(status_code=400, detail=f"Enrollment session in status {enroll.status}")

    # 1. Quality Control Check
    is_valid, quality_code = KeystrokeFeatureExtractor.validate_quality(req.payload)
    if not is_valid:
        error_msgs = {
            "REJECT_TOO_SHORT": "Typing window too short. Please type more characters.",
            "REJECT_PASTE": "Pasting text is not permitted during behavioral enrollment.",
            "REJECT_BACKSPACE": "Too many backspaces/corrections detected. Please try typing smoothly.",
            "REJECT_INVALID_VARIANCE": "Keystroke rhythm variance too low. Synthetic/macro typing rejected."
        }
        return EnrollSubmitResponse(
            enroll_session_id=enroll.id,
            window_index=req.window_index,
            quality=quality_code,
            windows_captured=enroll.windows_captured,
            required_windows=enroll.required_windows,
            message=error_msgs.get(quality_code, "Invalid keystroke timing window."),
            is_ready_to_train=False
        )

    # 2. Extract Features
    feat_vec, feat_dict = KeystrokeFeatureExtractor.extract_features(
        req.payload.events, duration_ms=req.payload.client_duration_ms or 5000.0
    )
    
    # Save EnrollWindow
    enroll_win = EnrollWindow(
        enroll_session_id=enroll.id,
        window_index=req.window_index,
        n_keystrokes=len(req.payload.events),
        features_json=json.dumps(feat_dict),
        quality="ACCEPT"
    )
    db.add(enroll_win)
    
    enroll.windows_captured += 1
    if enroll.windows_captured >= enroll.required_windows:
        enroll.status = "COMPLETED"
        
    await db.commit()
    
    is_ready = enroll.windows_captured >= enroll.required_windows
    return EnrollSubmitResponse(
        enroll_session_id=enroll.id,
        window_index=req.window_index,
        quality="ACCEPT",
        windows_captured=enroll.windows_captured,
        required_windows=enroll.required_windows,
        message="Window successfully accepted and timing features extracted.",
        is_ready_to_train=is_ready
    )

@router.post("/complete", response_model=EnrollCompleteResponse)
async def complete_enrollment(
    enroll_session_id: str,
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    
    res = await db.execute(select(EnrollSession).where(EnrollSession.id == enroll_session_id, EnrollSession.user_id == user.id))
    enroll = res.scalars().first()
    if not enroll:
        raise HTTPException(status_code=404, detail="Enrollment session not found.")
        
    # Get all accepted windows
    win_res = await db.execute(
        select(EnrollWindow).where(EnrollWindow.enroll_session_id == enroll.id, EnrollWindow.quality == "ACCEPT")
    )
    windows = win_res.scalars().all()
    if len(windows) < enroll.required_windows:
        raise HTTPException(status_code=400, detail=f"Insufficient accepted windows ({len(windows)}/{enroll.required_windows}).")

    # Construct feature matrix
    feature_rows = []
    for w in windows:
        f_data = json.loads(w.features_json)
        row = [f_data.get(k, 0.0) for k in FEATURE_NAMES]
        feature_rows.append(row)
        
    X_train = np.array(feature_rows, dtype=np.float64)
    
    # Train One-Class SVM model
    model_path, scaler_path, stats = ModelArtifactManager.train_user_profile(
        user_id=user.id,
        feature_matrix=X_train,
        version="v1.0",
        nu=0.05
    )
    
    # Save Model record
    model_record = Model(
        user_id=user.id,
        version="v1.0",
        model_type="OneClassSVM",
        artifact_path=model_path,
        scaler_path=scaler_path,
        n_training_samples=stats["n_samples"],
        status="ACTIVE"
    )
    db.add(model_record)
    
    enroll.status = "READY"
    enroll.completed_at = datetime.now(timezone.utc)
    
    audit = AuditLog(
        user_id=user.id,
        session_id=session.id,
        event_type="MODEL_TRAINED",
        event_data_json=json.dumps(stats)
    )
    db.add(audit)
    await db.commit()
    
    return EnrollCompleteResponse(
        user_id=user.id,
        model_version="v1.0",
        status="READY",
        n_training_samples=stats["n_samples"],
        message="One-Class SVM behavioral profile successfully trained and deployed."
    )
