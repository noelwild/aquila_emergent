import os
import types
import pytest
from fastapi.testclient import TestClient

# Ensure env vars for import
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


server.db = types.SimpleNamespace(users=FakeUserCollection())
client = TestClient(server.app)


def test_register_and_login():
    # register new user
    resp = client.post("/auth/register", data={"username": "alice", "password": "secret"})
    assert resp.status_code == 200

    # obtain token
    resp = client.post("/auth/token", data={"username": "alice", "password": "secret"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    assert token

    # protected endpoint requires token
    r = client.get("/api/settings", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200

    # without token should fail
    r = client.get("/api/settings")
    assert r.status_code == 401
