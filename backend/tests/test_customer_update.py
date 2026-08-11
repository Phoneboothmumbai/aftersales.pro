"""Tests for PUT /api/customers/{mobile} (Edit Customer - propagate across jobs & ledger)."""
import os
import re
import time
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
    token = r.json().get("token") or r.json().get("access_token")
    if not token:
        pytest.fail("no token in login response")
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def get_customers(client):
    r = client.get(f"{BASE_URL}/api/customers")
    assert r.status_code == 200, r.text[:300]
    return r.json().get("customers", [])


@pytest.fixture(scope="module")
def seeded_customer(client):
    """Create a job with a TEST_ customer so we can safely mutate it."""
    mobile = "9" + str(int(time.time()))[-9:]
    payload = {
        "customer": {"name": "TEST_EditCust", "mobile": mobile, "email": "test_edit@example.com"},
        "device": {"device_type": "Mobile", "brand": "TestBrand", "model": "TestModel",
                   "serial_imei": "TESTIMEI" + mobile[-4:], "condition": "Active"},
        "accessories": [],
        "problem_description": "TEST_ edit customer propagation",
    }
    r = client.post(f"{BASE_URL}/api/jobs", json=payload)
    if r.status_code not in (200, 201):
        pytest.fail(f"job create failed {r.status_code}: {r.text[:500]}")
    job = r.json()
    state = {"mobile": mobile, "job": job}
    yield state
    # cleanup best-effort (no DELETE /jobs endpoint) -> remove directly from mongo
    try:
        from pymongo import MongoClient
        env = dotenv_values("/app/backend/.env")
        mc = MongoClient(env["MONGO_URL"])
        dbx = mc[env["DB_NAME"]]
        dbx.jobs.delete_many({"id": job.get("id")})
        dbx.customer_ledger.delete_many({"customer_mobile": {"$in": [mobile, state["mobile"]]}})
        mc.close()
    except Exception as exc:  # pragma: no cover
        print(f"cleanup skipped: {exc}")


class TestCustomerUpdate:
    def test_requires_auth(self, seeded_customer):
        r = requests.put(f"{BASE_URL}/api/customers/{seeded_customer['mobile']}",
                         json={"name": "X", "mobile": seeded_customer['mobile']})
        assert r.status_code in (401, 403), f"expected auth error got {r.status_code}"

    def test_unknown_customer_404(self, client):
        r = client.put(f"{BASE_URL}/api/customers/0000000000",
                       json={"name": "Nobody", "mobile": "0000000000"})
        assert r.status_code == 404, f"{r.status_code}: {r.text[:300]}"

    def test_missing_required_fields_422(self, client, seeded_customer):
        r = client.put(f"{BASE_URL}/api/customers/{seeded_customer['mobile']}",
                       json={"email": "a@b.com"})
        assert r.status_code == 422, f"{r.status_code}: {r.text[:300]}"

    def test_update_name_email_propagates(self, client, seeded_customer):
        mobile = seeded_customer["mobile"]
        r = client.put(f"{BASE_URL}/api/customers/{mobile}", json={
            "name": "TEST_EditCust Renamed", "mobile": mobile, "email": "renamed@example.com"
        })
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        body = r.json()
        assert body.get("message") == "Customer updated successfully"
        assert body.get("jobs_updated", 0) >= 1, body

        # verify job doc reflects change
        job_id = seeded_customer["job"].get("id")
        jr = client.get(f"{BASE_URL}/api/jobs/{job_id}")
        assert jr.status_code == 200, jr.text[:300]
        cust = jr.json()["customer"]
        assert cust["name"] == "TEST_EditCust Renamed"
        assert cust["email"] == "renamed@example.com"
        assert cust["mobile"] == mobile

        # verify customers list reflects change
        listed = [c for c in get_customers(client) if c["mobile"] == mobile]
        assert listed, "customer missing from list after update"
        assert listed[0]["name"] == "TEST_EditCust Renamed"

    def test_update_mobile_propagates(self, client, seeded_customer):
        old_mobile = seeded_customer["mobile"]
        new_mobile = "8" + old_mobile[1:]
        r = client.put(f"{BASE_URL}/api/customers/{old_mobile}", json={
            "name": "TEST_EditCust Renamed", "mobile": new_mobile, "email": "renamed@example.com"
        })
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        seeded_customer["mobile"] = new_mobile

        job_id = seeded_customer["job"].get("id")
        jr = client.get(f"{BASE_URL}/api/jobs/{job_id}")
        assert jr.status_code == 200
        assert jr.json()["customer"]["mobile"] == new_mobile

        mobiles = [c["mobile"] for c in get_customers(client)]
        assert new_mobile in mobiles, "new mobile not present in customers list"
        assert old_mobile not in mobiles, "old mobile still listed after mobile change"

        # ledger endpoint should work with new mobile
        lr = client.get(f"{BASE_URL}/api/customers/{new_mobile}/ledger")
        assert lr.status_code == 200, f"ledger {lr.status_code}: {lr.text[:300]}"

    def test_email_can_be_cleared(self, client, seeded_customer):
        mobile = seeded_customer["mobile"]
        r = client.put(f"{BASE_URL}/api/customers/{mobile}", json={
            "name": "TEST_EditCust Renamed", "mobile": mobile, "email": None
        })
        assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
        job_id = seeded_customer["job"].get("id")
        jr = client.get(f"{BASE_URL}/api/jobs/{job_id}")
        assert jr.json()["customer"].get("email") in (None, "")

    def test_tenant_isolation_other_tenant_customer_not_updatable(self, client):
        """Updating a mobile that does not exist in this tenant must 404 (no cross-tenant write)."""
        r = client.put(f"{BASE_URL}/api/customers/1234509876",
                       json={"name": "TEST_Hacker", "mobile": "1234509876"})
        assert r.status_code == 404
