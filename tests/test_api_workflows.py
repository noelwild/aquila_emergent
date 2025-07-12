import os
import types
from fastapi.testclient import TestClient
from backend.models.document import DataModule, PublicationModule
from backend.models.base import DMTypeEnum
from backend.services.document_service import DocumentService

# Ensure required env vars
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "aquila_test")
os.environ.setdefault("SECRET_KEY", "testsecret")

from backend import server  # noqa: E402

class FakeUserCollection:
    def __init__(self):
        self.store = {}

    async def find_one(self, query):
        return self.store.get(query.get("username"))

    async def insert_one(self, data):
        self.store[data["username"]] = data

class FakeCursor:
    def __init__(self, docs):
        self.docs = docs

    async def to_list(self, _):
        return self.docs

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

    async def insert_one(self, data):
        self.docs.append(data)

    async def update_one(self, query, update):
        key = list(query.keys())[0]
        val = query[key]
        for d in self.docs:
            if d.get(key) == val:
                d.update(update.get("$set", {}))
                return types.SimpleNamespace(matched_count=1)
        return types.SimpleNamespace(matched_count=0)

    def find(self, query):
        key = list(query.keys())[0]
        if key == "dmc":
            dmc_list = query[key]["$in"]
            docs = [d for d in self.docs if d["dmc"] in dmc_list]
            return FakeCursor(docs)
        return FakeCursor([])

class FakeDB:
    def __init__(self, users, dms, pms):
        self.users = users
        self.data_modules = FakeCollection(dms)
        self.publication_modules = FakeCollection(pms)


def setup_client(tmp_path):
    server.document_service = DocumentService(upload_path=tmp_path)
    users = FakeUserCollection()
    dm = DataModule(
        dmc="DMC-TEST-00-000-00-00-00-00-00-000-A-A-00-00-00",
        title="Test",
        dm_type=DMTypeEnum.GEN,
        info_variant="00",
        content="Valid content",
        source_document_id="doc1",
    )
    pm = PublicationModule(pm_code="PM1", title="PM", dm_list=[dm.dmc])
    db = FakeDB(users, [dm.dict()], [pm.dict()])
    server.db = db
    return TestClient(server.app), dm, pm


def test_validation_and_publish(tmp_path):
    client, dm, pm = setup_client(tmp_path)
    # register user and get token
    client.post("/auth/register", data={"username": "u", "password": "p"})
    resp = client.post("/auth/token", data={"username": "u", "password": "p"})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(f"/api/validate/{dm.dmc}", headers=headers)
    assert r.status_code == 200
    assert r.json()["brex_valid"] is True

    r = client.post(
        f"/api/publication-modules/{pm.pm_code}/publish",
        json={"formats": ["xml"], "variants": ["00"]},
        headers=headers,
    )
    assert r.status_code == 200
    assert os.path.exists(r.json()["package"])
