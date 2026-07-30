"""Cleanup of iteration-18 UI test data: cancel test devices, remove TEST_ declined intakes,
and unset the profit password that was set for margin-lock testing."""
import asyncio
import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    res = await db.declined_intakes.delete_many({"seller_name": {"$regex": "^TEST_"}})
    print("declined_intakes deleted:", res.deleted_count)

    res2 = await db.used_devices.update_many(
        {"brand": {"$regex": "^TEST_"}, "status": {"$in": ["pending_signature", "in_stock", "needs_repair"]}},
        {"$set": {"status": "cancelled", "cancel_reason": "TEST cleanup iteration 18"}},
    )
    print("test devices cancelled:", res2.modified_count)

    res3 = await db.tenants.update_one({"subdomain": "demo"}, {"$unset": {"profit_password": ""}})
    print("profit_password unset:", res3.modified_count)
    client.close()


asyncio.run(main())
