import pytest
import backend_test

@pytest.fixture(scope="session")
def dmc_list():
    # Run document management test to get dmc list
    return backend_test.test_document_management()
