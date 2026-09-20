from datetime import datetime, timezone
import uuid
import json
from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(128), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="user", nullable=False)
    consent = Column(Boolean, default=False, nullable=False)
    consent_at = Column(DateTime(timezone=True), nullable=True)
    data_retention_days = Column(Integer, default=90, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    devices = relationship("UserDevice", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    enroll_sessions = relationship("EnrollSession", back_populates="user", cascade="all, delete-orphan")
    models = relationship("Model", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")

class UserDevice(Base):
    __tablename__ = "user_devices"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    device_hash = Column(String(128), nullable=False)
    device_label = Column(String(128), nullable=True)
    last_seen = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="devices")

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    device_hash = Column(String(128), nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_activity_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)
    strike_count = Column(Integer, default=0, nullable=False)
    last_clean_ts = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    stepup_attempts = Column(Integer, default=0, nullable=False)
    status = Column(String(32), default="ACTIVE", nullable=False) # ACTIVE, STEP_UP, LOCKED, TERMINATED
    locked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="sessions")
    windows = relationship("Window", back_populates="session", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")

class EnrollSession(Base):
    __tablename__ = "enroll_sessions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    required_windows = Column(Integer, default=3, nullable=False)
    windows_captured = Column(Integer, default=0, nullable=False)
    status = Column(String(32), default="CAPTURING", nullable=False) # CAPTURING, COMPLETED, TRAINING, READY, FAILED
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="enroll_sessions")
    enroll_windows = relationship("EnrollWindow", back_populates="enroll_session", cascade="all, delete-orphan")

class EnrollWindow(Base):
    __tablename__ = "enroll_windows"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    enroll_session_id = Column(String(36), ForeignKey("enroll_sessions.id", ondelete="CASCADE"), nullable=False)
    window_index = Column(Integer, nullable=False)
    n_keystrokes = Column(Integer, nullable=False)
    features_json = Column(Text, nullable=False) # Serialized JSON
    quality = Column(String(32), default="ACCEPT", nullable=False) # ACCEPT, REJECT_BACKSPACE, REJECT_PASTE
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    enroll_session = relationship("EnrollSession", back_populates="enroll_windows")

class Window(Base):
    __tablename__ = "windows"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    window_index = Column(Integer, nullable=False)
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)
    n_keystrokes = Column(Integer, nullable=False)
    features_json = Column(Text, nullable=False) # Serialized JSON
    raw_score = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    decision = Column(String(32), nullable=False) # ALLOW, WARN, STEP_UP, IDLE
    model_version = Column(String(32), default="v1.0", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    session = relationship("Session", back_populates="windows")

class Model(Base):
    __tablename__ = "models"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    version = Column(String(32), default="v1.0", nullable=False)
    model_type = Column(String(64), default="OneClassSVM", nullable=False)
    artifact_path = Column(String(255), nullable=False)
    scaler_path = Column(String(255), nullable=False)
    n_training_samples = Column(Integer, nullable=False)
    status = Column(String(32), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="models")
    metrics = relationship("ModelMetric", back_populates="model", cascade="all, delete-orphan")

class ModelMetric(Base):
    __tablename__ = "model_metrics"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_id = Column(String(36), ForeignKey("models.id", ondelete="CASCADE"), nullable=False)
    metric_name = Column(String(64), nullable=False) # EER, FAR, FRR, ROC_AUC, LATENCY_P95
    metric_value = Column(Float, nullable=False)
    evaluation_dataset = Column(String(128), default="GENUINE_VS_IMPOSTOR", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    model = relationship("Model", back_populates="metrics")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(64), nullable=False) # LOGIN, ENROLL_START, WINDOW_EVAL, STRIKE_INC, STEPUP_TRIGGER, STEPUP_PASS, SESSION_LOCK
    event_data_json = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="audit_logs")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    severity = Column(String(32), default="INFO", nullable=False) # INFO, WARNING, CRITICAL
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="alerts")
    session = relationship("Session", back_populates="alerts")
