"""OpenAI provider implementation."""

import asyncio
import base64
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List

import openai
from dotenv import load_dotenv

from .base import (
    TextProcessingRequest,
    TextProcessingResponse,
    TextProvider,
    VisionProcessingRequest,
    VisionProcessingResponse,
    VisionProvider,
)

# Ensure environment variables are loaded even if the server did not call
# ``load_dotenv`` for some reason. We use ``override=True`` so that values in
# ``backend/.env`` replace any existing environment variables that may be empty
# in the current execution environment.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)


class OpenAITextProvider(TextProvider):
    """OpenAI text processing provider."""

    def __init__(self, model: str | None = None):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY environment variable not set. "
                "Ensure it is defined in backend/.env or the execution environment."
            )
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model or os.environ.get("TEXT_MODEL", "gpt-4o-mini")

    async def classify_document(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Classify document type and extract basic metadata."""
        start_time = time.time()

        prompt = f"""
        Analyze this text and classify it according to S1000D data module types.
        
        Text: {request.text[:2000]}...
        
        Respond in JSON format:
        {{
            "dm_type": "PROC|DESC|IPD|CIR|SNS|WIR|GEN",
            "title": "extracted title",
            "confidence": 0.95,
            "metadata": {{
                "language": "en-US",
                "technical_domain": "aviation|electronics|mechanical|general",
                "complexity": "basic|intermediate|advanced"
            }}
        }}
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500,
            )

            result = json.loads(response.choices[0].message.content)
            processing_time = time.time() - start_time

            return TextProcessingResponse(
                result=result,
                confidence=result.get("confidence", 0.0),
                processing_time=processing_time,
                provider="openai",
                model_used=self.model,
            )
        except Exception as e:
            return TextProcessingResponse(
                result={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="openai",
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
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2000,
            )

            result = json.loads(response.choices[0].message.content)
            processing_time = time.time() - start_time

            return TextProcessingResponse(
                result=result,
                confidence=0.85,
                processing_time=processing_time,
                provider="openai",
                model_used=self.model,
            )
        except Exception as e:
            return TextProcessingResponse(
                result={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="openai",
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
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1500,
            )

            result = json.loads(response.choices[0].message.content)
            processing_time = time.time() - start_time

            return TextProcessingResponse(
                result=result,
                confidence=result.get("ste_score", 0.0),
                processing_time=processing_time,
                provider="openai",
                model_used=self.model,
            )
        except Exception as e:
            return TextProcessingResponse(
                result={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="openai",
                model_used=self.model,
            )

    async def review_module(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Review text for grammar, STE compliance and logical consistency."""
        start_time = time.time()

        prompt = f"""
        Review the following S1000D data module content for grammar, clarity and STE compliance.
        Provide JSON as {{"issues": ["issue1", "issue2"], "suggested_text": "corrected text"}}.

        Content:\n{request.text}
        """

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1500,
            )

            result = json.loads(response.choices[0].message.content)
            processing_time = time.time() - start_time

            return TextProcessingResponse(
                result=result,
                confidence=1.0,
                processing_time=processing_time,
                provider="openai",
                model_used=self.model,
            )
        except Exception as e:
            return TextProcessingResponse(
                result={"error": str(e)},
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="openai",
                model_used=self.model,
            )


class OpenAIVisionProvider(VisionProvider):
    """OpenAI vision processing provider."""

    def __init__(self, model: str | None = None):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY environment variable not set. "
                "Ensure it is defined in backend/.env or the execution environment."
            )
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model or os.environ.get("VISION_MODEL", "gpt-4o-mini")

    async def generate_caption(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Generate caption for image."""
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Generate a technical caption for this image suitable for S1000D documentation. Focus on technical accuracy and clarity.",
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{request.image_data}"
                                },
                            },
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=200,
            )

            caption = response.choices[0].message.content
            processing_time = time.time() - start_time

            return VisionProcessingResponse(
                caption=caption,
                confidence=0.85,
                processing_time=processing_time,
                provider="openai",
                model_used=self.model,
            )
        except Exception as e:
            return VisionProcessingResponse(
                caption=f"Error generating caption: {str(e)}",
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="openai",
                model_used=self.model,
            )

    async def detect_objects(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Detect objects in image."""
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Identify and list all technical objects, components, and parts visible in this image. Return as a JSON array of object names.",
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{request.image_data}"
                                },
                            },
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=300,
            )

            content = response.choices[0].message.content
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
                provider="openai",
                model_used=self.model,
            )
        except Exception as e:
            return VisionProcessingResponse(
                objects=[],
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="openai",
                model_used=self.model,
            )

    async def generate_hotspots(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Generate hotspot suggestions."""
        start_time = time.time()

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": 'Identify key areas in this technical image that should have interactive hotspots. Return coordinates and descriptions in JSON format: [{"x": 100, "y": 150, "width": 50, "height": 30, "description": "component name"}]',
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{request.image_data}"
                                },
                            },
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=500,
            )

            content = response.choices[0].message.content
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
                provider="openai",
                model_used=self.model,
            )
        except Exception as e:
            return VisionProcessingResponse(
                hotspots=[],
                confidence=0.0,
                processing_time=time.time() - start_time,
                provider="openai",
                model_used=self.model,
            )
