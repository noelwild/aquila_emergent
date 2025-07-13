import os
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "aquila_test")
os.environ.setdefault("SECRET_KEY", "test")

from fastapi.testclient import TestClient
from backend import server

client = TestClient(server.app)

def test_get_brex_xml_rules():
    response = client.get("/api/brex-xml-rules")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(r["id"] == "BREX-S1-00001" for r in data)
