"""Probe (not assertions): edge-case behaviour of PUT /api/customers/{mobile}."""
import time
import requests
from dotenv import dotenv_values

BASE_URL = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
s = requests.Session()
r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@demo.com", "password": "demo123", "subdomain": "demo"})
s.headers.update({"Authorization": f"Bearer {r.json()['token']}"})

mobile = "7" + str(int(time.time()))[-9:]
job = s.post(f"{BASE_URL}/api/jobs", json={
    "customer": {"name": "TEST_Edge", "mobile": mobile, "email": None},
    "device": {"device_type": "Mobile", "brand": "B", "model": "M"},
    "accessories": [], "problem_description": "TEST_ edge"}).json()
print("job", job.get("id"), job.get("job_number"))

print("empty name ->", s.put(f"{BASE_URL}/api/customers/{mobile}", json={"name": "", "mobile": mobile}).status_code)
print("blank mobile ->", s.put(f"{BASE_URL}/api/customers/{mobile}", json={"name": "TEST_Edge", "mobile": ""}).status_code)
print("junk mobile ->", s.put(f"{BASE_URL}/api/customers/{mobile}", json={"name": "TEST_Edge", "mobile": "abc"}).status_code)
print("bad email ->", s.put(f"{BASE_URL}/api/customers/{mobile}", json={"name": "TEST_Edge", "mobile": mobile, "email": "not-an-email"}).status_code)

# collision with an existing customer's mobile
customers = s.get(f"{BASE_URL}/api/customers").json()["customers"]
other = next((c for c in customers if c["mobile"] != mobile), None)
if other:
    resp = s.put(f"{BASE_URL}/api/customers/{mobile}", json={"name": "TEST_Edge", "mobile": other["mobile"]})
    print("collision with", other["mobile"], other["name"], "->", resp.status_code, resp.text[:200])
    after = [c for c in s.get(f"{BASE_URL}/api/customers").json()["customers"] if c["mobile"] == other["mobile"]]
    print("after collision entry:", after)

from pymongo import MongoClient
env = dotenv_values("/app/backend/.env")
mc = MongoClient(env["MONGO_URL"])
mc[env["DB_NAME"]].jobs.delete_many({"id": job.get("id")})
print("cleaned up")
