import asyncio
from backend.services.document_service import DocumentService
from backend.models.document import DataModule
from backend.models.base import DMTypeEnum, SettingsModel


def test_xml_generation_and_validation(tmp_path):
    settings = SettingsModel()
    service = DocumentService(upload_path=tmp_path, settings=settings)
    dm = DataModule(
        dmc="DMC-TEST-00-000-00-00-00-00-00-000-A-A-00-00-00",
        title="Test Module",
        dm_type=DMTypeEnum.GEN,
        info_variant="00",
        content="Sample content",
        source_document_id="doc1",
    )
    xml_str = service.render_data_module_xml(dm)
    assert "<dataModule>" in xml_str
    assert service.validate_xml(xml_str) is True
