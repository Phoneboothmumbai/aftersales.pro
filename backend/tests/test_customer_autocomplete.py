"""Tests for GET /api/customers/autocomplete (customer autocomplete for Job Create)."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="session")
def creds():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing test_credentials.md")
    content = p.read_text()
    # demo account block
    m = re.search(r"Demo Account.*?Subdomain:\*\*\s*(\S+).*?Email:\*\*\s*(\S+).*?Password:\*\*\s*(\S+)",
                  content, re.S)
    if not m:
        pytest.skip("demo credentials not found")
    return {"subdomain": m.group(1), "email": m.group(2), "password": m.group(3)}


@pytest.fixture(scope="session")
def client(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": creds["email"], "password": creds["password"], "subdomain": creds["subdomain"]
    })
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:400]}")
    data = r.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.fail(f"no token in login response: {list(data.keys())}")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def existing_customer(client):
    r = client.get(f"{BASE_URL}/api/customers")
    assert r.status_code == 200, r.text[:300]
    customers = r.json().get("customers", [])
    if not customers:
        pytest.skip("no customers in demo tenant")
    # pick one with a name of at least 2 chars and mobile of at least 3 digits
    for c in customers:
        if c.get("name") and len(c["name"]) >= 2 and c.get("mobile") and len(c["mobile"]) >= 3:
            return c
    pytest.skip("no suitable customer")


class TestAutocomplete:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/customers/autocomplete?q=ab")
        assert r.status_code in (401, 403), f"expected auth error, got {r.status_code}"

    def test_empty_query_returns_empty(self, client):
        r = client.get(f"{BASE_URL}/api/customers/autocomplete")
        assert r.status_code == 200, r.text[:300]
        assert r.json() == {"customers": []}

    def test_short_query_returns_empty(self, client):
        r = client.get(f"{BASE_URL}/api/customers/autocomplete?q=a")
        assert r.status_code == 200
        assert r.json()["customers"] == []

    def test_search_by_name_prefix(self, client, existing_customer):
        q = existing_customer["name"][:2]
        r = client.get(f"{BASE_URL}/api/customers/autocomplete", params={"q": q})
        assert r.status_code == 200, r.text[:300]
        customers = r.json()["customers"]
        assert isinstance(customers, list) and len(customers) > 0
        assert len(customers) <= 10
        for c in customers:
            assert set(["name", "mobile", "total_jobs"]).issubset(c.keys())
            assert "_id" not in c
            assert isinstance(c["total_jobs"], int) and c["total_jobs"] >= 1
        assert any(q.lower() in (c["name"] or "").lower() or q.lower() in (c["mobile"] or "").lower()
                   for c in customers)

    def test_search_by_mobile_prefix(self, client, existing_customer):
        q = existing_customer["mobile"][:4]
        r = client.get(f"{BASE_URL}/api/customers/autocomplete", params={"q": q})
        assert r.status_code == 200
        customers = r.json()["customers"]
        assert len(customers) > 0
        mobiles = [c["mobile"] for c in customers]
        assert existing_customer["mobile"] in mobiles, f"{existing_customer['mobile']} not in {mobiles}"

    def test_case_insensitive(self, client, existing_customer):
        q = existing_customer["name"][:3]
        low = client.get(f"{BASE_URL}/api/customers/autocomplete", params={"q": q.lower()}).json()["customers"]
        up = client.get(f"{BASE_URL}/api/customers/autocomplete", params={"q": q.upper()}).json()["customers"]
        # NOTE: order is not deterministic because $limit is applied after $group
        # (the pre-group $sort is not preserved) - compared as sets.
        assert {c["mobile"] for c in low} == {c["mobile"] for c in up}

    def test_dedup_by_mobile(self, client, existing_customer):
        q = existing_customer["mobile"][:4]
        customers = client.get(f"{BASE_URL}/api/customers/autocomplete", params={"q": q}).json()["customers"]
        mobiles = [c["mobile"] for c in customers]
        assert len(mobiles) == len(set(mobiles)), f"duplicate mobiles: {mobiles}"

    def test_no_match_returns_empty(self, client):
        r = client.get(f"{BASE_URL}/api/customers/autocomplete", params={"q": "ZZQXNOMATCH123"})
        assert r.status_code == 200
        assert r.json()["customers"] == []

    def test_regex_special_chars_do_not_500(self, client):
        for q in ["((", "a+", "[", "\\", ".*"]:
            r = client.get(f"{BASE_URL}/api/customers/autocomplete", params={"q": q})
            assert r.status_code == 200, f"q={q!r} -> {r.status_code} {r.text[:200]}"
