from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class WSMessage(BaseModel):
    type: str
    data: Any
    timestamp: datetime
    account_id: Optional[str] = None
