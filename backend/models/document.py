"""Document and Data Module models."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .base import BaseDocument, DMTypeEnum, ValidationStatus, SecurityLevel
import uuid


class UploadedDocument(BaseDocument):
    """Uploaded document model."""
    filename: str
    file_path: str
    mime_type: str
    file_size: int
    sha256_hash: str
    status: str = "uploaded"
    processing_status: str = "pending"
    metadata: Dict[str, Any] = {}


class ICN(BaseDocument):
    """Illustration Control Number model."""
    icn_id: str = Field(default_factory=lambda: f"ICN-{uuid.uuid4().hex[:8].upper()}")
    filename: str
    file_path: str
    sha256_hash: str
    mime_type: str
    caption: str = ""
    objects: List[str] = []
    hotspots: List[Dict[str, Any]] = []
    width: int = 0
    height: int = 0
    security_level: SecurityLevel = SecurityLevel.UNCLASSIFIED
    watermark_applied: bool = False


class DataModule(BaseDocument):
    """S1000D Data Module model."""
    dmc: str  # Data Module Code
    title: str
    dm_type: DMTypeEnum
    info_variant: str  # "00" for verbatim, "01" for STE
    content: str = ""
    xml_content: str = ""
    html_content: str = ""
    
    # References
    icn_refs: List[str] = []
    dm_refs: List[str] = []
    
    # Validation
    validation_status: ValidationStatus = ValidationStatus.RED
    validation_errors: List[str] = []
    xsd_valid: bool = False
    brex_valid: bool = False
    icn_valid: bool = False
    applicability_valid: bool = False
    ste_score: float = 0.0
    
    # Metadata
    source_document_id: str
    template_used: str = ""
    applicability: Dict[str, Any] = {}
    security_level: SecurityLevel = SecurityLevel.UNCLASSIFIED
    
    # Processing
    processing_status: str = "pending"
    processing_logs: List[Dict[str, Any]] = []


class ProcessingTask(BaseDocument):
    """Processing task model."""
    task_type: str  # "text", "vision", "validation", etc.
    input_data: Dict[str, Any]
    output_data: Dict[str, Any] = {}
    status: str = "pending"  # pending, processing, completed, failed
    error_message: str = ""
    processing_time: float = 0.0
    provider_used: str = ""
    
    # Audit
    prompt_hash: str = ""
    response_hash: str = ""
    audit_log: Dict[str, Any] = {}


class PublicationModule(BaseDocument):
    """Publication Module model."""
    pm_code: str
    title: str
    dm_list: List[str] = []  # List of DMC codes
    structure: Dict[str, Any] = {}  # Tree structure
    cover_data: Dict[str, Any] = {}
    status: str = "draft"
    
    # Export settings
    variants: List[str] = ["verbatim", "ste"]
    formats: List[str] = ["xml", "html", "pdf"]
    security_level: SecurityLevel = SecurityLevel.UNCLASSIFIED