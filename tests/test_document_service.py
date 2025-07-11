import hashlib
import asyncio
from pathlib import Path
import tempfile

import pytest
from docx import Document as DocxDocument
from reportlab.pdfgen import canvas

from backend.services.document_service import DocumentService
from backend.models.document import UploadedDocument


def create_docx(path: Path, text: str):
    doc = DocxDocument()
    doc.add_paragraph(text)
    doc.save(path)


def create_pdf(path: Path):
    c = canvas.Canvas(str(path))
    c.drawString(100, 750, "Test PDF")
    c.showPage()
    c.save()


def test_extract_docx_text():
    with tempfile.TemporaryDirectory() as tmpdir:
        docx_path = Path(tmpdir) / "sample.docx"
        text = "Hello World"
        create_docx(docx_path, text)

        service = DocumentService(upload_path=tmpdir)
        extracted = asyncio.run(service._extract_docx_text(docx_path))
        assert text in extracted


def test_extract_pdf_images():
    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = Path(tmpdir) / "sample.pdf"
        create_pdf(pdf_path)

        with open(pdf_path, "rb") as f:
            data = f.read()
        sha = hashlib.sha256(data).hexdigest()

        doc = UploadedDocument(
            filename="sample.pdf",
            file_path=str(pdf_path),
            mime_type="application/pdf",
            file_size=len(data),
            sha256_hash=sha,
            metadata={},
        )

        service = DocumentService(upload_path=tmpdir)
        images = asyncio.run(service._extract_pdf_images(doc))
        assert len(images) > 0
        for icn in images:
            assert Path(icn.file_path).exists()
            assert icn.width > 0 and icn.height > 0
