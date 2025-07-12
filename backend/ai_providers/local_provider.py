"""Local provider implementation using local ML models."""

import os
import time
import base64
import io
from typing import Dict, Any, List

from PIL import Image
import torch
from torchvision import models, transforms
from sentence_transformers import SentenceTransformer, util
import language_tool_python

from .base import (
    TextProvider,
    VisionProvider,
    TextProcessingRequest,
    TextProcessingResponse,
    VisionProcessingRequest,
    VisionProcessingResponse,
)


class LocalTextProvider(TextProvider):
    """Local text processing provider leveraging sentence transformers."""

    def __init__(self, model: str | None = None):
        self.model_name = model or os.environ.get("TEXT_MODEL", "all-MiniLM-L6-v2")
        self.embedder = SentenceTransformer(self.model_name)
        self.tool = language_tool_python.LanguageTool("en-US")
        self.dm_descriptions = {
            "PROC": "Step by step maintenance procedure or instructions",
            "DESC": "General description or overview of a system",
            "IPD": "Parts catalog or illustrated parts data",
            "CIR": "Electrical circuits and wiring information",
            "SNS": "Service bulletins or service news",
            "WIR": "Wiring information or harness details",
            "GEN": "General technical information",
        }
        self.label_embeds = {
            k: self.embedder.encode(v) for k, v in self.dm_descriptions.items()
        }

    async def classify_document(self, request: TextProcessingRequest) -> TextProcessingResponse:
        """Classify document type and extract basic metadata using embeddings."""
        start_time = time.time()
        emb = self.embedder.encode(request.text[:1000])
        sims = {k: float(util.cos_sim(emb, v)) for k, v in self.label_embeds.items()}
        dm_type = max(sims, key=sims.get)
        title = request.text.split(".")[0][:50]
        result = {
            "dm_type": dm_type,
            "title": title,
            "confidence": sims[dm_type],
            "metadata": {"language": "en-US"},
        }
        return TextProcessingResponse(
            result=result,
            confidence=sims[dm_type],
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
        """Rewrite text applying language tool suggestions and simple rules."""
        start_time = time.time()
        text = request.text
        matches = self.tool.check(text)
        corrected = language_tool_python.utils.correct(text, matches)
        replacements = {
            "utilize": "use",
            "approximately": "about",
            "prior to": "before",
            "subsequent to": "after",
        }
        for k, v in replacements.items():
            corrected = corrected.replace(k, v)
        sentences = [s.strip() for s in corrected.split('.') if s.strip()]
        short_sentences = []
        for s in sentences:
            words = s.split()
            while len(words) > 20:
                short_sentences.append(" ".join(words[:20]))
                words = words[20:]
            short_sentences.append(" ".join(words))
        ste_text = '. '.join(short_sentences)
        score = 1.0 - len(matches) / max(len(text.split()), 1)
        result = {
            "rewritten_text": ste_text,
            "ste_score": round(score, 2),
            "improvements": [m.ruleId for m in matches],
            "warnings": [],
        }
        return TextProcessingResponse(
            result=result,
            confidence=score,
            processing_time=time.time() - start_time,
            provider="local",
            model_used=self.model_name,
        )


class LocalVisionProvider(VisionProvider):
    """Local vision processing provider using torchvision object detection."""

    def __init__(self, model: str | None = None):
        self.weights = models.detection.FasterRCNN_ResNet50_FPN_Weights.DEFAULT
        self.detector = models.detection.fasterrcnn_resnet50_fpn(weights=self.weights)
        self.detector.eval()
        self.transform = transforms.Compose([transforms.ToTensor()])
        self.model_name = "fasterrcnn_resnet50_fpn"

    def _predict(self, image: Image.Image):
        tensor = self.transform(image)
        with torch.no_grad():
            output = self.detector([tensor])[0]
        return output

    async def generate_caption(self, request: VisionProcessingRequest) -> VisionProcessingResponse:
        """Generate caption summarizing detected objects."""
        start_time = time.time()
        image_data = base64.b64decode(request.image_data)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        output = self._predict(image)
        labels = [self.weights.meta['categories'][int(i)] for i in output['labels']]
        unique = list(dict.fromkeys(labels))[:5]
        caption = "Image showing " + ", ".join(unique) if unique else "Image"
        return VisionProcessingResponse(
            caption=caption,
            confidence=float(output['scores'].max().item()) if len(output['scores']) > 0 else 0.0,
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
