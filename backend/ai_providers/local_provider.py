"""Local provider implementation for running models locally."""

import time
from typing import Dict, Any, List
from .base import (
    TextProvider,
    VisionProvider,
    TextProcessingRequest,
    TextProcessingResponse,
)
from .base import VisionProcessingRequest, VisionProcessingResponse
import json
import base64
from transformers import pipeline
from PIL import Image
import io


class LocalTextProvider(TextProvider):
    """Local text processing provider using on-premise models."""

    def __init__(self, model_name: str | None = None):
        self.model = (
            model_name or "Goekdeniz-Guelmez/Josiefied-Qwen3-30B-A3B-abliterated-v2"
        )
        self.generator = pipeline(
            "text-generation",
            model=self.model,
            trust_remote_code=True,
            device_map="auto",
        )

    async def classify_document(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Classify document type and extract basic metadata."""
        start_time = time.time()

        labels = [
            "procedure",
            "description",
            "parts data",
            "circuit",
            "service notice",
            "wiring",
            "general",
        ]
        prompt = (
            "Classify the following text into one of the labels: "
            + ", ".join(labels)
            + ". Respond with one label.\n\n"
            + request.text[:500]
        )
        completion = self.generator(prompt, max_new_tokens=8)[0]["generated_text"]
        label = completion.strip().split()[0].lower()
        mapping = {
            "procedure": "PROC",
            "description": "DESC",
            "parts data": "IPD",
            "circuit": "CIR",
            "service notice": "SNS",
            "wiring": "WIR",
            "general": "GEN",
        }
        dm_type = mapping.get(label, "GEN")

        # Extract title (first sentence or first 50 characters)
        title = (
            request.text.split(".")[0][:50]
            if "." in request.text
            else request.text[:50]
        )

        result = {
            "dm_type": dm_type,
            "title": title,
            "confidence": 0.8,
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
            "metadata": {
                "language": "en-US",
                "technical_domain": "general",
                "complexity": "intermediate",
            },
        }

        processing_time = time.time() - start_time

        return TextProcessingResponse(
            result=result,
            confidence=result["confidence"],
            processing_time=processing_time,
            provider="local",
            model_used=self.model,
        )

    async def extract_structured_data(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Extract structured data from text."""
        start_time = time.time()

        paragraphs = [p.strip() for p in request.text.split("\n\n") if p.strip()]
        sections = []
        for i, para in enumerate(paragraphs[:5]):
            prompt = f"Summarize the following text in one short paragraph:\n{para}\nSummary:"
            summary = (
                self.generator(prompt, max_new_tokens=80)[0]["generated_text"]
                .split("Summary:")[-1]
                .strip()
            )
            sections.append(
                {
                    "type": "paragraph",
                    "title": f"Section {i+1}",
                    "content": summary,
                    "level": 1,
                }
            )

        result = {
            "sections": sections,
            "references": [],
            "warnings": [],
            "cautions": [],
            "notes": [],
        }

        processing_time = time.time() - start_time

        return TextProcessingResponse(
            result=result,
            confidence=0.75,
            processing_time=processing_time,
            provider="local",
            model_used=self.caption_model,
        )

    async def rewrite_to_ste(
        self, request: TextProcessingRequest
    ) -> TextProcessingResponse:
        """Rewrite text to ASD-STE100 compliance."""
        start_time = time.time()

        prompt = (
            "Rewrite the following text in ASD-STE100 simplified English:\n"
            + request.text
            + "\nRewritten:"
        )
        generation = self.generator(prompt, max_new_tokens=120)[0]["generated_text"]
        ste_text = generation.split("Rewritten:")[-1].strip()

        result = {
            "rewritten_text": ste_text,
            "ste_score": 0.85,
            "improvements": ["Simplified vocabulary", "Shortened sentences"],
            "warnings": [],
        }

        processing_time = time.time() - start_time

        return TextProcessingResponse(
            result=result,
            confidence=result["ste_score"],
            processing_time=processing_time,
            provider="local",
            model_used=self.model,
        )


class LocalVisionProvider(VisionProvider):
    """Local vision processing provider using on-premise models."""

    def __init__(self, model_name: str | None = None, caption_model: str | None = None):
        self.model = model_name or "facebook/detr-resnet-50"
        self.caption_model = caption_model or "Qwen/Qwen-VL-Chat"
        self.captioner = pipeline(
            "image-to-text",
            model=self.caption_model,
            trust_remote_code=True,
            device_map="auto",
        )
        self.detector = pipeline("object-detection", model=self.model)

    async def generate_caption(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Generate caption for image."""
        start_time = time.time()

        image = Image.open(io.BytesIO(base64.b64decode(request.image_data)))
        caption = self.captioner(image)[0]["generated_text"]

        processing_time = time.time() - start_time

        return VisionProcessingResponse(
            caption=caption,
            confidence=0.70,
            processing_time=processing_time,
            provider="local",
            model_used=self.model,
        )

    async def detect_objects(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Detect objects in image."""
        start_time = time.time()

        image = Image.open(io.BytesIO(base64.b64decode(request.image_data)))
        dets = self.detector(image)
        objects = [d["label"] for d in dets]

        processing_time = time.time() - start_time

        return VisionProcessingResponse(
            objects=objects,
            confidence=0.65,
            processing_time=processing_time,
            provider="local",
            model_used=self.model,
        )

    async def generate_hotspots(
        self, request: VisionProcessingRequest
    ) -> VisionProcessingResponse:
        """Generate hotspot suggestions."""
        start_time = time.time()

        image = Image.open(io.BytesIO(base64.b64decode(request.image_data)))
        dets = self.detector(image)
        hotspots = []
        for det in dets[:5]:
            box = det["box"]
            hotspots.append(
                {
                    "x": box["xmin"],
                    "y": box["ymin"],
                    "width": box["xmax"] - box["xmin"],
                    "height": box["ymax"] - box["ymin"],
                    "description": det["label"],
                }
            )

        processing_time = time.time() - start_time

        return VisionProcessingResponse(
            hotspots=hotspots,
            confidence=0.60,
            processing_time=processing_time,
            provider="local",
            model_used=self.model,
        )
