from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
import json

from app.db.session import get_db
from app.db.models import User, Session, AuditLog, Window, Alert
from app.api.auth import get_current_user_and_session

router = APIRouter(prefix="/audit", tags=["Audit & Governance"])

@router.get("/logs")
async def get_audit_logs(
    limit: int = 50,
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    res = await db.execute(
        select(AuditLog).where(AuditLog.user_id == user.id).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    logs = res.scalars().all()
    
    return [
        {
            "id": log.id,
            "event_type": log.event_type,
            "event_data": json.loads(log.event_data_json) if log.event_data_json else {},
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

@router.get("/windows")
async def get_window_history(
    limit: int = 20,
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    res = await db.execute(
        select(Window).where(Window.session_id == session.id).order_by(Window.created_at.desc()).limit(limit)
    )
    windows = res.scalars().all()
    
    return [
        {
            "id": w.id,
            "window_index": w.window_index,
            "raw_score": w.raw_score,
            "risk_score": w.risk_score,
            "decision": w.decision,
            "n_keystrokes": w.n_keystrokes,
            "features": json.loads(w.features_json) if w.features_json else {},
            "created_at": w.created_at.isoformat()
        }
        for w in reversed(windows)
    ]
