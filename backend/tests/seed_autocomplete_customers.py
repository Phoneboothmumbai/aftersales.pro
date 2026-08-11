"""Seed a few TEST_ customers (via jobs) into demo tenant for autocomplete testing."""
import requests
from dotenv import dotenv_values

BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email": "admin@demo.com", "password": "demo123", "subdomain": "demo"})
r.raise_for_status()
s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})

CUSTOMERS = [
    ("TEST_Rajesh Kumar", "9876543210", "rajesh@test.com"),
    ("TEST_Rajesh Sharma", "9876511111", "rajeshs@test.com"),
    ("TEST_Priya Verma", "9812345678", "priya@test.com"),
    ("TEST_Amit Patel", "9700000001", "amit@test.com"),
]

created = []
for name, mobile, email in CUSTOMERS:
    for i in range(2 if name.endswith("Kumar") else 1):
        payload = {
            "customer": {"name": name, "mobile": mobile, "email": email},
            "device": {"device_type": "Mobile", "brand": "Samsung", "model": "A50",
                       "serial_imei": f"IMEI{mobile}{i}", "condition": "Good",
                       "condition_notes": "", "notes": "", "password": "", "unlock_pattern": ""},
            "accessories": [{"name": "Charger", "checked": True}],
            "problem_description": "TEST_seed job for autocomplete",
            "technician_observation": "",
        }
        resp = s.post(f"{BASE}/api/jobs", json=payload)
        print(name, resp.status_code, resp.text[:200] if resp.status_code != 200 else resp.json().get("job_number"))
        if resp.status_code == 200:
            created.append(resp.json()["id"])

print("created", len(created))
print(s.get(f"{BASE}/api/customers/autocomplete", params={"q": "TEST_Raj"}).text[:600])
print(s.get(f"{BASE}/api/customers/autocomplete", params={"q": "98765"}).text[:600])
