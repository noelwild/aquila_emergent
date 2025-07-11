#!/usr/bin/env python3
"""
Comprehensive test script for Aquila S1000D-AI backend system.
"""

import os
import json
import base64
import time
import requests
from PIL import Image
import io
import sys
from pprint import pprint

import pytest

if not os.getenv("AQUILA_INTEGRATION_TESTS"):
    pytest.skip("Skipping backend integration tests", allow_module_level=True)

# API Base URL
API_BASE_URL = "https://e79d7fba-faa5-470f-8a4a-3841cc19f48a.preview.emergentagent.com/api"

# API Keys (read from environment if needed)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Test data
SAMPLE_TEXT = """
The hydraulic system of the aircraft provides power for the operation of the landing gear, 
flaps, and brakes. The system consists of a main pump, an auxiliary pump, a reservoir, 
accumulators, and various control valves. The main pump is driven by the engine and 
provides pressure during normal operation. The auxiliary pump is electrically driven and 
serves as a backup in case of main pump failure. The reservoir stores hydraulic fluid and 
provides for thermal expansion. The accumulators store hydraulic pressure and dampen 
pressure fluctuations in the system.
"""

# Create a simple test image (a red square)
def create_test_image():
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()

# Convert image to base64
def image_to_base64(image_data):
    return base64.b64encode(image_data).decode('utf-8')

# Helper function to print test results
def print_test_result(test_name, success, response=None, error=None):
    if success:
        print(f"✅ {test_name}: PASSED")
        if response:
            print(f"   Response: {response}")
    else:
        print(f"❌ {test_name}: FAILED")
        if error:
            print(f"   Error: {error}")
        if response:
            print(f"   Response: {response}")
    print("-" * 80)

# 1. Health Check & Basic APIs
def test_health_check():
    print("\n=== Testing Health Check & Basic APIs ===\n")
    
    # Test root endpoint
    try:
        response = requests.get(f"{API_BASE_URL}/")
        print_test_result("Root Endpoint", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Root Endpoint", False, error=str(e))
    
    # Test health check endpoint
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        print_test_result("Health Check", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Health Check", False, error=str(e))

# 2. AI Provider Configuration
def test_provider_configuration():
    print("\n=== Testing AI Provider Configuration ===\n")
    
    # Get available providers
    try:
        response = requests.get(f"{API_BASE_URL}/providers")
        print_test_result("Get Providers", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Get Providers", False, error=str(e))
    
    # Test switching to OpenAI
    try:
        response = requests.post(
            f"{API_BASE_URL}/providers/set",
            params={"text_provider": "openai", "vision_provider": "openai"}
        )
        print_test_result("Set Provider to OpenAI", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Set Provider to OpenAI", False, error=str(e))
    
    # Test switching to Anthropic
    try:
        response = requests.post(
            f"{API_BASE_URL}/providers/set",
            params={"text_provider": "anthropic", "vision_provider": "anthropic"}
        )
        print_test_result("Set Provider to Anthropic", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Set Provider to Anthropic", False, error=str(e))
    
    # Switch back to OpenAI for subsequent tests
    try:
        response = requests.post(
            f"{API_BASE_URL}/providers/set",
            params={"text_provider": "openai", "vision_provider": "openai"}
        )
        print_test_result("Reset Provider to OpenAI", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Reset Provider to OpenAI", False, error=str(e))

# 3. AI Provider Testing
def test_ai_providers():
    print("\n=== Testing AI Provider Capabilities ===\n")
    
    # Test text processing with OpenAI
    try:
        response = requests.post(
            f"{API_BASE_URL}/test/text",
            params={"task_type": "classify", "text": SAMPLE_TEXT}
        )
        print_test_result("OpenAI Text Classification", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("OpenAI Text Classification", False, error=str(e))
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/test/text",
            params={"task_type": "extract", "text": SAMPLE_TEXT}
        )
        print_test_result("OpenAI Text Extraction", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("OpenAI Text Extraction", False, error=str(e))
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/test/text",
            params={"task_type": "rewrite", "text": SAMPLE_TEXT}
        )
        print_test_result("OpenAI Text Rewrite", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("OpenAI Text Rewrite", False, error=str(e))
    
    # Test vision processing with OpenAI
    test_image = create_test_image()
    base64_image = image_to_base64(test_image)
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/test/vision",
            params={"task_type": "caption", "image_data": base64_image}
        )
        print_test_result("OpenAI Vision Caption", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("OpenAI Vision Caption", False, error=str(e))
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/test/vision",
            params={"task_type": "objects", "image_data": base64_image}
        )
        print_test_result("OpenAI Vision Objects", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("OpenAI Vision Objects", False, error=str(e))
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/test/vision",
            params={"task_type": "hotspots", "image_data": base64_image}
        )
        print_test_result("OpenAI Vision Hotspots", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("OpenAI Vision Hotspots", False, error=str(e))
    
    # Switch to Anthropic and test
    try:
        requests.post(
            f"{API_BASE_URL}/providers/set",
            params={"text_provider": "anthropic", "vision_provider": "anthropic"}
        )
        
        # Test text processing with Anthropic
        response = requests.post(
            f"{API_BASE_URL}/test/text",
            params={"task_type": "classify", "text": SAMPLE_TEXT}
        )
        print_test_result("Anthropic Text Classification", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Anthropic Text Classification", False, error=str(e))
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/test/vision",
            params={"task_type": "caption", "image_data": base64_image}
        )
        print_test_result("Anthropic Vision Caption", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Anthropic Vision Caption", False, error=str(e))
    
    # Switch back to OpenAI for subsequent tests
    try:
        requests.post(
            f"{API_BASE_URL}/providers/set",
            params={"text_provider": "openai", "vision_provider": "openai"}
        )
    except Exception:
        pass

# 4. Document Management
def test_document_management():
    print("\n=== Testing Document Management ===\n")
    
    # Test document upload
    test_image = create_test_image()
    files = {'file': ('test_image.jpg', test_image, 'image/jpeg')}
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/documents/upload",
            files=files
        )
        print_test_result("Document Upload", response.status_code == 200, response.json())
        document_id = response.json().get('document_id')
    except Exception as e:
        print_test_result("Document Upload", False, error=str(e))
        document_id = None
    
    if not document_id:
        print("Cannot continue document tests without a valid document ID")
        return None
    
    # Test get documents
    try:
        response = requests.get(f"{API_BASE_URL}/documents")
        print_test_result("Get Documents", response.status_code == 200, 
                         f"Found {len(response.json())} documents")
    except Exception as e:
        print_test_result("Get Documents", False, error=str(e))
    
    # Test get specific document
    try:
        response = requests.get(f"{API_BASE_URL}/documents/{document_id}")
        print_test_result("Get Document", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Get Document", False, error=str(e))
    
    # Test document processing
    try:
        response = requests.post(f"{API_BASE_URL}/documents/{document_id}/process")
        print_test_result("Process Document", response.status_code == 200, response.json())
        
        # Extract data module IDs for later tests
        data_modules = response.json().get('modules', [])
        dmc_list = [dm.get('dmc') for dm in data_modules]
        return dmc_list
    except Exception as e:
        print_test_result("Process Document", False, error=str(e))
        return None

# 5. Data Module Management
def test_data_module_management(dmc_list):
    print("\n=== Testing Data Module Management ===\n")
    
    if not dmc_list:
        print("Cannot test data modules without valid DMC list")
        return
    
    # Test get all data modules
    try:
        response = requests.get(f"{API_BASE_URL}/data-modules")
        print_test_result("Get Data Modules", response.status_code == 200, 
                         f"Found {len(response.json())} data modules")
    except Exception as e:
        print_test_result("Get Data Modules", False, error=str(e))
    
    # Test get specific data module
    dmc = dmc_list[0]
    try:
        response = requests.get(f"{API_BASE_URL}/data-modules/{dmc}")
        print_test_result(f"Get Data Module {dmc}", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result(f"Get Data Module {dmc}", False, error=str(e))
    
    # Test update data module
    try:
        update_data = {
            "title": "Updated Test Module",
            "content": "This is updated content for testing"
        }
        response = requests.put(
            f"{API_BASE_URL}/data-modules/{dmc}",
            json=update_data
        )
        print_test_result(f"Update Data Module {dmc}", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result(f"Update Data Module {dmc}", False, error=str(e))
    
    # Test validate data module
    try:
        response = requests.post(f"{API_BASE_URL}/validate/{dmc}")
        print_test_result(f"Validate Data Module {dmc}", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result(f"Validate Data Module {dmc}", False, error=str(e))

# 6. ICN Management
def test_icn_management():
    print("\n=== Testing ICN Management ===\n")
    
    # Test get all ICNs
    try:
        response = requests.get(f"{API_BASE_URL}/icns")
        print_test_result("Get ICNs", response.status_code == 200, 
                         f"Found {len(response.json())} ICNs")
        
        if len(response.json()) > 0:
            icn_id = response.json()[0].get('icn_id')
        else:
            icn_id = None
    except Exception as e:
        print_test_result("Get ICNs", False, error=str(e))
        icn_id = None
    
    if not icn_id:
        print("Cannot continue ICN tests without a valid ICN ID")
        return
    
    # Test get specific ICN
    try:
        response = requests.get(f"{API_BASE_URL}/icns/{icn_id}")
        print_test_result(f"Get ICN {icn_id}", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result(f"Get ICN {icn_id}", False, error=str(e))
    
    # Test get ICN image
    try:
        response = requests.get(f"{API_BASE_URL}/icns/{icn_id}/image")
        print_test_result(f"Get ICN Image {icn_id}", 
                         response.status_code == 200, 
                         f"Image size: {len(response.content)} bytes")
    except Exception as e:
        print_test_result(f"Get ICN Image {icn_id}", False, error=str(e))
    
    # Test update ICN
    try:
        update_data = {
            "caption": "Updated test caption for ICN"
        }
        response = requests.put(
            f"{API_BASE_URL}/icns/{icn_id}",
            json=update_data
        )
        print_test_result(f"Update ICN {icn_id}", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result(f"Update ICN {icn_id}", False, error=str(e))

# 7. Publication Module Management
def test_publication_module_management(dmc_list):
    print("\n=== Testing Publication Module Management ===\n")
    
    if not dmc_list:
        print("Cannot test publication modules without valid DMC list")
        return
    
    # Test create publication module
    pm_code = f"PMC-AQUILA-TEST-{int(time.time())}"
    try:
        pm_data = {
            "pm_code": pm_code,
            "title": "Test Publication Module",
            "dm_list": dmc_list,
            "structure": {
                "chapters": [
                    {
                        "title": "Chapter 1",
                        "sections": [
                            {
                                "title": "Section 1",
                                "dm_refs": dmc_list
                            }
                        ]
                    }
                ]
            }
        }
        response = requests.post(
            f"{API_BASE_URL}/publication-modules",
            json=pm_data
        )
        print_test_result("Create Publication Module", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result("Create Publication Module", False, error=str(e))
    
    # Test get all publication modules
    try:
        response = requests.get(f"{API_BASE_URL}/publication-modules")
        print_test_result("Get Publication Modules", response.status_code == 200, 
                         f"Found {len(response.json())} publication modules")
    except Exception as e:
        print_test_result("Get Publication Modules", False, error=str(e))
    
    # Test get specific publication module
    try:
        response = requests.get(f"{API_BASE_URL}/publication-modules/{pm_code}")
        print_test_result(f"Get Publication Module {pm_code}", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result(f"Get Publication Module {pm_code}", False, error=str(e))
    
    # Test publish publication module
    try:
        publish_options = {
            "formats": ["xml", "pdf"],
            "variants": ["verbatim", "ste"],
            "include_illustrations": True
        }
        response = requests.post(
            f"{API_BASE_URL}/publication-modules/{pm_code}/publish",
            json=publish_options
        )
        print_test_result(f"Publish Publication Module {pm_code}", response.status_code == 200, response.json())
    except Exception as e:
        print_test_result(f"Publish Publication Module {pm_code}", False, error=str(e))

def main():
    print("\n" + "=" * 80)
    print("AQUILA S1000D-AI BACKEND TEST SUITE")
    print("=" * 80 + "\n")
    
    # Run all tests
    test_health_check()
    test_provider_configuration()
    test_ai_providers()
    dmc_list = test_document_management()
    if dmc_list:
        test_data_module_management(dmc_list)
        test_publication_module_management(dmc_list)
    test_icn_management()
    
    print("\n" + "=" * 80)
    print("TEST SUITE COMPLETED")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()