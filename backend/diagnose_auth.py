#!/usr/bin/env python3
"""
Diagnostic script for aftersales.pro authentication issues
Run this on your production server to debug login problems
"""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "aftersales_pro")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception as e:
        print(f"  ERROR verifying password: {e}")
        return False

async def diagnose():
    print("=" * 60)
    print("AFTERSALES.PRO AUTHENTICATION DIAGNOSTIC")
    print("=" * 60)
    
    print(f"\n1. Connecting to MongoDB: {MONGO_URL}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Check Super Admin
    print("\n2. Checking Super Admin...")
    super_admin = await db.super_admins.find_one({"email": "superadmin@aftersales.pro"})
    if super_admin:
        print(f"   ✓ Found: {super_admin.get('email')}")
        print(f"   ✓ Name: {super_admin.get('name')}")
        stored_hash = super_admin.get('password_hash') or super_admin.get('password')
        if stored_hash:
            print(f"   ✓ Password hash exists (length: {len(stored_hash)})")
            print(f"   ✓ Hash preview: {stored_hash[:20]}...")
            
            # Test password
            test_result = verify_password("SuperAdmin@123", stored_hash)
            print(f"   ✓ Password 'SuperAdmin@123' valid: {test_result}")
            
            if not test_result:
                print("\n   FIXING: Resetting Super Admin password...")
                new_hash = hash_password("SuperAdmin@123")
                await db.super_admins.update_one(
                    {"email": "superadmin@aftersales.pro"},
                    {"$set": {"password_hash": new_hash}}
                )
                print(f"   ✓ New hash: {new_hash[:20]}...")
                print("   ✓ Password reset to: SuperAdmin@123")
        else:
            print("   ✗ NO PASSWORD HASH FOUND!")
            new_hash = hash_password("SuperAdmin@123")
            await db.super_admins.update_one(
                {"email": "superadmin@aftersales.pro"},
                {"$set": {"password_hash": new_hash}}
            )
            print(f"   ✓ Created new hash: {new_hash[:20]}...")
    else:
        print("   ✗ Super Admin NOT FOUND! Creating...")
        import uuid
        from datetime import datetime, timezone
        new_admin = {
            "id": str(uuid.uuid4()),
            "name": "Super Admin",
            "email": "superadmin@aftersales.pro",
            "password_hash": hash_password("SuperAdmin@123"),
            "role": "super_admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.super_admins.insert_one(new_admin)
        print("   ✓ Created Super Admin with password: SuperAdmin@123")
    
    # Check tenants/shops
    print("\n3. Checking Shops (Tenants)...")
    tenants = await db.tenants.find({}, {"company_name": 1, "subdomain": 1}).to_list(5)
    print(f"   Found {len(tenants)} shops:")
    for t in tenants:
        print(f"   - {t.get('company_name')} (subdomain: {t.get('subdomain')})")
    
    # Check users
    print("\n4. Checking Users...")
    users = await db.users.find({}, {"email": 1, "name": 1, "tenant_id": 1, "password": 1}).to_list(5)
    print(f"   Found {len(users)} users:")
    for u in users:
        has_pass = "✓" if u.get('password') else "✗"
        print(f"   - {u.get('email')} ({has_pass} password)")
    
    # Create a test shop if none exist
    if len(tenants) == 0:
        print("\n5. Creating Demo Shop...")
        import uuid
        from datetime import datetime, timezone, timedelta
        
        tenant_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        tenant = {
            "id": tenant_id,
            "company_name": "Demo Shop",
            "subdomain": "demo",
            "settings": {"theme": "light"},
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        }
        await db.tenants.insert_one(tenant)
        
        user = {
            "id": user_id,
            "tenant_id": tenant_id,
            "name": "Demo Admin",
            "email": "admin@demo.com",
            "password": hash_password("Demo@123"),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
        print("   ✓ Created Demo Shop")
        print("   ✓ Subdomain: demo")
        print("   ✓ Email: admin@demo.com")
        print("   ✓ Password: Demo@123")
    
    print("\n" + "=" * 60)
    print("DIAGNOSIS COMPLETE")
    print("=" * 60)
    print("\nLogin Credentials:")
    print("  Super Admin: https://aftersales.pro/super-admin")
    print("    Email: superadmin@aftersales.pro")
    print("    Password: SuperAdmin@123")
    print("\n  Shop Login: https://aftersales.pro/login")
    print("    Subdomain: demo")
    print("    Email: admin@demo.com")
    print("    Password: Demo@123")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(diagnose())
