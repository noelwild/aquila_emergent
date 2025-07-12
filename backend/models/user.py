from pydantic import BaseModel, Field
from datetime import datetime
from typing import List
import uuid


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    hashed_password: str
    roles: List[str] = Field(default_factory=list)
    disabled: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
