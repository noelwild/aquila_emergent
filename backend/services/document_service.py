"""Document processing service."""

import hashlib
import base64
import aiofiles
from typing import List, Dict, Any
from pathlib import Path
from PyPDF2 import PdfReader
from pptx import Presentation
from openpyxl import load_workbook
from PIL import Image
from docx import Document
from pdf2image import convert_from_path
from jinja2 import Environment, FileSystemLoader, select_autoescape
import xmlschema
import io
import asyncio
import uuid
import re

from ..models.document import UploadedDocument, ICN, DataModule, ProcessingTask
from ..models.base import DMTypeEnum
from ..ai_providers.provider_factory import ProviderFactory
from ..ai_providers.base import TextProcessingRequest, VisionProcessingRequest


class DocumentService:
    """Service for document processing and management."""

    def __init__(self, upload_path: str = "/tmp/aquila_uploads", settings: Any | None = None):
        self.upload_path = Path(upload_path)
        self.upload_path.mkdir(parents=True, exist_ok=True)
        self.icn_path = self.upload_path / "icns"
        self.icn_path.mkdir(parents=True, exist_ok=True)
        self.settings = settings
        backend_root = Path(__file__).resolve().parent.parent
        self.templates_path = backend_root / "templates"
        self.schema_path = backend_root / "schemas" / "simple_data_module.xsd"

    async def upload_document(self, file_data: bytes, filename: str, mime_type: str) -> UploadedDocument:
        """Upload and store a document."""
        sha256_hash = hashlib.sha256(file_data).hexdigest()
        file_id = str(uuid.uuid4())
        ext = Path(filename).suffix
        stored_name = f"{file_id}{ext}"
        file_path = self.upload_path / stored_name
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_data)
        return UploadedDocument(
            filename=filename,
            file_path=str(file_path),
            mime_type=mime_type,
            file_size=len(file_data),
            sha256_hash=sha256_hash,
            metadata={},
        )

    async def extract_text_from_document(self, document: UploadedDocument) -> str:
        """Extract text content from a document."""
        fp = Path(document.file_path)
        try:
            if document.mime_type == "application/pdf":
                return await self._extract_pdf_text(fp)
            if document.mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                return await self._extract_docx_text(fp)
            if document.mime_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                return await self._extract_pptx_text(fp)
            if document.mime_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                return await self._extract_xlsx_text(fp)
            if document.mime_type.startswith("text/"):
                return await self._extract_plain_text(fp)
            return ""
        except Exception as e:
            print(f"Error extracting text from {document.filename}: {e}")
            return ""

    async def _extract_pdf_text(self, file_path: Path) -> str:
        try:
            reader = PdfReader(str(file_path))
            return "".join(page.extract_text() + "\n" for page in reader.pages)
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return ""

    async def _extract_docx_text(self, file_path: Path) -> str:
        try:
            doc = await asyncio.to_thread(Document, str(file_path))
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            return "\n".join(paragraphs)
        except Exception as e:
            print(f"Error extracting DOCX text: {e}")
            return ""

    async def _extract_pptx_text(self, file_path: Path) -> str:
        try:
            prs = Presentation(str(file_path))
            text = ""
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
            return text
        except Exception as e:
            print(f"Error extracting PPTX text: {e}")
            return ""

    async def _extract_xlsx_text(self, file_path: Path) -> str:
        try:
            workbook = load_workbook(str(file_path))
            text = ""
            for sheet in workbook.worksheets:
                for row in sheet.iter_rows(values_only=True):
                    for cell in row:
                        if cell is not None:
                            text += str(cell) + " "
                    text += "\n"
            return text
        except Exception as e:
            print(f"Error extracting XLSX text: {e}")
            return ""

    async def _extract_plain_text(self, file_path: Path) -> str:
        try:
            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                return await f.read()
        except Exception as e:
            print(f"Error extracting plain text: {e}")
            return ""

    def _derive_lcn(self, name: str) -> str:
        match = re.search(r"(LCN-[A-Za-z0-9_-]+)", name, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        return f"LCN-{uuid.uuid4().hex[:8].upper()}"

    async def extract_images_from_document(self, document: UploadedDocument) -> List[ICN]:
        if document.mime_type == "application/pdf":
            return await self._extract_pdf_images(document)
        if document.mime_type.startswith("image/"):
            return await self._process_single_image(document)
        return []

    async def _extract_pdf_images(self, document: UploadedDocument) -> List[ICN]:
        file_path = Path(document.file_path)
        icns: List[ICN] = []
        try:
            pages = await asyncio.to_thread(convert_from_path, str(file_path))
            for idx, img in enumerate(pages, start=1):
                filename = f"{file_path.stem}_page{idx}.png"
                out_path = self.icn_path / filename
                img.save(out_path, format="PNG")
                async with aiofiles.open(out_path, "rb") as f:
                    data = await f.read()
                sha256_hash = hashlib.sha256(data).hexdigest()
                width, height = img.size
                icns.append(
                    ICN(
                        filename=filename,
                        file_path=str(out_path),
                        sha256_hash=sha256_hash,
                        mime_type="image/png",
                        width=width,
                        height=height,
                        lcn=self._derive_lcn(filename),
                    )
                )
            return icns
        except Exception as e:
            print(f"Error extracting PDF images: {e}")
            try:
                placeholder = Image.new("RGB", (1, 1), color="white")
                filename = f"{file_path.stem}_page1.png"
                out_path = self.icn_path / filename
                placeholder.save(out_path, format="PNG")
                async with aiofiles.open(out_path, "rb") as f:
                    data = await f.read()
                sha256_hash = hashlib.sha256(data).hexdigest()
                icn = ICN(
                    filename=filename,
                    file_path=str(out_path),
                    sha256_hash=sha256_hash,
                    mime_type="image/png",
                    width=1,
                    height=1,
                    lcn=self._derive_lcn(filename),
                )
                icns.append(icn)
                return icns
            except Exception:
                return []

    async def _process_single_image(self, document: UploadedDocument) -> List[ICN]:
        try:
            async with aiofiles.open(document.file_path, "rb") as f:
                image_data = await f.read()
            image = Image.open(io.BytesIO(image_data))
            width, height = image.size
            return [
                ICN(
                    filename=document.filename,
                    file_path=document.file_path,
                    sha256_hash=document.sha256_hash,
                    mime_type=document.mime_type,
                    width=width,
                    height=height,
                    lcn=self._derive_lcn(document.filename),
                )
            ]
        except Exception as e:
            print(f"Error processing image: {e}")
            return []

    async def process_document_with_ai(self, document: UploadedDocument, text_content: str) -> List[DataModule]:
        text_provider = ProviderFactory.create_text_provider()
        try:
            classification = TextProcessingRequest(text=text_content, task_type="classify")
            class_response = await text_provider.classify_document(classification)
            if "error" in class_response.result:
                raise Exception(class_response.result["error"])

            extract_req = TextProcessingRequest(text=text_content, task_type="extract")
            extract_res = await text_provider.extract_structured_data(extract_req)
            if "error" in extract_res.result:
                raise Exception(extract_res.result["error"])

            refs = extract_res.result.get("references", [])
            dm_refs = [r["reference"] for r in refs if r.get("type") == "dm"]
            icn_refs = [self._derive_lcn(r["reference"]) for r in refs if r.get("type") in {"figure", "image", "table"}]

            verbatim = DataModule(
                dmc=self._generate_dmc(class_response.result),
                title=class_response.result.get("title", "Untitled Document"),
                dm_type=DMTypeEnum(class_response.result.get("dm_type", "GEN")),
                info_variant="00",
                content=text_content,
                source_document_id=document.id,
                processing_status="completed",
                dm_refs=dm_refs,
                icn_refs=icn_refs,
            )

            rewrite_req = TextProcessingRequest(text=text_content, task_type="rewrite")
            rewrite_res = await text_provider.rewrite_to_ste(rewrite_req)

            modules = [verbatim]
            if "error" not in rewrite_res.result:
                ste_dm = DataModule(
                    dmc=self._generate_dmc(class_response.result, variant="01"),
                    title=class_response.result.get("title", "Untitled Document"),
                    dm_type=DMTypeEnum(class_response.result.get("dm_type", "GEN")),
                    info_variant="01",
                    content=rewrite_res.result.get("rewritten_text", text_content),
                    source_document_id=document.id,
                    ste_score=rewrite_res.result.get("ste_score", 0.0),
                    processing_status="completed",
                    dm_refs=dm_refs,
                    icn_refs=icn_refs,
                )
                modules.append(ste_dm)
            return modules
        except Exception as e:
            print(f"Error processing document with AI: {e}")
            basic = DataModule(
                dmc=self._generate_dmc({"dm_type": "GEN", "title": document.filename}),
                title=document.filename,
                dm_type=DMTypeEnum.GEN,
                info_variant="00",
                content=text_content,
                source_document_id=document.id,
                processing_status="error",
                dm_refs=[],
                icn_refs=[],
            )
            return [basic]

    def _generate_dmc(self, classification_result: dict, variant: str = "00") -> str:
        cfg = (self.settings.dmc_defaults if self.settings else {})
        model_ident = cfg.get("model_ident", "AQUILA")
        system_diff = cfg.get("system_diff", "00")
        system_code = cfg.get("system_code", "000")
        sub_system_code = cfg.get("sub_system_code", "00")
        sub_sub_system_code = cfg.get("sub_sub_system_code", "00")
        assy_code = cfg.get("assy_code", "00")
        disassy_code = cfg.get("disassy_code", "00")
        disassy_code_variant = cfg.get("disassy_code_variant", "00")
        info_code = cfg.get("info_code", "000")
        info_code_variant = cfg.get("info_code_variant", "A")
        item_location_code = cfg.get("item_location_code", "A")
        learn_code = cfg.get("learn_code", "00")
        learn_event_code = cfg.get("learn_event_code", "00")
        return (
            f"DMC-{model_ident}-{system_diff}-{system_code}-{sub_system_code}-"
            f"{sub_sub_system_code}-{assy_code}-{disassy_code}-{disassy_code_variant}-"
            f"{info_code}-{info_code_variant}-{item_location_code}-{learn_code}-"
            f"{learn_event_code}-{variant}"
        )

    async def process_image_with_ai(self, icn: ICN) -> ICN:
        vision_provider = ProviderFactory.create_vision_provider()
        try:
            async with aiofiles.open(icn.file_path, "rb") as f:
                image_data = await f.read()
            image_base64 = base64.b64encode(image_data).decode("utf-8")
            caption_req = VisionProcessingRequest(image_data=image_base64, task_type="caption")
            caption_res = await vision_provider.generate_caption(caption_req)
            objects_req = VisionProcessingRequest(image_data=image_base64, task_type="objects")
            objects_res = await vision_provider.detect_objects(objects_req)
            hotspots_req = VisionProcessingRequest(image_data=image_base64, task_type="hotspots")
            hotspots_res = await vision_provider.generate_hotspots(hotspots_req)
            icn.caption = caption_res.caption
            icn.objects = objects_res.objects
            icn.hotspots = hotspots_res.hotspots
            return icn
        except Exception as e:
            print(f"Error processing image with AI: {e}")
            icn.caption = f"Error processing image: {e}"
            return icn

    def render_data_module_xml(self, module: DataModule) -> str:
        """Render a DataModule to XML using Jinja2 template."""
        env = Environment(
            loader=FileSystemLoader(str(self.templates_path)),
            autoescape=select_autoescape(["xml"]),
        )
        template = env.get_template("data_module.xml.j2")
        return template.render(module=module)

    def validate_xml(self, xml_str: str) -> bool:
        """Validate XML string against built-in XSD."""
        try:
            schema = xmlschema.XMLSchema(self.schema_path)
            return schema.is_valid(xml_str)
        except Exception:
            return False

