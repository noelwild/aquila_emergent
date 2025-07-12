import pytest
from backend.server import (
    DEFAULT_BREX_RULES,
    validate_module_dict,
    ValidationStatus,
)


def test_default_rules_loaded():
    assert DEFAULT_BREX_RULES["title"]["required"] is True
    assert "pattern" in DEFAULT_BREX_RULES["dmc"]


def test_validate_module_dict_failure():
    module = {
        "title": "",
        "dmc": "BAD-1",
        "content": "short",
        "ste_score": 0.8,
        "security_level": "CONFIDENTIAL",
    }
    status, errors, brex_valid, xsd_valid = validate_module_dict(module, DEFAULT_BREX_RULES)
    assert status == ValidationStatus.RED
    assert brex_valid is False
    assert xsd_valid is False  # missing required fields for XSD
    assert "Title is required" in errors
    assert any("DMC" in e for e in errors)
    assert "Content below minimum length" in errors


def test_validate_module_dict_success(tmp_path):
    module = {
        "dmc": "DMC-TEST-00-000-00-00-00-00-00-000-A-A-00-00-00",
        "title": "Valid Module",
        "dm_type": "GEN",
        "info_variant": "00",
        "content": "Valid content for testing",
        "source_document_id": "doc1",
        "ste_score": 0.95,
        "security_level": "UNCLASSIFIED",
    }

    status, errors, brex_valid, xsd_valid = validate_module_dict(module, DEFAULT_BREX_RULES)
    assert status == ValidationStatus.GREEN
    assert brex_valid is True
    assert xsd_valid is True
    assert errors == []
