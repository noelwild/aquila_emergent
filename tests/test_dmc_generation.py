import pytest
from backend.services.document_service import DocumentService, DEFAULT_STRUCTURE_CODES, DM_INFO_CODE_MAP
from backend.models.base import SettingsModel, StructureType, DMTypeEnum


def test_generate_dmc_with_structure(tmp_path):
    settings = SettingsModel(structure_type=StructureType.WATER)
    service = DocumentService(upload_path=tmp_path, settings=settings)
    dmc = service._generate_dmc({"dm_type": DMTypeEnum.PROC.value})

    struct = DEFAULT_STRUCTURE_CODES[StructureType.WATER]
    assert struct["system_code"] in dmc
    assert DM_INFO_CODE_MAP[DMTypeEnum.PROC] in dmc

