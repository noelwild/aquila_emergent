"""Anthropic provider implementation."""

import anthropic
import base64
import time
from typing import Dict, Any, List
from .base import (
    TextProvider,
    VisionProvider,
    TextProcessingRequest,
    TextProcessingResponse,
)
from .base import VisionProcessingRequest, VisionProcessingResponse
import os
import json
import asyncio


class AnthropicTextProvider(TextProvider):
    """Anthropic text processing provider."""

    def __init__(self, model_name: str | None = None):
        self.client = anthropic.AsyncAnthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        self.model = model_name or "claude-3-sonnet-20240229"

    async def classify_document(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Classify document type and extract basic metadata."""
        start_time = time.time()

        prompt = f"""
        Analyze the following text and determine the appropriate S1000D data
        module type. Also supply the Data Module Code (DMC) fields needed to
        build a valid S1000D DMC.

        Text: {request.text[:2000]}...

        Respond in JSON format:
        {{
            "dm_type": "PROC|DESC|IPD|CIR|SNS|WIR|GEN",
            "title": "extracted title",
            "confidence": 0.95,
            "model_ident": "AQLA",
            "system_diff": "00",
            "system_code": "000",
            "sub_system_code": "00",
            "sub_sub_system_code": "00",
            "assy_code": "00",
            "disassy_code": "00",
            "disassy_code_variant": "00",
            "info_code_variant": "A",
            "item_location_code": "A",
            "learn_code": "00",
            "learn_event_code": "00",
            "metadata": {{
                "language": "en-US",
                "technical_domain": "aviation|electronics|mechanical|general",
                "complexity": "basic|intermediate|advanced"
            }}
        }}
        """

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}],
            )

            result = json.loads(response.content[0].text)
            processing_time = time.time() - start_time

            return TextProcessingResponse(
                result=result,
                confidence=result.get("confidence", 0.0),
                processing_time=processing_time,
                provider="anthropic",
                model_used=self.model,
            )
        except Exception as e:
            return TextProcessingResponse(
                result={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="anthropic",
                model_used=self.model,
            )

    async def extract_structured_data(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Extract structured data from text."""
        start_time = time.time()

        prompt = f"""
        Extract structured data from this technical text for S1000D data module creation.
        
        Text: {request.text}
        
        Respond in JSON format:
        {{
            "sections": [
                {{
                    "type": "paragraph|list|table|figure",
                    "title": "section title",
                    "content": "extracted content",
                    "level": 1
                }}
            ],
            "references": [
                {{
                    "type": "figure|table|dm",
                    "reference": "Figure 1|Table 1|DMC-XXX",
                    "title": "reference title"
                }}
            ],
            "warnings": ["safety warning 1", "safety warning 2"],
            "cautions": ["caution 1", "caution 2"],
            "notes": ["note 1", "note 2"]
        }}
        """

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}],
            )

            result = json.loads(response.content[0].text)
            processing_time = time.time() - start_time

            return TextProcessingResponse(
                result=result,
                confidence=0.85,
                processing_time=processing_time,
                provider="anthropic",
                model_used=self.model,
            )
        except Exception as e:
            return TextProcessingResponse(
                result={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="anthropic",
                model_used=self.model,
            )

    async def rewrite_to_ste(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Rewrite text to ASD-STE100 compliance."""
        start_time = time.time()

        prompt = f"""
        Rewrite this technical text to comply with ASD-STE100 (Simplified Technical English) standards.
        
        Original text: {request.text}
        
        STE Requirements:
        - Use only approved words from the STE dictionary
        - Maximum sentence length: 20 words
        - Use active voice
        - Use simple present tense
        - Avoid complex grammatical structures
        - Use clear, unambiguous language
        
        Respond in JSON format:
        {{
            "rewritten_text": "STE compliant text",
            "ste_score": 0.92,
            "improvements": ["improvement 1", "improvement 2"],
            "warnings": ["warning if any"]
        }}
        """

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}],
            )

            result = json.loads(response.content[0].text)
            processing_time = time.time() - start_time

            return TextProcessingResponse(
                result=result,
                confidence=result.get("ste_score", 0.0),
                processing_time=processing_time,
                provider="anthropic",
                model_used=self.model,
            )
        except Exception as e:
            return TextProcessingResponse(
                result={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="anthropic",
                model_used=self.model,
            )


class AnthropicVisionProvider(VisionProvider):
    """Anthropic vision processing provider."""

    def __init__(self, model_name: str | None = None):
        self.client = anthropic.AsyncAnthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        self.model = model_name or "claude-3-sonnet-20240229"

    async def generate_caption(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Generate caption for image."""
        start_time = time.time()

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=200,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Generate a technical caption for this image suitable for S1000D documentation. Focus on technical accuracy and clarity.",
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": request.image_data,
                                },
                            },
                        ],
                    }
                ],
            )

            caption = response.content[0].text
            processing_time = time.time() - start_time

            return VisionProcessingResponse(
                caption=caption,
                confidence=0.85,
                processing_time=processing_time,
                provider="anthropic",
                model_used=self.model,
            )
        except Exception as e:
            return VisionProcessingResponse(
                caption=f"Error generating caption: {str(e)}",
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="anthropic",
                model_used=self.model,
            )

    async def detect_objects(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Detect objects in image."""
        start_time = time.time()

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=300,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Identify and list all technical objects, components, and parts visible in this image. Return as a JSON array of object names.",
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": request.image_data,
                                },
                            },
                        ],
                    }
                ],
            )

            content = response.content[0].text
            try:
                objects = json.loads(content)
                if not isinstance(objects, list):
                    objects = [content]
            except:
                objects = [content]

            processing_time = time.time() - start_time

            return VisionProcessingResponse(
                objects=objects,
                confidence=0.80,
                processing_time=processing_time,
                provider="anthropic",
                model_used=self.model,
            )
        except Exception as e:
            return VisionProcessingResponse(
                objects=[],
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="anthropic",
                model_used=self.model,
            )

    async def generate_hotspots(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Generate hotspot suggestions."""
        start_time = time.time()

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=500,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": 'Identify key areas in this technical image that should have interactive hotspots. Return coordinates and descriptions in JSON format: [{"x": 100, "y": 150, "width": 50, "height": 30, "description": "component name"}]',
                            },
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": request.image_data,
                                },
                            },
                        ],
                    }
                ],
            )

            content = response.content[0].text
            try:
                hotspots = json.loads(content)
                if not isinstance(hotspots, list):
                    hotspots = []
            except:
                hotspots = []

            processing_time = time.time() - start_time

            return VisionProcessingResponse(
                hotspots=hotspots,
                confidence=0.75,
                processing_time=processing_time,
                provider="anthropic",
                model_used=self.model,
            )
        except Exception as e:
            return VisionProcessingResponse(
                hotspots=[],
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="anthropic",
                model_used=self.model,
            )
