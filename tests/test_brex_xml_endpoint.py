import os
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "aquila_test")
os.environ.setdefault("SECRET_KEY", "test")

from fastapi.testclient import TestClient
from backend import server

client = TestClient(server.app)

def test_get_brex_xml_rules():
    # register and obtain token
    client.post("/auth/register", data={"username": "u", "password": "p"})
    token = client.post(
        "/auth/token", data={"username": "u", "password": "p"}
    ).json()["access_token"]
    response = client.get(
        "/api/brex-xml-rules", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(r["id"] == "BREX-S1-00001" for r in data)

