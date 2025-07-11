"""Document processing service."""

import os
import hashlib
import base64
import aiofiles
# import magic  # Removed for now
from typing import List, Dict, Any, Optional
from pathlib import Path
from PyPDF2 import PdfReader
from pptx import Presentation
from openpyxl import load_workbook
from PIL import Image
from docx import Document
from pdf2image import convert_from_path
import io
import asyncio
import uuid
from datetime import datetime

from ..models.document import UploadedDocument, ICN, DataModule, ProcessingTask
from ..models.base import DMTypeEnum, ValidationStatus
from ..ai_providers.provider_factory import ProviderFactory
from ..ai_providers.base import TextProcessingRequest, VisionProcessingRequest


class DocumentService:
    """Service for document processing and management."""
    
    def __init__(self, upload_path: str = "/tmp/aquila_uploads"):
        self.upload_path = Path(upload_path)
        self.upload_path.mkdir(parents=True, exist_ok=True)
        self.icn_path = self.upload_path / "icns"
        self.icn_path.mkdir(parents=True, exist_ok=True)
    
    async def upload_document(self, file_data: bytes, filename: str, mime_type: str) -> UploadedDocument:
        """Upload and process a document."""
        # Calculate SHA256 hash
        sha256_hash = hashlib.sha256(file_data).hexdigest()
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        file_extension = Path(filename).suffix
        stored_filename = f"{file_id}{file_extension}"
        file_path = self.upload_path / stored_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_data)
        
        # Create document record
        document = UploadedDocument(
            filename=filename,
            file_path=str(file_path),
            mime_type=mime_type,
            file_size=len(file_data),
            sha256_hash=sha256_hash,
            metadata={}
        )
        
        return document
    
    async def extract_text_from_document(self, document: UploadedDocument) -> str:
        """Extract text content from document."""
        file_path = Path(document.file_path)
        
        try:
            if document.mime_type == "application/pdf":
                return await self._extract_pdf_text(file_path)
            elif document.mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                return await self._extract_docx_text(file_path)
            elif document.mime_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
                return await self._extract_pptx_text(file_path)
            elif document.mime_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                return await self._extract_xlsx_text(file_path)
            elif document.mime_type.startswith("text/"):
                return await self._extract_plain_text(file_path)
            else:
                return ""
        except Exception as e:
            print(f"Error extracting text from {document.filename}: {str(e)}")
            return ""
    
    async def _extract_pdf_text(self, file_path: Path) -> str:
        """Extract text from PDF file."""
        try:
            reader = PdfReader(str(file_path))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
        except Exception as e:
            print(f"Error extracting PDF text: {str(e)}")
            return ""
    
    async def _extract_docx_text(self, file_path: Path) -> str:
        """Extract text from DOCX file."""
        try:
            doc = await asyncio.to_thread(Document, str(file_path))
            paragraphs = [p.text for p in doc.paragraphs if p.text]
            return "\n".join(paragraphs)
        except Exception as e:
            print(f"Error extracting DOCX text: {str(e)}")
            return ""
    
    async def _extract_pptx_text(self, file_path: Path) -> str:
        """Extract text from PPTX file."""
        try:
            prs = Presentation(str(file_path))
            text = ""
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
            return text
        except Exception as e:
            print(f"Error extracting PPTX text: {str(e)}")
            return ""
    
    async def _extract_xlsx_text(self, file_path: Path) -> str:
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
            return text
        except Exception as e:
            print(f"Error extracting XLSX text: {str(e)}")
            return ""
    
    async def _extract_plain_text(self, file_path: Path) -> str:
        """Extract text from plain text file."""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                return await f.read()
        except Exception as e:
            print(f"Error extracting plain text: {str(e)}")
            return ""
    
    async def extract_images_from_document(self, document: UploadedDocument) -> List[ICN]:
        """Extract images from document and create ICNs."""
        images = []
        
        if document.mime_type == "application/pdf":
            images = await self._extract_pdf_images(document)
        elif document.mime_type.startswith("image/"):
            images = await self._process_single_image(document)
        
        return images
    
    async def _extract_pdf_images(self, document: UploadedDocument) -> List[ICN]:
        """Extract images from PDF document."""
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
                    )
                )
            return icns
        except Exception as e:
            print(f"Error extracting PDF images: {str(e)}")
            return []
    
    async def _process_single_image(self, document: UploadedDocument) -> List[ICN]:
        """Process a single image file."""
        try:
            # Read image file
            async with aiofiles.open(document.file_path, 'rb') as f:
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
                height=height
            )
            
            return [icn]
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return []
    
    async def process_document_with_ai(self, document: UploadedDocument, text_content: str) -> List[DataModule]:
        """Process document with AI to create data modules."""
        text_provider = ProviderFactory.create_text_provider()
        
        try:
            # Step 1: Classify document
            classification_request = TextProcessingRequest(
                text=text_content,
                task_type="classify"
            )
            classification_response = await text_provider.classify_document(classification_request)
            
            if "error" in classification_response.result:
                raise Exception(f"Classification failed: {classification_response.result['error']}")
            
            # Step 2: Extract structured data
            extraction_request = TextProcessingRequest(
                text=text_content,
                task_type="extract"
            )
            extraction_response = await text_provider.extract_structured_data(extraction_request)
            
            if "error" in extraction_response.result:
                raise Exception(f"Extraction failed: {extraction_response.result['error']}")
            
            # Step 3: Create verbatim data module
            verbatim_dm = DataModule(
                dmc=self._generate_dmc(classification_response.result),
                title=classification_response.result.get("title", "Untitled Document"),
                dm_type=DMTypeEnum(classification_response.result.get("dm_type", "GEN")),
                info_variant="00",  # Verbatim
                content=text_content,
                source_document_id=document.id,
                processing_status="completed"
            )
            
            # Step 4: Create STE version
            ste_request = TextProcessingRequest(
                text=text_content,
                task_type="rewrite"
            )
            ste_response = await text_provider.rewrite_to_ste(ste_request)
            
            if "error" not in ste_response.result:
                ste_dm = DataModule(
                    dmc=self._generate_dmc(classification_response.result, variant="01"),
                    title=classification_response.result.get("title", "Untitled Document"),
                    dm_type=DMTypeEnum(classification_response.result.get("dm_type", "GEN")),
                    info_variant="01",  # STE
                    content=ste_response.result.get("rewritten_text", text_content),
                    source_document_id=document.id,
                    ste_score=ste_response.result.get("ste_score", 0.0),
                    processing_status="completed"
                )
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
                processing_status="error"
            )
            return [basic_dm]
    
    def _generate_dmc(self, classification_result: dict, variant: str = "00") -> str:
        """Generate Data Module Code according to S1000D specification."""
        # This is a simplified DMC generation
        # In a real implementation, this would follow the full S1000D DMC specification
        
        model_ident = "AQUILA"
        system_diff = "00"
        system_code = "000"
        sub_system_code = "00"
        sub_sub_system_code = "00"
        assy_code = "00"
        disassy_code = "00"
        disassy_code_variant = "00"
        info_code = "000"
        info_code_variant = "A"
        item_location_code = "A"
        learn_code = "00"
        learn_event_code = "00"
        
        dmc = f"DMC-{model_ident}-{system_diff}-{system_code}-{sub_system_code}-{sub_sub_system_code}-{assy_code}-{disassy_code}-{disassy_code_variant}-{info_code}-{info_code_variant}-{item_location_code}-{learn_code}-{learn_event_code}-{variant}"
        
        return dmc
    
    async def process_image_with_ai(self, icn: ICN) -> ICN:
        """Process image with AI to generate caption and objects."""
        vision_provider = ProviderFactory.create_vision_provider()
        
        try:
            # Read image file and encode as base64
            async with aiofiles.open(icn.file_path, 'rb') as f:
                image_data = await f.read()
            
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Generate caption
            caption_request = VisionProcessingRequest(
                image_data=image_base64,
                task_type="caption"
            )
            caption_response = await vision_provider.generate_caption(caption_request)
            
            # Detect objects
            objects_request = VisionProcessingRequest(
                image_data=image_base64,
                task_type="objects"
            )
            objects_response = await vision_provider.detect_objects(objects_request)
            
            # Generate hotspots
            hotspots_request = VisionProcessingRequest(
                image_data=image_base64,
                task_type="hotspots"
            )
            hotspots_response = await vision_provider.generate_hotspots(hotspots_request)
            
            # Update ICN with results
            icn.caption = caption_response.caption
            icn.objects = objects_response.objects
            icn.hotspots = hotspots_response.hotspots
            
            return icn
            
        except Exception as e:
            print(f"Error processing image with AI: {str(e)}")
            icn.caption = f"Error processing image: {str(e)}"
            return icn