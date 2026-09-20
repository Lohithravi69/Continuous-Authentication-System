from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    consent: bool

class UserLogin(BaseModel):
    username: str
    password: str
    device_label: Optional[str] = "Desktop Web Browser"

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    consent: bool
    is_active: bool
    has_model: bool
    model_version: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    session_id: str
    user: UserOut
