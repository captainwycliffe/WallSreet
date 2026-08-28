from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class JournalCreate(BaseModel):
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    rating: Optional[int] = None
    lessons: Optional[str] = None
    setup_quality: Optional[int] = None

class JournalUpdate(JournalCreate):
    pass

class JournalResponse(BaseModel):
    id: str
    trade_id: str
    user_id: str
    notes: Optional[str]
    tags: Optional[List[str]]
    rating: Optional[int]
    lessons: Optional[str]
    setup_quality: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
