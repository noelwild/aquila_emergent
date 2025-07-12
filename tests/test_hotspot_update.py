import types
from fastapi.testclient import TestClient
from datetime import datetime

from backend import server
from backend.models.document import DataModule
from backend.models.base import DMTypeEnum
from backend.services.document_service import DocumentService

class FakeCollection:
    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, query):
        key = list(query.keys())[0]
        val = query[key]
        for d in self.docs:
            if d.get(key) == val:
                return d
        return None

    async def update_one(self, query, update):
        doc = await self.find_one(query)
        if doc:
            doc.update(update.get("$set", {}))
            return types.SimpleNamespace(matched_count=1)
        return types.SimpleNamespace(matched_count=0)

    async def update_many(self, query, update):
        count = 0
        val = query.get("icn_refs")
        for d in self.docs:
            if val in d.get("icn_refs", []):
                d.update(update.get("$set", {}))
                count += 1
        return types.SimpleNamespace(modified_count=count)

    async def insert_one(self, data):
        self.docs.append(data)


class FakeUserCollection:
    def __init__(self):
        self.store = {}

    async def find_one(self, query):
        return self.store.get(query.get("username"))

    async def insert_one(self, data):
        self.store[data["username"]] = data


class FakeSettingsCollection:
    async def find_one(self, query):
        return {"id": "s", "brex_rules": {}}


def setup_client(tmp_path):
    server.document_service = DocumentService(upload_path=tmp_path)
    icn = {
        "icn_id": "I1",
        "lcn": "LCN-1",
        "filename": "i.jpg",
        "file_path": str(tmp_path / "i.jpg"),
        "sha256_hash": "0",
        "mime_type": "image/jpeg",
        "caption": "",
        "hotspots": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    dm = DataModule(
        dmc="DMC-TEST",
        title="Test",
        dm_type=DMTypeEnum.GEN,
        info_variant="00",
        content="T",
        source_document_id="d",
        icn_refs=["LCN-1"],
    )
    db = types.SimpleNamespace(
        icns=FakeCollection([icn]),
        data_modules=FakeCollection([dm.dict()]),
        users=FakeUserCollection(),
        settings=FakeSettingsCollection(),
    )
    server.db = db
    return TestClient(server.app), dm, icn


def test_icn_hotspot_update(tmp_path):
    client, dm, icn = setup_client(tmp_path)
    client.post("/auth/register", data={"username": "u", "password": "p"})
    token = client.post("/auth/token", data={"username": "u", "password": "p"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    before = server.db.data_modules.docs[0]["updated_at"]

    r = client.put(
        f"/api/icns/{icn['icn_id']}",
        headers=headers,
        json={"hotspots": [{"x": 1, "y": 1, "width": 10, "height": 10, "description": "part"}]},
    )
    assert r.status_code == 200
    assert server.db.icns.docs[0]["hotspots"]
    assert server.db.data_modules.docs[0]["updated_at"] > before
