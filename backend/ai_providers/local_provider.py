"""Local provider implementation using local ML models."""

import os
import time
import base64
import io
import json
from typing import Dict, Any, List

from PIL import Image
import torch
from torchvision import models, transforms
from transformers import pipeline

from .base import (
    TextProvider,
    VisionProvider,
    TextProcessingRequest,
    TextProcessingResponse,
    VisionProcessingRequest,
    VisionProcessingResponse,
)


class LocalTextProvider(TextProvider):
    """Local text processing provider using a Hugging Face transformer."""

    def __init__(self, model: str | None = None):
        self.model_name = model or os.environ.get(
            "TEXT_MODEL",
            "Goekdeniz-Guelmez/Josiefied-Qwen3-30B-A3B-abliterated-v2",
        )
        device = 0 if torch.cuda.is_available() else -1
        self.generator = pipeline(
            "text-generation", model=self.model_name, tokenizer=self.model_name, device=device
        )
        self.dm_types = ["PROC", "DESC", "IPD", "CIR", "SNS", "WIR", "GEN"]

    async def classify_document(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Classify document type using the local language model."""
        start_time = time.time()
        prompt = (
            "Classify this text according to S1000D data module types"
            " (PROC, DESC, IPD, CIR, SNS, WIR, GEN)."
            " Respond with JSON like {\"dm_type\":..., \"title\":..., \"confidence\":0.9, \"metadata\":{\"language\":\"en-US\"}}.\nText:\n"
            + request.text[:1000]
        )
        output = self.generator(prompt, max_new_tokens=200, do_sample=False)[0]["generated_text"]
        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        try:
            result = json.loads(output[json_start:json_end])
            confidence = result.get("confidence", 0.0)
        except Exception:
            result = {"dm_type": "GEN", "title": request.text.split(".")[0][:50], "confidence": 0.0, "metadata": {"language": "en-US"}}
            confidence = 0.0
        return TextProcessingResponse(
            result=result,
            confidence=confidence,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )

    async def extract_structured_data(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Extract simple sections and references from text."""
        start_time = time.time()
        lines = request.text.splitlines()
        sections: List[Dict[str, Any]] = []
        current = []
        for line in lines:
            if not line.strip():
                if current:
                    sections.append({
                        "type": "paragraph",
                        "title": f"Section {len(sections)+1}",
                        "content": " ".join(current),
                        "level": 1,
                    })
                    current = []
                continue
            if line.lstrip().startswith(('-', '*', '+')):
                sections.append({
                    "type": "list",
                    "title": f"List {len(sections)+1}",
                    "content": line.strip(),
                    "level": 1,
                })
            else:
                current.append(line.strip())
        if current:
            sections.append({
                "type": "paragraph",
                "title": f"Section {len(sections)+1}",
                "content": " ".join(current),
                "level": 1,
            })
        refs = []
        for line in lines:
            if "Figure" in line:
                refs.append({"type": "figure", "reference": line.strip(), "title": ""})
            if "DMC-" in line:
                refs.append({"type": "dm", "reference": line.strip(), "title": ""})
        result = {
            "sections": sections,
            "references": refs,
            "warnings": [],
            "cautions": [],
            "notes": [],
        }
        return TextProcessingResponse(
            result=result,
            confidence=0.75,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )

    async def rewrite_to_ste(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Rewrite text to ASD-STE100 using the language model."""
        start_time = time.time()
        prompt = (
            "Rewrite this technical text to comply with ASD-STE100."
            " Respond in JSON with fields rewritten_text, ste_score, improvements, warnings.\nText:\n"
            + request.text
        )
        output = self.generator(prompt, max_new_tokens=300, do_sample=False)[0]["generated_text"]
        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        try:
            result = json.loads(output[json_start:json_end])
            confidence = result.get("ste_score", 0.0)
        except Exception:
            result = {
                "rewritten_text": request.text,
                "ste_score": 0.0,
                "improvements": [],
                "warnings": ["parse_failed"],
            }
            confidence = 0.0
        return TextProcessingResponse(
            result=result,
            confidence=confidence,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )

    async def review_module(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Basic local review returning the original text as suggestion."""
        start_time = time.time()
        issues = []
        if len(request.text.split()) > 200:
            issues.append("module too long for local review")
        return TextProcessingResponse(
            result={"issues": issues, "suggested_text": request.text},
            confidence=0.0,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )


class LocalVisionProvider(VisionProvider):
    """Local vision processing provider using torchvision and Hugging Face models."""

    def __init__(self, model: str | None = None):
        self.weights = models.detection.FasterRCNN_ResNet50_FPN_Weights.DEFAULT
        self.detector = models.detection.fasterrcnn_resnet50_fpn(weights=self.weights)
        self.detector.eval()
        self.transform = transforms.Compose([transforms.ToTensor()])
        self.model_name = model or os.environ.get("VISION_MODEL", "Qwen/Qwen-VL-Chat")
        device = 0 if torch.cuda.is_available() else -1
        self.captioner = pipeline("image-to-text", model=self.model_name, device=device)

    def _predict(self, image: Image.Image):
        tensor = self.transform(image)
        with torch.no_grad():
            output = self.detector([tensor])[0]
        return output

    async def generate_caption(self, request: VisionProcessingRequest) -> VisionProcessingResponse:
        """Generate caption using a local vision-language model."""
        start_time = time.time()
        image_data = base64.b64decode(request.image_data)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        try:
            caption = self.captioner(image)[0]["generated_text"].strip()
            confidence = 0.9
        except Exception as e:
            caption = f"Error: {e}"
            confidence = 0.0
        return VisionProcessingResponse(
            caption=caption,
            confidence=confidence,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )

    async def detect_objects(self, request: VisionProcessingRequest) -> VisionProcessingResponse:
        start_time = time.time()
        image_data = base64.b64decode(request.image_data)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        output = self._predict(image)
        labels = [self.weights.meta['categories'][int(i)] for i in output['labels']]
        return VisionProcessingResponse(
            objects=labels,
            confidence=float(output['scores'].max().item()) if len(output['scores']) > 0 else 0.0,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )

    async def generate_hotspots(self, request: VisionProcessingRequest) -> VisionProcessingResponse:
        start_time = time.time()
        image_data = base64.b64decode(request.image_data)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        output = self._predict(image)
        hotspots = []
        for box, label in zip(output['boxes'], output['labels']):
            x1, y1, x2, y2 = [int(v) for v in box.tolist()]
            hotspots.append({
                "x": x1,
                "y": y1,
                "width": x2 - x1,
                "height": y2 - y1,
                "description": self.weights.meta['categories'][int(label)],
            })
        return VisionProcessingResponse(
            hotspots=hotspots,
            confidence=float(output['scores'].max().item()) if len(output['scores']) > 0 else 0.0,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )
