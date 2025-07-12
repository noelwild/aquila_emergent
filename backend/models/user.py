from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    hashed_password: str
    disabled: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
