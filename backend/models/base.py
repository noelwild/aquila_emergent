"""Base models for Aquila S1000D-AI system."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class DMTypeEnum(str, Enum):
    """Data Module types as per S1000D specification."""

    PROC = "PROC"  # Procedures
    DESC = "DESC"  # Descriptions
    IPD = "IPD"  # Illustrated Parts Data
    CIR = "CIR"  # Circuits
    SNS = "SNS"  # Service Notices
    WIR = "WIR"  # Wiring
    GEN = "GEN"  # General


class ProviderEnum(str, Enum):
    """AI Provider types."""

    LOCAL = "local"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class ValidationStatus(str, Enum):
    """Validation status for LEDs."""

    GREEN = "green"
    AMBER = "amber"
    RED = "red"
    BLUE = "blue"


class SecurityLevel(str, Enum):
    """Security classification levels."""

    UNCLASSIFIED = "UNCLASSIFIED"
    CONFIDENTIAL = "CONFIDENTIAL"
    SECRET = "SECRET"
    TOP_SECRET = "TOP_SECRET"


class BaseDocument(BaseModel):
    """Base document model."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}


class SettingsModel(BaseDocument):
    """System settings model."""

    text_provider: ProviderEnum = ProviderEnum.OPENAI
    text_model: str = "gpt-4o-mini"
    vision_provider: ProviderEnum = ProviderEnum.OPENAI
    vision_model: str = "gpt-4o-mini"
    security_level: SecurityLevel = SecurityLevel.UNCLASSIFIED
    default_language: str = "en-US"
    dmc_policy: str = "default"
    brex_rules: Dict[str, Any] = {}
    templates: Dict[str, Any] = {}
