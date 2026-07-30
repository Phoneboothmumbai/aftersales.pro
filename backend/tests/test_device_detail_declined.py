"""Backend tests for Device Detail / Sell flow, Declined Intake Log, Module Settings and
profit-password (margin protection) endpoints — iteration 18."""
import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="session")
def creds():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing credentials file")
    content = p.read_text(encoding="utf-8")
    m = re.search(r"## Demo Account(.*?)(?=\n## |\Z)", content, re.S)
    block = m.group(1) if m else content
    email = re.search(r"(?im)^\s*[-*]?\s*\*\*Email:\*\*\s*([^\s]+)", block)
    pwd = re.search(r"(?im)^\s*[-*]?\s*\*\*Password:\*\*\s*([^\s]+)", block)
    sub = re.search(r"(?im)^\s*[-*]?\s*\*\*Subdomain:\*\*\s*([^\s]+)", block)
    if not (email and pwd and sub):
        pytest.skip("could not parse demo credentials")
    return {"email": email.group(1), "password": pwd.group(1), "subdomain": sub.group(1)}


@pytest.fixture(scope="session")
def client(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=60)
    if r.status_code != 200:
        pytest.fail(f"Login failed {r.status_code}: {r.text[:400]}")
    s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})
    return s


@pytest.fixture(scope="session")
def created_ids():
    return []


def luhn_imei(prefix14: str) -> str:
    digits = [int(d) for d in prefix14]
    checksum = 0
    for i, d in enumerate(digits):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return prefix14 + str((10 - checksum % 10) % 10)


def new_mobile_payload(price=10000):
    imei = luhn_imei("35" + os.urandom(6).hex()[:12].translate(str.maketrans("abcdef", "123456")))
    return {
        "module": "mobile", "category": "smartphone", "brand": "TEST_Detail",
        "model": "TEST_Model", "imei_1": imei, "purchase_price": price,
        "payment_mode": "cash", "seller_name": "TEST_DetailSeller",
        "seller_phone": "9812345670", "id_proof_type": "aadhaar",
        "id_proof_number": "432112345678",
    }


# ---------- Device Detail page data source ----------
class TestDeviceDetailEndpoint:
    @pytest.fixture(scope="class")
    def device(self, client, created_ids):
        r = client.post(f"{BASE_URL}/api/used-devices", json=new_mobile_payload(), timeout=60)
        if r.status_code not in (200, 201):
            pytest.fail(f"setup create failed {r.status_code}: {r.text[:300]}")
        d = r.json()
        created_ids.append(d["id"])
        return d

    def test_detail_by_uuid(self, client, device):
        r = client.get(f"{BASE_URL}/api/used-devices/detail/{device['id']}", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "_id" not in d
        assert d["device_id"] == device["device_id"]
        assert d["status"] == "pending_signature"
        assert d["purchase_price"] == 10000
        assert d["seller_name"] == "TEST_DetailSeller"
        assert d["id_proof_number_masked"].endswith("5678")
        assert isinstance(d["days_in_stock"], int)

    def test_detail_404(self, client):
        r = client.get(f"{BASE_URL}/api/used-devices/detail/does-not-exist", timeout=60)
        assert r.status_code == 404

    def test_detail_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/used-devices/detail/x", timeout=30)
        assert r.status_code in (401, 403)

    def test_sell_blocked_before_signature(self, client, device):
        r = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/sell",
                        json={"selling_price": 12000, "buyer_name": "TEST_B",
                              "buyer_phone": "9800000000", "payment_mode": "Cash"}, timeout=60)
        assert r.status_code == 400
        assert "in_stock" in r.json().get("detail", "")

    def test_sign_then_sell_flow(self, client, device):
        s = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/sign-declaration", json={}, timeout=60)
        assert s.status_code == 200, s.text[:300]
        detail = client.get(f"{BASE_URL}/api/used-devices/detail/{device['id']}", timeout=60).json()
        assert detail["status"] == "in_stock"

        sell = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/sell",
                           json={"selling_price": 13500, "buyer_name": "TEST_Buyer",
                                 "buyer_phone": "9800000001", "payment_mode": "Cash",
                                 "buyer_address": "TEST addr"}, timeout=60)
        assert sell.status_code == 200, sell.text[:300]
        body = sell.json()
        assert body["margin"] == 3500, body
        assert body["selling_price"] == 13500

        after = client.get(f"{BASE_URL}/api/used-devices/detail/{device['id']}", timeout=60).json()
        assert after["status"] == "sold"
        assert after["selling_price"] == 13500
        assert after["buyer_name"] == "TEST_Buyer"
        # margin is always masked on detail endpoint
        assert after["margin"] is None

    def test_double_sell_rejected(self, client, device):
        r = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/sell",
                        json={"selling_price": 1, "buyer_name": "TEST_B2",
                              "buyer_phone": "9800000002", "payment_mode": "Cash"}, timeout=60)
        assert r.status_code == 400

    def test_status_change_invalid_for_sold(self, client, device):
        r = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/update-status",
                        json={"status": "needs_repair"}, timeout=60)
        assert r.status_code == 400


# ---------- Profit password (margin protection) ----------
class TestProfitPasswordStatus:
    def test_status_endpoint(self, client):
        r = client.get(f"{BASE_URL}/api/settings/profit-password-status", timeout=60)
        assert r.status_code == 200, r.text[:300]
        assert isinstance(r.json()["has_password"], bool)

    def test_verify_wrong_password(self, client):
        r = client.post(f"{BASE_URL}/api/settings/verify-profit-password",
                        json={"password": "definitely-wrong-xyz"}, timeout=60)
        # 400 when no password configured, 401 when configured but wrong
        assert r.status_code in (400, 401), f"{r.status_code} {r.text[:200]}"
        assert "detail" in r.json()


# ---------- Declined intake log ----------
class TestDeclinedIntakes:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/declined-intakes", timeout=30)
        assert r.status_code in (401, 403)

    def test_list(self, client):
        r = client.get(f"{BASE_URL}/api/declined-intakes", timeout=60)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, list)
        for i in data:
            assert "_id" not in i

    def test_create_and_persist(self, client):
        payload = {
            "category": "smartphone",
            "brand": "TEST_Nokia",
            "model": "TEST_G21",
            "imei_serial": "TEST_IMEI_" + os.urandom(3).hex(),
            "seller_name": "TEST_DeclinedSeller",
            "seller_phone": "9700001111",
            "seller_id_type": "Aadhaar",
            "seller_id_masked": "1234",
            "reason_declined": "IMEI blocked/blacklisted",
            "staff_notes": "TEST notes",
        }
        r = client.post(f"{BASE_URL}/api/declined-intakes", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text[:400]
        d = r.json()
        assert d["reason_declined"] == payload["reason_declined"]
        assert d["seller_name"] == payload["seller_name"]
        assert d["category"] == "smartphone"
        assert "id" in d

        # verify persisted via search
        g = client.get(f"{BASE_URL}/api/declined-intakes?search=TEST_DeclinedSeller", timeout=60)
        assert g.status_code == 200
        rows = g.json()
        assert any(x["id"] == d["id"] for x in rows), "created declined intake not returned by search"
        row = next(x for x in rows if x["id"] == d["id"])
        assert row["brand"] == "TEST_Nokia"
        assert row["staff_notes"] == "TEST notes"

    def test_create_missing_required_422(self, client):
        r = client.post(f"{BASE_URL}/api/declined-intakes", json={"brand": "TEST_X"}, timeout=60)
        assert r.status_code == 422, r.text[:300]

    def test_search_no_match(self, client):
        r = client.get(f"{BASE_URL}/api/declined-intakes?search=ZZZ_NO_MATCH_ZZZ", timeout=60)
        assert r.status_code == 200
        assert r.json() == []


# ---------- Module settings used by Settings page ----------
class TestModuleSettingsUI:
    def test_get_modules_shape(self, client):
        r = client.get(f"{BASE_URL}/api/tenants/modules", timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        for key in ("mobile_phone_trading", "it_equipment_trading"):
            m = d["available_modules"][key]
            assert m["name"]
            assert m["description"]
            assert isinstance(m["categories"], list)
            assert isinstance(m["enabled"], bool)
            assert isinstance(m["available_in_plan"], bool)

    def test_toggle_off_and_on(self, client):
        # turn IT off
        r = client.put(f"{BASE_URL}/api/tenants/modules",
                       json={"mobile_phone_trading": True, "it_equipment_trading": False}, timeout=60)
        assert r.status_code == 200, r.text[:300]
        g = client.get(f"{BASE_URL}/api/tenants/modules", timeout=60).json()
        assert g["enabled_modules"]["it_equipment_trading"] is False
        assert g["available_modules"]["it_equipment_trading"]["enabled"] is False

        # IT endpoints should now be blocked
        blocked = client.get(f"{BASE_URL}/api/used-devices/it", timeout=60)
        assert blocked.status_code == 403, f"expected 403 when module disabled, got {blocked.status_code}"

        # restore
        r2 = client.put(f"{BASE_URL}/api/tenants/modules",
                        json={"mobile_phone_trading": True, "it_equipment_trading": True}, timeout=60)
        assert r2.status_code == 200
        g2 = client.get(f"{BASE_URL}/api/tenants/modules", timeout=60).json()
        assert g2["enabled_modules"]["it_equipment_trading"] is True
        assert client.get(f"{BASE_URL}/api/used-devices/it", timeout=60).status_code == 200

    def test_invalid_module_key(self, client):
        r = client.put(f"{BASE_URL}/api/tenants/modules", json={"nope": True}, timeout=60)
        assert r.status_code == 400


@pytest.fixture(scope="session", autouse=True)
def cleanup(created_ids, client):
    yield
    for did in created_ids:
        try:
            client.post(f"{BASE_URL}/api/used-devices/{did}/cancel",
                        json={"reason": "TEST cleanup"}, timeout=60)
        except Exception:
            pass
    # make sure modules are enabled after the run
    try:
        client.put(f"{BASE_URL}/api/tenants/modules",
                   json={"mobile_phone_trading": True, "it_equipment_trading": True}, timeout=60)
    except Exception:
        pass
