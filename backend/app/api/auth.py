from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import uuid
import json

from app.db.session import get_db
from app.db.models import User, Session, Model, AuditLog, UserDevice
from app.schemas.auth import UserRegister, UserLogin, UserOut, Token
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

async def get_current_user_and_session(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
) -> tuple[User, Session]:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth header")
        
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
        
    user_id = payload.get("sub")
    
    # Query user
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
        
    # Query active session
    session_res = await db.execute(
        select(Session).where(Session.user_id == user_id).order_by(Session.started_at.desc())
    )
    session = session_res.scalars().first()
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session not found")
        
    # Enforce Server-Side Lockout
    if session.locked:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED, 
            detail="Session has been locked due to high behavioral risk or failed verification."
        )
        
    return user, session

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    if not req.consent:
        raise HTTPException(status_code=400, detail="User consent is required for continuous behavioral verification.")
        
    # Check existing user
    res = await db.execute(select(User).where((User.username == req.username) | (User.email == req.email)))
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Username or email already registered.")
        
    user = User(
        username=req.username,
        email=req.email,
        password_hash=get_password_hash(req.password),
        consent=True,
        consent_at=datetime.now(timezone.utc)
    )
    db.add(user)
    await db.flush()
    
    # Create Session
    session_token = str(uuid.uuid4())
    session = Session(
        user_id=user.id,
        session_token=session_token,
        status="ACTIVE"
    )
    db.add(session)
    
    # Audit log
    audit = AuditLog(
        user_id=user.id,
        session_id=session.id,
        event_type="REGISTER",
        event_data_json=json.dumps({"username": user.username, "consent": True})
    )
    db.add(audit)
    await db.commit()
    
    access_token = create_access_token(user.id)
    user_out = UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        consent=user.consent,
        is_active=user.is_active,
        has_model=False,
        model_version=None,
        created_at=user.created_at
    )
    
    return Token(access_token=access_token, session_id=session.id, user=user_out)

@router.post("/login", response_model=Token)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.username == req.username))
    user = res.scalars().first()
    
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password.")
        
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled.")
        
    # Check if user has an active trained model
    model_res = await db.execute(
        select(Model).where(Model.user_id == user.id, Model.status == "ACTIVE").order_by(Model.created_at.desc())
    )
    model = model_res.scalars().first()
    
    # Create new clean session
    session_token = str(uuid.uuid4())
    session = Session(
        user_id=user.id,
        session_token=session_token,
        status="ACTIVE"
    )
    db.add(session)
    
    audit = AuditLog(
        user_id=user.id,
        session_id=session.id,
        event_type="LOGIN",
        event_data_json=json.dumps({"device": req.device_label, "has_model": bool(model)})
    )
    db.add(audit)
    await db.commit()
    
    access_token = create_access_token(user.id)
    user_out = UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        consent=user.consent,
        is_active=user.is_active,
        has_model=bool(model),
        model_version=model.version if model else None,
        created_at=user.created_at
    )
    
    return Token(access_token=access_token, session_id=session.id, user=user_out)

@router.get("/me", response_model=UserOut)
async def get_me(
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    model_res = await db.execute(
        select(Model).where(Model.user_id == user.id, Model.status == "ACTIVE").order_by(Model.created_at.desc())
    )
    model = model_res.scalars().first()
    
    return UserOut(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        consent=user.consent,
        is_active=user.is_active,
        has_model=bool(model),
        model_version=model.version if model else None,
        created_at=user.created_at
    )

@router.post("/logout")
async def logout(
    user_session: tuple[User, Session] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    user, session = user_session
    session.status = "TERMINATED"
    
    audit = AuditLog(
        user_id=user.id,
        session_id=session.id,
        event_type="LOGOUT",
        event_data_json=json.dumps({"timestamp": datetime.now(timezone.utc).isoformat()})
    )
    db.add(audit)
    await db.commit()
    return {"message": "Logged out successfully"}
