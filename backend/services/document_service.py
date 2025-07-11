"""Document processing service."""

import base64
import hashlib
import io
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiofiles
from openpyxl import load_workbook
from PIL import Image
from pptx import Presentation
from PyPDF2 import PdfReader

from ..ai_providers.base import TextProcessingRequest, VisionProcessingRequest
from ..ai_providers.provider_factory import ProviderFactory
from ..models.base import DMTypeEnum, ValidationStatus
from ..models.document import ICN, DataModule, ProcessingTask, UploadedDocument


class DocumentService:
    """Service for document processing and management."""

    def __init__(self, upload_path: str = "/tmp/aquila_uploads"):
        self.upload_path = Path(upload_path)
        self.upload_path.mkdir(parents=True, exist_ok=True)
        self.icn_path = self.upload_path / "icns"
        self.icn_path.mkdir(parents=True, exist_ok=True)
        # Load BREX rules
        brex_path = Path(__file__).parent.parent / "schemas" / "brex_rules.yaml"
        if brex_path.exists():
            import yaml

            with open(brex_path, "r", encoding="utf-8") as f:
                self.brex_rules = yaml.safe_load(f) or {}
        else:
            self.brex_rules = {}

    async def upload_document(
        self, file_data: bytes, filename: str, mime_type: str
    ) -> UploadedDocument:
        """Upload and process a document."""
        # Calculate SHA256 hash
        sha256_hash = hashlib.sha256(file_data).hexdigest()

        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = Path(filename).suffix
        stored_filename = f"{file_id}{file_extension}"
        file_path = self.upload_path / stored_filename

        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_data)

        # Create document record
        document = UploadedDocument(
            filename=filename,
            file_path=str(file_path),
            mime_type=mime_type,
            file_size=len(file_data),
            sha256_hash=sha256_hash,
            metadata={},
        )

        return document

    async def extract_text_from_document(
        self, document: UploadedDocument, images: Optional[List[ICN]] = None
    ) -> str:
        """Extract text content from document. Images can be provided to insert references."""
        file_path = Path(document.file_path)

        try:
            if document.mime_type == "application/pdf":
                return await self._extract_pdf_text(file_path, images)
            elif (
                document.mime_type
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ):
                return await self._extract_docx_text(file_path, images)
            elif (
                document.mime_type
                == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            ):
                return await self._extract_pptx_text(file_path, images)
            elif (
                document.mime_type
                == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ):
                return await self._extract_xlsx_text(file_path, images)
            elif document.mime_type.startswith("text/"):
                return await self._extract_plain_text(file_path)
            else:
                return ""
        except Exception as e:
            print(f"Error extracting text from {document.filename}: {str(e)}")
            return ""

    async def _extract_pdf_text(
        self, file_path: Path, images: Optional[List[ICN]] = None
    ) -> str:
        """Extract text from PDF file, optionally inserting ICN references."""
        try:
            reader = PdfReader(str(file_path))
            text = ""
            img_map = {}
            if images:
                for icn in images:
                    img_map.setdefault(icn.source_page, []).append(icn.icn_id)
            for idx, page in enumerate(reader.pages):
                text += page.extract_text() + "\n"
                if idx in img_map:
                    for icn_id in img_map[idx]:
                        text += f"[ICN_REF:{icn_id}]\n"
            return text
        except Exception as e:
            print(f"Error extracting PDF text: {str(e)}")
            return ""

    async def _extract_docx_text(
        self, file_path: Path, images: Optional[List[ICN]] = None
    ) -> str:
        """Extract text from DOCX file, inserting ICN refs when possible."""
        try:
            from docx import Document

            doc = Document(str(file_path))
            parts = []
            for para in doc.paragraphs:
                if para.text:
                    parts.append(para.text)

            for table in doc.tables:
                for row in table.rows:
                    cells = [cell.text for cell in row.cells]
                    if any(cells):
                        parts.append("\t".join(cells))
            if images:
                for icn in images:
                    parts.append(f"[ICN_REF:{icn.icn_id}]")
            return "\n".join(parts)
        except Exception as e:
            print(f"Error extracting DOCX text: {str(e)}")
            return ""

    async def _extract_pptx_text(
        self, file_path: Path, images: Optional[List[ICN]] = None
    ) -> str:
        """Extract text from PPTX file and reference images."""
        try:
            prs = Presentation(str(file_path))
            text = ""
            img_map = {}
            if images:
                for icn in images:
                    img_map.setdefault(icn.source_page, []).append(icn.icn_id)
            for slide_idx, slide in enumerate(prs.slides):
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
                if slide_idx in img_map:
                    for icn_id in img_map[slide_idx]:
                        text += f"[ICN_REF:{icn_id}]\n"
            return text
        except Exception as e:
            print(f"Error extracting PPTX text: {str(e)}")
            return ""

    async def _extract_xlsx_text(
        self, file_path: Path, images: Optional[List[ICN]] = None
    ) -> str:
        """Extract text from XLSX file."""
        try:
            workbook = load_workbook(str(file_path))
            text = ""
            for sheet in workbook.worksheets:
                for row in sheet.iter_rows(values_only=True):
                    for cell in row:
                        if cell is not None:
                            text += str(cell) + " "
                    text += "\n"
            if images:
                for icn in images:
                    text += f"[ICN_REF:{icn.icn_id}]\n"
            return text
        except Exception as e:
            print(f"Error extracting XLSX text: {str(e)}")
            return ""

    async def _extract_plain_text(self, file_path: Path) -> str:
        """Extract text from plain text file."""
        try:
            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                return await f.read()
        except Exception as e:
            print(f"Error extracting plain text: {str(e)}")
            return ""

    async def extract_images_from_document(
        self, document: UploadedDocument
    ) -> List[ICN]:
        """Extract images from document and create ICNs."""
        images = []

        if document.mime_type == "application/pdf":
            images = await self._extract_pdf_images(document)
        elif (
            document.mime_type
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ):
            images = await self._extract_docx_images(document)
        elif (
            document.mime_type
            == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ):
            images = await self._extract_pptx_images(document)
        elif (
            document.mime_type
            == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ):
            images = await self._extract_xlsx_images(document)
        elif document.mime_type.startswith("image/"):
            images = await self._process_single_image(document)

        return images

    async def _extract_pdf_images(self, document: UploadedDocument) -> List[ICN]:
        """Extract images from PDF document."""
        try:
            import fitz  # PyMuPDF

            images: List[ICN] = []
            pdf_doc = fitz.open(document.file_path)
            for page_index in range(len(pdf_doc)):
                page = pdf_doc[page_index]
                for img_index, img in enumerate(page.get_images(full=True)):
                    xref = img[0]
                    pix = fitz.Pixmap(pdf_doc, xref)
                    if pix.n - pix.alpha >= 4:  # handle CMYK
                        pix = fitz.Pixmap(fitz.csRGB, pix)

                    image_filename = f"{uuid.uuid4().hex}.png"
                    image_path = self.icn_path / image_filename
                    pix.save(str(image_path))

                    icn = ICN(
                        filename=image_filename,
                        file_path=str(image_path),
                        sha256_hash=hashlib.sha256(pix.samples).hexdigest(),
                        mime_type="image/png",
                        width=pix.width,
                        height=pix.height,
                        source_page=page_index,
                    )
                    images.append(icn)

            pdf_doc.close()
            return images
        except Exception as e:
            print(f"Error extracting PDF images: {str(e)}")
            return []

    async def _extract_docx_images(self, document: UploadedDocument) -> List[ICN]:
        """Extract images from DOCX document."""
        try:
            from docx import Document

            images: List[ICN] = []
            doc = Document(document.file_path)
            rels = doc.part._rels
            order = 0
            for rel in rels.values():
                if "image" in rel.reltype:
                    image_bytes = rel.target_part.blob
                    image_filename = f"{uuid.uuid4().hex}.png"
                    image_path = self.icn_path / image_filename
                    with open(image_path, "wb") as f:
                        f.write(image_bytes)
                    image = Image.open(io.BytesIO(image_bytes))
                    width, height = image.size
                    icn = ICN(
                        filename=image_filename,
                        file_path=str(image_path),
                        sha256_hash=hashlib.sha256(image_bytes).hexdigest(),
                        mime_type="image/png",
                        width=width,
                        height=height,
                        source_page=order,
                    )
                    images.append(icn)
                    order += 1
            return images
        except Exception as e:
            print(f"Error extracting DOCX images: {str(e)}")
            return []

    async def _extract_pptx_images(self, document: UploadedDocument) -> List[ICN]:
        """Extract images from PPTX presentation."""
        try:
            prs = Presentation(document.file_path)
            images: List[ICN] = []
            for slide_idx, slide in enumerate(prs.slides):
                for shape in slide.shapes:
                    if getattr(shape, "shape_type", None) == 13:  # PICTURE
                        image_bytes = shape.image.blob
                        image_filename = f"{uuid.uuid4().hex}.png"
                        image_path = self.icn_path / image_filename
                        with open(image_path, "wb") as f:
                            f.write(image_bytes)
                        img = Image.open(io.BytesIO(image_bytes))
                        width, height = img.size
                        icn = ICN(
                            filename=image_filename,
                            file_path=str(image_path),
                            sha256_hash=hashlib.sha256(image_bytes).hexdigest(),
                            mime_type="image/png",
                            width=width,
                            height=height,
                            source_page=slide_idx,
                        )
                        images.append(icn)
            return images
        except Exception as e:
            print(f"Error extracting PPTX images: {str(e)}")
            return []

    async def _extract_xlsx_images(self, document: UploadedDocument) -> List[ICN]:
        """Extract images from XLSX workbook."""
        try:
            workbook = load_workbook(document.file_path)
            images: List[ICN] = []
            idx = 0
            for sheet in workbook.worksheets:
                for img in getattr(sheet, "_images", []):
                    image_bytes = img._data()
                    image_filename = f"{uuid.uuid4().hex}.png"
                    image_path = self.icn_path / image_filename
                    with open(image_path, "wb") as f:
                        f.write(image_bytes)
                    im = Image.open(io.BytesIO(image_bytes))
                    width, height = im.size
                    icn = ICN(
                        filename=image_filename,
                        file_path=str(image_path),
                        sha256_hash=hashlib.sha256(image_bytes).hexdigest(),
                        mime_type="image/png",
                        width=width,
                        height=height,
                        source_page=idx,
                    )
                    images.append(icn)
                    idx += 1
            return images
        except Exception as e:
            print(f"Error extracting XLSX images: {str(e)}")
            return []

    async def _process_single_image(self, document: UploadedDocument) -> List[ICN]:
        """Process a single image file."""
        try:
            # Read image file
            async with aiofiles.open(document.file_path, "rb") as f:
                image_data = await f.read()

            # Open image to get dimensions
            image = Image.open(io.BytesIO(image_data))
            width, height = image.size

            # Create ICN
            icn = ICN(
                filename=document.filename,
                file_path=document.file_path,
                sha256_hash=document.sha256_hash,
                mime_type=document.mime_type,
                width=width,
                height=height,
                source_page=0,
            )

            return [icn]
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return []

    async def process_document_with_ai(
        self,
        document: UploadedDocument,
        text_content: str,
        images: List[ICN] | None = None,
    ) -> List[DataModule]:
        """Process document with AI to create data modules."""
        text_provider = ProviderFactory.create_text_provider()

        try:
            # Step 1: Classify document
            classification_request = TextProcessingRequest(
                text=text_content, task_type="classify"
            )
            classification_response = await text_provider.classify_document(
                classification_request
            )

            if "error" in classification_response.result:
                raise Exception(
                    f"Classification failed: {classification_response.result['error']}"
                )

            # Step 2: Extract structured data
            extraction_request = TextProcessingRequest(
                text=text_content, task_type="extract"
            )
            extraction_response = await text_provider.extract_structured_data(
                extraction_request
            )

            if "error" in extraction_response.result:
                raise Exception(
                    f"Extraction failed: {extraction_response.result['error']}"
                )

            icn_ids = [icn.icn_id for icn in images] if images else []

            # Step 3: Create verbatim data module
            verbatim_dm = DataModule(
                dmc=self._generate_dmc(classification_response.result),
                title=classification_response.result.get("title", "Untitled Document"),
                dm_type=DMTypeEnum(
                    classification_response.result.get("dm_type", "GEN")
                ),
                info_variant="00",  # Verbatim
                content=text_content,
                source_document_id=document.id,
                processing_status="completed",
                icn_refs=icn_ids,
                dm_refs=self._find_referenced_dmcs(text_content),
            )
            verbatim_dm.xml_content = self._build_s1000d_xml(verbatim_dm)

            # Step 4: Create STE version
            ste_request = TextProcessingRequest(text=text_content, task_type="rewrite")
            ste_response = await text_provider.rewrite_to_ste(ste_request)

            if "error" not in ste_response.result:
                ste_dm = DataModule(
                    dmc=self._generate_dmc(
                        classification_response.result, variant="01"
                    ),
                    title=classification_response.result.get(
                        "title", "Untitled Document"
                    ),
                    dm_type=DMTypeEnum(
                        classification_response.result.get("dm_type", "GEN")
                    ),
                    info_variant="01",  # STE
                    content=ste_response.result.get("rewritten_text", text_content),
                    source_document_id=document.id,
                    ste_score=ste_response.result.get("ste_score", 0.0),
                    processing_status="completed",
                    icn_refs=icn_ids,
                    dm_refs=self._find_referenced_dmcs(
                        ste_response.result.get("rewritten_text", text_content)
                    ),
                )
                ste_dm.xml_content = self._build_s1000d_xml(ste_dm)
                return [verbatim_dm, ste_dm]
            else:
                return [verbatim_dm]

        except Exception as e:
            print(f"Error processing document with AI: {str(e)}")
            # Return basic data module
            basic_dm = DataModule(
                dmc=self._generate_dmc({"dm_type": "GEN", "title": document.filename}),
                title=document.filename,
                dm_type=DMTypeEnum.GEN,
                info_variant="00",
                content=text_content,
                source_document_id=document.id,
                processing_status="error",
            )
            return [basic_dm]

    def _generate_dmc(self, classification_result: dict, variant: str = "00") -> str:
        """Generate Data Module Code according to S1000D specification."""
        model_ident = classification_result.get("model_ident", "AQLA")[:4].upper()
        system_diff = classification_result.get("system_diff", "00")
        system_code = classification_result.get("system_code", "000")
        sub_system_code = classification_result.get("sub_system_code", "00")
        sub_sub_system_code = classification_result.get("sub_sub_system_code", "00")
        assy_code = classification_result.get("assy_code", "00")
        disassy_code = classification_result.get("disassy_code", "00")
        disassy_code_variant = classification_result.get("disassy_code_variant", "00")

        dm_type = classification_result.get("dm_type", "GEN")
        if (
            self.brex_rules.get("allowed_dm_types")
            and dm_type not in self.brex_rules["allowed_dm_types"]
        ):
            dm_type = "GEN"
        info_code_map = {
            "PROC": "030",
            "DESC": "020",
            "IPD": "200",
            "CIR": "120",
            "SNS": "120",
            "WIR": "190",
            "GEN": "000",
        }
        info_code = info_code_map.get(dm_type, "000")
        info_code_variant = classification_result.get("info_code_variant", "A")

        item_location_code = classification_result.get("item_location_code", "A")
        learn_code = classification_result.get("learn_code", "00")
        learn_event_code = classification_result.get("learn_event_code", "00")

        dmc = (
            f"DMC-{model_ident}-{system_diff}-{system_code}-{sub_system_code}-"
            f"{sub_sub_system_code}-{assy_code}-{disassy_code}-{disassy_code_variant}-"
            f"{info_code}-{info_code_variant}-{item_location_code}-{learn_code}-"
            f"{learn_event_code}-{variant}"
        )

        return dmc

    def _build_s1000d_xml(self, dm: DataModule) -> str:
        """Build a minimal S1000D-compliant XML representation for a DM."""
        root = etree.Element("dmodule")

        ident = etree.SubElement(root, "identAndStatusSection")
        etree.SubElement(ident, "dmc").text = dm.dmc
        etree.SubElement(ident, "title").text = dm.title
        etree.SubElement(ident, "infoVariant").text = dm.info_variant

        content = etree.SubElement(root, "content")
        for para in dm.content.split("\n"):
            if para.strip():
                p = etree.SubElement(content, "para")
                p.text = para.strip()

        if dm.icn_refs:
            illus = etree.SubElement(root, "illustrations")
            for ref in dm.icn_refs:
                ref_el = etree.SubElement(illus, "icnRef")
                ref_el.set("icnID", ref)

        if dm.dm_refs:
            refs = etree.SubElement(root, "dmRefs")
            for dref in dm.dm_refs:
                ref_el = etree.SubElement(refs, "dmRef")
                ref_el.set("dmc", dref)

        return etree.tostring(root, pretty_print=True, encoding="utf-8").decode("utf-8")

    def _find_referenced_dmcs(self, text: str) -> List[str]:
        """Find Data Module Codes referenced in the text."""
        if not text:
            return []
        pattern = r"DMC-[A-Z0-9-]+"
        return list(set(re.findall(pattern, text)))

    async def process_image_with_ai(self, icn: ICN) -> ICN:
        """Process image with AI to generate caption and objects."""
        vision_provider = ProviderFactory.create_vision_provider()

        try:
            # Read image file and encode as base64
            async with aiofiles.open(icn.file_path, "rb") as f:
                image_data = await f.read()

            image_base64 = base64.b64encode(image_data).decode("utf-8")

            # Generate caption
            caption_request = VisionProcessingRequest(
                image_data=image_base64, task_type="caption"
            )
            caption_response = await vision_provider.generate_caption(caption_request)

            # Detect objects
            objects_request = VisionProcessingRequest(
                image_data=image_base64, task_type="objects"
            )
            objects_response = await vision_provider.detect_objects(objects_request)

            # Generate hotspots
            hotspots_request = VisionProcessingRequest(
                image_data=image_base64, task_type="hotspots"
            )
            hotspots_response = await vision_provider.generate_hotspots(
                hotspots_request
            )

            # Update ICN with results
            icn.caption = caption_response.caption
            icn.objects = objects_response.objects
            icn.hotspots = hotspots_response.hotspots

            return icn

        except Exception as e:
            print(f"Error processing image with AI: {str(e)}")
            icn.caption = f"Error processing image: {str(e)}"
            return icn
