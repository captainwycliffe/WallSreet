from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime
from app.models.notification import Platform


class PushTokenRegister(BaseModel):
    token: str
    platform: Platform


class PushTokenResponse(BaseModel):
    id: str
    token: str
    platform: Platform
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class NotificationLogResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    data: Optional[Dict[str, Any]] = None
    sent_at: datetime
    success: bool

    model_config = ConfigDict(from_attributes=True)
