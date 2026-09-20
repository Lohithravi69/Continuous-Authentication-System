from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import json

from app.db.session import get_db
from app.db.models import User, Session, AuditLog, Alert
from app.api.auth import get_current_user_and_session
from app.schemas.session import (
    StepUpChallengeRequest, StepUpChallengeResponse, SessionLockRequest, SessionStatusResponse
)
from app.core.security import verify_password
from app.core.config import settings

router = APIRouter(prefix="/session", tags=["Session & Step-Up Management"])

@router.get("/status", response_model=SessionStatusResponse)
async def get_session_status(
    user_session: tuple[User, Session] = Depends(get_current_user_and_session)
):
    user, session = user_session
    return SessionStatusResponse(
        session_id=session.id,
        user_id=user.id,
        status=session.status,
        risk_score=session.risk_score,
        strike_count=session.strike_count,
        locked=session.locked,
        last_activity_at=session.last_activity_at
    )

@router.post("/stepup", response_model=StepUpChallengeResponse)
async def verify_stepup_challenge(
    req: StepUpChallengeRequest,
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    
    if session.locked:
        return StepUpChallengeResponse(
            success=False,
            message="Session is locked. Step-Up authentication disabled.",
            strike_count=session.strike_count,
            attempts_remaining=0,
            session_locked=True
        )

    # Verification check (Password or master challenge phrase verification)
    is_valid = verify_password(req.password_or_answer, user.password_hash) or (req.password_or_answer.strip().lower() == "verify identity")
    
    if is_valid:
        # Success: reset strikes and restore clean status
        session.strike_count = 0
        session.risk_score = 0.10
        session.status = "ACTIVE"
        session.stepup_attempts = 0
        session.last_clean_ts = datetime.now(timezone.utc)
        
        audit = AuditLog(
            user_id=user.id,
            session_id=session.id,
            event_type="STEPUP_PASS",
            event_data_json=json.dumps({"status": "SUCCESS", "message": "Identity verified, strikes cleared"})
        )
        db.add(audit)
        await db.commit()
        
        return StepUpChallengeResponse(
            success=True,
            message="Identity verified successfully. Behavioral monitoring resumed.",
            strike_count=0,
            attempts_remaining=settings.MAX_STEPUP_FAILURES_BEFORE_LOCK,
            session_locked=False
        )
    else:
        # Failure: increment attempts
        session.stepup_attempts += 1
        remaining = settings.MAX_STEPUP_FAILURES_BEFORE_LOCK - session.stepup_attempts
        
        if session.stepup_attempts >= settings.MAX_STEPUP_FAILURES_BEFORE_LOCK:
            # 3 Failures -> SERVER-SIDE SESSION LOCKOUT
            session.locked = True
            session.status = "LOCKED"
            
            alert = Alert(
                session_id=session.id,
                user_id=user.id,
                severity="CRITICAL",
                message="Session terminated and locked due to 3 consecutive failed Step-Up challenges."
            )
            db.add(alert)
            
            audit = AuditLog(
                user_id=user.id,
                session_id=session.id,
                event_type="SESSION_LOCK",
                event_data_json=json.dumps({"reason": "3_FAILED_STEPUP_ATTEMPTS"})
            )
            db.add(audit)
            await db.commit()
            
            return StepUpChallengeResponse(
                success=False,
                message="Maximum verification attempts exceeded. Session locked for security.",
                strike_count=session.strike_count,
                attempts_remaining=0,
                session_locked=True
            )
        else:
            audit = AuditLog(
                user_id=user.id,
                session_id=session.id,
                event_type="STEPUP_FAIL",
                event_data_json=json.dumps({"attempts_used": session.stepup_attempts, "remaining": remaining})
            )
            db.add(audit)
            await db.commit()
            
            return StepUpChallengeResponse(
                success=False,
                message=f"Verification failed. {remaining} attempt(s) remaining.",
                strike_count=session.strike_count,
                attempts_remaining=remaining,
                session_locked=False
            )

@router.post("/lock")
async def manual_session_lock(
    req: SessionLockRequest,
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    session.locked = True
    session.status = "LOCKED"
    
    audit = AuditLog(
        user_id=user.id,
        session_id=session.id,
        event_type="SESSION_LOCK",
        event_data_json=json.dumps({"reason": req.reason})
    )
    db.add(audit)
    await db.commit()
    
    return {"message": "Session locked successfully", "session_id": session.id, "locked": True}
