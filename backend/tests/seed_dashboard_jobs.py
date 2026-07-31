"""Seed jobs into the demo tenant to verify dashboard stat-card filters (QA only)."""
import os
import sys
import asyncio
from datetime import datetime, timezone, timedelta

import requests
from dotenv import dotenv_values
from motor.motor_asyncio import AsyncIOMotorClient

fe = dotenv_values("/app/frontend/.env")
BASE = (os.environ.get("REACT_APP_BACKEND_URL") or fe["REACT_APP_BACKEND_URL"]).rstrip("/")
be = dotenv_values("/app/backend/.env")
MONGO_URL = be["MONGO_URL"]
DB_NAME = be["DB_NAME"]

STATUSES = ["received", "waiting_for_approval", "repaired", "closed"]


def login():
    r = requests.post(f"{BASE}/api/auth/login", json={
        "subdomain": "demo", "email": "admin@demo.com", "password": "demo123"})
    r.raise_for_status()
    d = r.json()
    return d.get("access_token") or d.get("token")


def create_jobs(token):
    ids = []
    for i, st in enumerate(STATUSES):
        payload = {
            "customer": {"name": f"TEST_QA_{st}", "mobile": f"90000000{i}"},
            "device": {"device_type": "Mobile", "brand": "TESTBrand", "model": f"M{i}",
                       "serial_imei": f"TESTIMEI{i}"},
            "accessories": [],
            "problem_description": f"TEST_QA seed job for {st}",
        }
        r = requests.post(f"{BASE}/api/jobs", json=payload,
                          headers={"Authorization": f"Bearer {token}"})
        print("create", st, r.status_code, r.text[:200] if r.status_code >= 400 else "")
        r.raise_for_status()
        ids.append((r.json()["id"], st))
    return ids


async def patch_statuses(ids):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    yesterday = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    for idx, (jid, st) in enumerate(ids):
        upd = {"status": st}
        # make the last two jobs older than today so the "today" filter is testable
        if idx >= 2:
            upd["created_at"] = yesterday
        await db.jobs.update_one({"id": jid}, {"$set": upd})
    print("patched", len(ids), "jobs")
    client.close()


async def cleanup():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    res = await db.jobs.delete_many({"customer.name": {"$regex": "^TEST_QA_"}})
    print("deleted", res.deleted_count)
    client.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "cleanup":
        asyncio.run(cleanup())
    else:
        tok = login()
        ids = create_jobs(tok)
        asyncio.run(patch_statuses(ids))
        s = requests.get(f"{BASE}/api/jobs/stats", headers={"Authorization": f"Bearer {tok}"})
        print("stats:", s.json())
