"""Backend tests for Mobile Phone Trading & IT Equipment Trading modules (used_devices)."""
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


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def creds():
    p = Path("/app/memory/test_credentials.md")
    if not p.exists():
        pytest.skip("missing credentials file")
    content = p.read_text(encoding="utf-8")
    # Demo Account block
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
    data = r.json()
    assert "token" in data
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
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


# ---------- Health / auth ----------
class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health", timeout=30)
        assert r.status_code == 200

    def test_used_devices_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/used-devices/mobile", timeout=30)
        assert r.status_code in (401, 403), r.text[:200]


# ---------- Module settings ----------
class TestModuleSettings:
    def test_get_modules(self, client):
        r = client.get(f"{BASE_URL}/api/tenants/modules", timeout=60)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert "enabled_modules" in d and "available_modules" in d
        for key in ("mobile_phone_trading", "it_equipment_trading"):
            assert key in d["available_modules"]
            m = d["available_modules"][key]
            assert "name" in m and "enabled" in m and "available_in_plan" in m
        assert d["available_modules"]["mobile_phone_trading"]["available_in_plan"] is True, \
            "mobile_phone_trading not available in demo tenant plan"
        assert d["available_modules"]["it_equipment_trading"]["available_in_plan"] is True, \
            "it_equipment_trading not available in demo tenant plan"

    def test_update_modules_invalid_key(self, client):
        r = client.put(f"{BASE_URL}/api/tenants/modules", json={"bogus_module": True}, timeout=60)
        assert r.status_code == 400, r.text[:300]

    def test_update_modules_roundtrip(self, client):
        payload = {"mobile_phone_trading": True, "it_equipment_trading": True}
        r = client.put(f"{BASE_URL}/api/tenants/modules", json=payload, timeout=60)
        assert r.status_code == 200, r.text[:300]
        g = client.get(f"{BASE_URL}/api/tenants/modules", timeout=60)
        assert g.json()["enabled_modules"] == payload


# ---------- List & stats ----------
class TestListAndStats:
    @pytest.mark.parametrize("module", ["mobile", "it"])
    def test_list(self, client, module):
        r = client.get(f"{BASE_URL}/api/used-devices/{module}", timeout=60)
        assert r.status_code == 200, r.text[:400]
        devices = r.json()
        assert isinstance(devices, list)
        for d in devices:
            assert d["module"] == module
            assert "_id" not in d
            assert "days_in_stock" in d

    def test_list_invalid_module(self, client):
        r = client.get(f"{BASE_URL}/api/used-devices/tablets", timeout=60)
        assert r.status_code == 400, r.text[:300]

    @pytest.mark.parametrize("module", ["mobile", "it"])
    def test_stats(self, client, module):
        r = client.get(f"{BASE_URL}/api/used-devices/{module}/stats", timeout=60)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        for k in ("in_stock", "pending_signature", "needs_repair", "sold_this_month",
                  "inventory_value", "total_devices", "module", "module_label"):
            assert k in d, f"missing {k}"
        assert d["module"] == module

    def test_stats_invalid_module(self, client):
        r = client.get(f"{BASE_URL}/api/used-devices/foo/stats", timeout=60)
        assert r.status_code == 400


# ---------- Create (BUY intake) ----------
class TestCreateMobile:
    def test_create_mobile_and_verify(self, client, created_ids):
        imei = luhn_imei("35123456" + "789012"[:6])
        payload = {
            "module": "mobile",
            "category": "smartphone",
            "brand": "TEST_Apple",
            "model": "TEST_iPhone 12",
            "variant": "128GB",
            "color": "Black",
            "imei_1": imei,
            "specs": {"storage": "128GB", "ram": "4GB", "battery_health": "89%"},
            "physical_condition": "Good",
            "working_status": "Fully Working",
            "purchase_price": 25000,
            "payment_mode": "cash",
            "seller_name": "TEST_Seller",
            "seller_phone": "9876543210",
            "id_proof_type": "aadhaar",
            "id_proof_number": "123456781234",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text[:500]
        d = r.json()
        created_ids.append(d["id"])
        assert d["module"] == "mobile"
        assert d["device_id"].startswith("MPT-"), d["device_id"]
        assert d["status"] == "pending_signature"
        assert d["imei_1"] == imei
        assert d["id_proof_number_masked"].endswith("1234")
        assert "1234567812" not in d["id_proof_number_masked"]

        # GET detail persistence
        g = client.get(f"{BASE_URL}/api/used-devices/detail/{d['id']}", timeout=60)
        assert g.status_code == 200, g.text[:300]
        gd = g.json()
        assert gd["brand"] == "TEST_Apple"
        assert gd["specs"]["storage"] == "128GB"
        assert "_id" not in gd

        # appears in module list, not in other module list
        lm = client.get(f"{BASE_URL}/api/used-devices/mobile", timeout=60).json()
        assert any(x["id"] == d["id"] for x in lm)
        li = client.get(f"{BASE_URL}/api/used-devices/it", timeout=60).json()
        assert all(x["id"] != d["id"] for x in li)

    def test_duplicate_imei_rejected(self, client, created_ids):
        imei = luhn_imei("35999911" + "223344")
        payload = {
            "module": "mobile", "category": "smartphone", "brand": "TEST_Samsung",
            "model": "TEST_S21", "imei_1": imei, "purchase_price": 100,
            "payment_mode": "cash", "seller_name": "TEST_Dup", "seller_phone": "9000000000",
            "id_proof_type": "aadhaar", "id_proof_number": "111122223333",
        }
        r1 = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r1.status_code in (200, 201), r1.text[:400]
        created_ids.append(r1.json()["id"])
        r2 = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r2.status_code == 400
        assert "already exists" in r2.json().get("detail", "")

    def test_invalid_imei_rejected(self, client):
        payload = {
            "module": "mobile", "category": "smartphone", "brand": "TEST_B", "model": "TEST_M",
            "imei_1": "123456789012345", "purchase_price": 1, "payment_mode": "cash",
            "seller_name": "TEST_X", "seller_phone": "9000000001",
            "id_proof_type": "aadhaar", "id_proof_number": "111122223334",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r.status_code == 400
        assert "IMEI" in r.json().get("detail", "")

    def test_missing_imei_rejected(self, client):
        payload = {
            "module": "mobile", "category": "smartphone", "brand": "TEST_B", "model": "TEST_M",
            "purchase_price": 1, "payment_mode": "cash", "seller_name": "TEST_X",
            "seller_phone": "9000000002", "id_proof_type": "aadhaar",
            "id_proof_number": "111122223335",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r.status_code == 400
        assert "IMEI 1 is required" in r.json().get("detail", "")

    def test_wrong_category_for_mobile(self, client):
        payload = {
            "module": "mobile", "category": "laptop", "brand": "TEST_B", "model": "TEST_M",
            "imei_1": luhn_imei("35888811223344"), "purchase_price": 1, "payment_mode": "cash",
            "seller_name": "TEST_X", "seller_phone": "9000000003",
            "id_proof_type": "aadhaar", "id_proof_number": "111122223336",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r.status_code == 400
        assert "Invalid category" in r.json().get("detail", "")


class TestCreateIT:
    def test_create_it_and_verify(self, client, created_ids):
        serial = "TEST_SN_" + os.urandom(4).hex().upper()
        payload = {
            "module": "it",
            "category": "laptop",
            "brand": "TEST_Dell",
            "model": "TEST_Latitude 5420",
            "serial_number": serial,
            "specs": {"processor": "i5-1135G7", "ram": "16GB", "storage": "512GB SSD"},
            "physical_condition": "Good",
            "working_status": "Fully Working",
            "purchase_price": 32000,
            "payment_mode": "upi",
            "seller_name": "TEST_ITSeller",
            "seller_phone": "9876500000",
            "id_proof_type": "pan",
            "id_proof_number": "ABCDE1234F",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text[:500]
        d = r.json()
        created_ids.append(d["id"])
        assert d["module"] == "it"
        assert d["device_id"].startswith("ITE-"), d["device_id"]
        assert d["serial_number"] == serial
        assert d["imei_1"] is None
        assert d["status"] == "pending_signature"

        g = client.get(f"{BASE_URL}/api/used-devices/detail/{d['device_id']}", timeout=60)
        assert g.status_code == 200, g.text[:300]
        assert g.json()["specs"]["ram"] == "16GB"

    def test_duplicate_serial_rejected(self, client, created_ids):
        serial = "TEST_DUP_" + os.urandom(3).hex().upper()
        payload = {
            "module": "it", "category": "monitor", "brand": "TEST_LG", "model": "TEST_27UL",
            "serial_number": serial, "purchase_price": 5000, "payment_mode": "cash",
            "seller_name": "TEST_S", "seller_phone": "9811111111",
            "id_proof_type": "pan", "id_proof_number": "ZZZZZ9999Z",
        }
        r1 = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r1.status_code in (200, 201), r1.text[:400]
        created_ids.append(r1.json()["id"])
        r2 = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r2.status_code == 400

    def test_wrong_category_for_it(self, client):
        payload = {
            "module": "it", "category": "smartphone", "brand": "TEST_B", "model": "TEST_M",
            "purchase_price": 1, "payment_mode": "cash", "seller_name": "TEST_X",
            "seller_phone": "9000000004", "id_proof_type": "pan", "id_proof_number": "AAAAA1111A",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r.status_code == 400

    def test_invalid_module_rejected(self, client):
        payload = {
            "module": "gadgets", "category": "laptop", "brand": "TEST_B", "model": "TEST_M",
            "purchase_price": 1, "payment_mode": "cash", "seller_name": "TEST_X",
            "seller_phone": "9000000005", "id_proof_type": "pan", "id_proof_number": "AAAAA1111B",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        assert r.status_code == 400

    def test_missing_required_field_422(self, client):
        r = client.post(f"{BASE_URL}/api/used-devices", json={"module": "it"}, timeout=60)
        assert r.status_code == 422


# ---------- Lifecycle: update, declaration, status, sell, cancel ----------
class TestLifecycle:
    @pytest.fixture(scope="class")
    def device(self, client, created_ids):
        imei = luhn_imei("35777711" + os.urandom(3).hex()[:6].replace("a", "1").replace("b", "2")
                         .replace("c", "3").replace("d", "4").replace("e", "5").replace("f", "6"))
        payload = {
            "module": "mobile", "category": "tablet", "brand": "TEST_Lenovo",
            "model": "TEST_Tab P11", "imei_1": imei, "purchase_price": 12000,
            "payment_mode": "cash", "seller_name": "TEST_Life", "seller_phone": "9700000000",
            "id_proof_type": "aadhaar", "id_proof_number": "555566667777",
        }
        r = client.post(f"{BASE_URL}/api/used-devices", json=payload, timeout=60)
        if r.status_code not in (200, 201):
            pytest.fail(f"setup create failed: {r.status_code} {r.text[:300]}")
        d = r.json()
        created_ids.append(d["id"])
        return d

    def test_update_persists(self, client, device):
        r = client.put(f"{BASE_URL}/api/used-devices/{device['id']}",
                       json={"purchase_price": 11500, "edit_reason": "TEST price correction"},
                       timeout=60)
        assert r.status_code == 200, r.text[:400]
        g = client.get(f"{BASE_URL}/api/used-devices/detail/{device['id']}", timeout=60)
        assert g.json()["purchase_price"] == 11500

    def test_generate_and_sign_declaration(self, client, device):
        r = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/generate-declaration",
                        json={}, timeout=60)
        assert r.status_code == 200, r.text[:400]
        s = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/sign-declaration",
                        json={"signature_data": "data:image/png;base64,iVBORw0KGgo="}, timeout=60)
        assert s.status_code == 200, s.text[:400]
        g = client.get(f"{BASE_URL}/api/used-devices/detail/{device['id']}", timeout=60).json()
        assert g["declaration_signed"] is True
        assert g["status"] == "in_stock", f"expected in_stock after signing, got {g['status']}"

    def test_sell_and_margin_hidden(self, client, device):
        r = client.post(f"{BASE_URL}/api/used-devices/{device['id']}/sell",
                        json={"selling_price": 14000, "buyer_name": "TEST_Buyer",
                              "buyer_phone": "9600000000", "payment_mode": "cash"}, timeout=60)
        assert r.status_code == 200, r.text[:400]
        g = client.get(f"{BASE_URL}/api/used-devices/detail/{device['id']}", timeout=60).json()
        assert g["status"] == "sold"
        assert g["selling_price"] == 14000
        assert g["margin"] is None, "margin must be masked without password verification"

    def test_verify_profit_requires_password(self, client):
        r = client.post(f"{BASE_URL}/api/used-devices/mobile/stats/verify-profit",
                        json={"password": "definitely-wrong"}, timeout=60)
        assert r.status_code in (400, 401), f"{r.status_code} {r.text[:200]}"

    def test_detail_not_found(self, client):
        r = client.get(f"{BASE_URL}/api/used-devices/detail/NOPE-9999", timeout=60)
        assert r.status_code == 404


# ---------- Cleanup ----------
@pytest.fixture(scope="session", autouse=True)
def cleanup(created_ids, client):
    yield
    for did in created_ids:
        try:
            client.post(f"{BASE_URL}/api/used-devices/{did}/cancel",
                        json={"reason": "TEST cleanup"}, timeout=60)
        except Exception:
            pass
