import pytest

from backend.brex_rules import apply_brex_rules
from backend.models.base import DMTypeEnum, SettingsModel
from backend.models.document import DataModule
from backend.services.document_service import DocumentService

RULES = [
    {
        "id": "BREX-DMC-001",
        "xpath": "//dmc[not(starts-with(text(),'DMC-'))]",
        "message": "DMC must start with 'DMC-'",
    },
    {
        "id": "BREX-TITLE-001",
        "xpath": "//title[normalize-space(.)='']",
        "message": "Title is required",
    },
]


def create_xml(tmp_path, dmc: str, title: str) -> str:
    service = DocumentService(upload_path=tmp_path, settings=SettingsModel())
    dm = DataModule(
        dmc=dmc,
        title=title,
        dm_type=DMTypeEnum.GEN,
        info_variant="00",
        content="sample",
        source_document_id="doc1",
    )
    return service.render_data_module_xml(dm)


def test_apply_brex_rules_flags_invalid_dmc(tmp_path):
    xml = create_xml(tmp_path, "BAD-1", "Title")
    violations = apply_brex_rules(xml, RULES)
    assert any(v.startswith("BREX-DMC-001") for v in violations)


def test_apply_brex_rules_flags_empty_title(tmp_path):
    xml = create_xml(tmp_path, "DMC-TEST", "")
    violations = apply_brex_rules(xml, RULES)
    assert any(v.startswith("BREX-TITLE-001") for v in violations)
