import pytest
from backend.server import DEFAULT_BREX_RULES, validate_module_dict, ValidationStatus


def test_default_rules_loaded():
    assert DEFAULT_BREX_RULES["title"]["required"] is True
    assert "pattern" in DEFAULT_BREX_RULES["dmc"]


def test_validate_module_dict():
    module = {
        "title": "",
        "dmc": "BAD-1",
        "content": "short",
        "ste_score": 0.8,
        "security_level": "CONFIDENTIAL",
    }
    status, errors = validate_module_dict(module, DEFAULT_BREX_RULES)
    assert status == ValidationStatus.RED
    assert "Title is required" in errors
    assert any("DMC" in e for e in errors)
    assert "Content below minimum length" in errors
