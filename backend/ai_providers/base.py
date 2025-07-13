"""Base AI provider interfaces."""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class TextProcessingRequest(BaseModel):
    """Text processing request model."""
    text: str
    task_type: str  # "classify", "extract", "rewrite"
    context: Dict[str, Any] = {}


class TextProcessingResponse(BaseModel):
    """Text processing response model."""
    result: Dict[str, Any]
    confidence: float = 0.0
    processing_time: float = 0.0
    provider: str = ""
    model_used: str = ""


class VisionProcessingRequest(BaseModel):
    """Vision processing request model."""
    image_data: str  # Base64 encoded image
    task_type: str  # "caption", "objects", "hotspots"
    context: Dict[str, Any] = {}


class VisionProcessingResponse(BaseModel):
    """Vision processing response model."""
    caption: str = ""
    objects: List[str] = []
    hotspots: List[Dict[str, Any]] = []
    confidence: float = 0.0
    processing_time: float = 0.0
    provider: str = ""
    model_used: str = ""


class TextProvider(ABC):
    """Abstract base class for text processing providers."""
    
    @abstractmethod
    async def classify_document(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Classify document type and extract basic metadata."""
        pass
    
    @abstractmethod
    async def extract_structured_data(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Extract structured data from text."""
        pass
    
    @abstractmethod
    async def rewrite_to_ste(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Rewrite text to ASD-STE100 compliance."""
        pass

    @abstractmethod
    async def review_module(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Review text for grammar, STE compliance and logical consistency."""
        pass


class VisionProvider(ABC):
    """Abstract base class for vision processing providers."""
    
    @abstractmethod
    async def generate_caption(self, request: VisionProcessingRequest) -> VisionProcessingResponse:
        """Generate caption for image."""
        pass
    
    @abstractmethod
    async def detect_objects(self, request: VisionProcessingRequest) -> VisionProcessingResponse:
        """Detect objects in image."""
        pass
    
    @abstractmethod
    async def generate_hotspots(self, request: VisionProcessingRequest) -> VisionProcessingResponse:
        """Generate hotspot suggestions."""
        pass