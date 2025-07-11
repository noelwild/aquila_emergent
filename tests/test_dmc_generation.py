from backend.services.document_service import DocumentService

def test_generate_dmc_different_inputs():
    service = DocumentService()
    dmc1 = service._generate_dmc({"dm_type": "PROC", "title": "Hydraulic pump removal"})
    dmc2 = service._generate_dmc({"dm_type": "DESC", "title": "Hydraulic system overview"})
    assert dmc1 != dmc2
    assert dmc1.endswith("-00")
    assert dmc2.endswith("-00")

    # check dm_type mapping to info code
    parts1 = dmc1.split("-")
    parts2 = dmc2.split("-")
    assert parts1[9] == "001"  # PROC
    assert parts2[9] == "002"  # DESC


def test_generate_dmc_variant():
    service = DocumentService()
    result_base = service._generate_dmc({"dm_type": "GEN", "title": "Test"})
    result_variant = service._generate_dmc({"dm_type": "GEN", "title": "Test"}, variant="01")
    assert result_base != result_variant
    assert result_variant.endswith("-01")
    assert result_base.split("-")[:-1] == result_variant.split("-")[:-1]
