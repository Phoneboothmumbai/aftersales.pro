"""
Backend tests for Resend email integration (aftersales.pro)
Covers:
  - POST /api/auth/forgot-password
  - POST /api/auth/reset-password
  - POST /api/super-admin/trigger-email-checks
  - POST /api/tenants/signup (welcome email trigger)
  - Background email scheduler startup log
  - email_service module unit checks
"""
import os
import re
import time
import uuid
import asyncio
import subprocess
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

BACKEND_LOGS = ["/var/log/supervisor/backend.err.log", "/var/log/supervisor/backend.out.log"]


def read_logs(tail=800):
    content = ""
    for path in BACKEND_LOGS:
        if Path(path).exists():
            try:
                content += subprocess.run(
                    ["tail", "-n", str(tail), path], capture_output=True, text=True
                ).stdout
            except Exception:
                pass
    return content


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def creds():
    content = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    assert "superadmin@aftersales.pro" in content
    return {
        "super_admin": {"email": "superadmin@aftersales.pro", "password": "SuperAdmin@123"},
        "tenant": {"subdomain": "demo", "email": "admin@demo.com", "password": "demo123"},
    }


@pytest.fixture(scope="session")
def super_admin_token(api, creds):
    r = api.post(f"{BASE_URL}/api/super-admin/login", json=creds["super_admin"])
    if r.status_code != 200:
        pytest.fail(f"Super admin login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("token")
    assert token
    return token


# ==================== Health ====================
class TestHealth:
    def test_health(self, api):
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"


# ==================== Forgot password ====================
class TestForgotPassword:
    GENERIC = "If the email exists, a reset link has been sent"

    def test_forgot_password_valid_user(self, api, creds):
        r = api.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": creds["tenant"]["email"],
            "subdomain": creds["tenant"]["subdomain"],
        })
        assert r.status_code == 200, r.text[:300]
        assert r.json()["message"] == self.GENERIC

    def test_forgot_password_unknown_email_same_response(self, api, creds):
        r = api.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": f"TEST_nobody_{uuid.uuid4().hex[:6]}@example.com",
            "subdomain": creds["tenant"]["subdomain"],
        })
        assert r.status_code == 200
        assert r.json()["message"] == self.GENERIC

    def test_forgot_password_unknown_subdomain(self, api):
        r = api.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "admin@demo.com",
            "subdomain": f"nosuch{uuid.uuid4().hex[:6]}",
        })
        assert r.status_code == 200
        assert r.json()["message"] == self.GENERIC

    def test_forgot_password_invalid_email_format(self, api, creds):
        r = api.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "not-an-email",
            "subdomain": creds["tenant"]["subdomain"],
        })
        assert r.status_code == 422

    def test_forgot_password_missing_subdomain(self, api):
        r = api.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "admin@demo.com"})
        assert r.status_code == 422

    def test_forgot_password_attempts_email_send(self, api, creds):
        """Verify a Resend send attempt is logged (success or domain-verification error)."""
        api.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": creds["tenant"]["email"],
            "subdomain": creds["tenant"]["subdomain"],
        })
        time.sleep(6)
        logs = read_logs()
        assert ("Email sent to admin@demo.com" in logs
                or "Failed to send email to admin@demo.com" in logs), \
            "No Resend send attempt logged for password reset email"


# ==================== Reset password with token ====================
class TestResetPassword:
    def test_reset_with_invalid_token(self, api):
        r = api.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": str(uuid.uuid4()), "new_password": "NewPass@123"
        })
        assert r.status_code == 400
        assert "Invalid or expired" in r.json()["detail"]

    def test_reset_missing_fields(self, api):
        r = api.post(f"{BASE_URL}/api/auth/reset-password", json={"token": "abc"})
        assert r.status_code == 422

    def test_full_reset_flow_and_login(self, api, creds):
        """E2E: signup temp tenant -> forgot-password -> read token from DB -> reset -> login."""
        from motor.motor_asyncio import AsyncIOMotorClient
        backend_env = dotenv_values("/app/backend/.env")
        mongo_url = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")
        assert mongo_url and db_name

        suffix = uuid.uuid4().hex[:8]
        sub = f"testreset{suffix}"
        email = f"TEST_reset_{suffix}@example.com"
        signup = api.post(f"{BASE_URL}/api/tenants/signup", json={
            "company_name": f"TEST_Shop_{suffix}",
            "subdomain": sub,
            "admin_name": "TEST Owner",
            "admin_email": email,
            "admin_password": "OldPass@123",
        })
        assert signup.status_code == 200, signup.text[:300]

        fp = api.post(f"{BASE_URL}/api/auth/forgot-password",
                      json={"email": email, "subdomain": sub})
        assert fp.status_code == 200

        async def fetch_token():
            client = AsyncIOMotorClient(mongo_url)
            try:
                rec = await client[db_name].password_resets.find_one(
                    {"email": email.lower(), "used": False}, {"_id": 0})
                return rec
            finally:
                client.close()

        rec = asyncio.run(fetch_token())
        assert rec is not None, "password_resets record not created"
        assert rec["used"] is False
        token = rec["token"]

        # short password rejected
        short = api.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"token": token, "new_password": "123"})
        assert short.status_code == 400
        assert "at least 6" in short.json()["detail"]

        ok = api.post(f"{BASE_URL}/api/auth/reset-password",
                      json={"token": token, "new_password": "BrandNew@456"})
        assert ok.status_code == 200, ok.text[:300]
        assert "Password reset successfully" in ok.json()["message"]

        # login with new password works
        login = api.post(f"{BASE_URL}/api/auth/login", json={
            "email": email, "password": "BrandNew@456", "subdomain": sub})
        assert login.status_code == 200, login.text[:300]
        assert login.json()["user"]["email"] == email.lower()

        # old password fails
        old = api.post(f"{BASE_URL}/api/auth/login", json={
            "email": email, "password": "OldPass@123", "subdomain": sub})
        assert old.status_code == 401

        # token cannot be reused
        reuse = api.post(f"{BASE_URL}/api/auth/reset-password",
                         json={"token": token, "new_password": "Another@789"})
        assert reuse.status_code == 400

        # cleanup
        async def cleanup():
            client = AsyncIOMotorClient(mongo_url)
            try:
                d = client[db_name]
                t = await d.tenants.find_one({"subdomain": sub}, {"_id": 0})
                if t:
                    await d.users.delete_many({"tenant_id": t["id"]})
                    await d.branches.delete_many({"tenant_id": t["id"]})
                    await d.tenants.delete_one({"id": t["id"]})
                await d.password_resets.delete_many({"email": email.lower()})
            finally:
                client.close()
        asyncio.run(cleanup())


# ==================== Signup welcome email ====================
class TestSignupWelcomeEmail:
    def test_signup_triggers_welcome_and_admin_alert(self, api):
        from motor.motor_asyncio import AsyncIOMotorClient
        backend_env = dotenv_values("/app/backend/.env")
        mongo_url = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")

        suffix = uuid.uuid4().hex[:8]
        sub = f"testwel{suffix}"
        email = f"TEST_welcome_{suffix}@example.com"
        r = api.post(f"{BASE_URL}/api/tenants/signup", json={
            "company_name": f"TEST_Welcome_{suffix}",
            "subdomain": sub,
            "admin_name": "TEST Welcome Owner",
            "admin_email": email,
            "admin_password": "Welcome@123",
        })
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body["tenant"]["subdomain"] == sub
        assert body["user"]["email"] == email.lower()
        assert body["token"]

        time.sleep(8)
        logs = read_logs(1200)
        welcome_attempt = (f"Email sent to {email}" in logs) or (f"Failed to send email to {email}" in logs)
        admin_alert = ("Email sent to admin@aftersales.pro" in logs) or ("Failed to send email to admin@aftersales.pro" in logs)

        async def cleanup():
            client = AsyncIOMotorClient(mongo_url)
            try:
                d = client[db_name]
                t = await d.tenants.find_one({"subdomain": sub}, {"_id": 0})
                if t:
                    await d.users.delete_many({"tenant_id": t["id"]})
                    await d.branches.delete_many({"tenant_id": t["id"]})
                    await d.tenants.delete_one({"id": t["id"]})
            finally:
                client.close()
        asyncio.run(cleanup())

        assert welcome_attempt, f"No welcome email attempt logged for {email}"
        assert admin_alert, "No new-signup admin alert email attempt logged"

    def test_signup_duplicate_subdomain_rejected(self, api, creds):
        r = api.post(f"{BASE_URL}/api/tenants/signup", json={
            "company_name": "TEST_Dup",
            "subdomain": creds["tenant"]["subdomain"],
            "admin_name": "Dup",
            "admin_email": f"TEST_dup_{uuid.uuid4().hex[:6]}@example.com",
            "admin_password": "Dup@12345",
        })
        assert r.status_code == 400
        assert "Subdomain already taken" in r.json()["detail"]


# ==================== Super admin trigger email checks ====================
class TestTriggerEmailChecks:
    def test_requires_auth(self, api):
        r = requests.post(f"{BASE_URL}/api/super-admin/trigger-email-checks")
        assert r.status_code in (401, 403)

    def test_rejects_tenant_token(self, api, creds):
        login = api.post(f"{BASE_URL}/api/auth/login", json=creds["tenant"])
        assert login.status_code == 200, login.text[:300]
        t = login.json()["token"]
        r = requests.post(f"{BASE_URL}/api/super-admin/trigger-email-checks",
                          headers={"Authorization": f"Bearer {t}"})
        assert r.status_code == 403

    def test_trigger_email_checks_success(self, super_admin_token):
        r = requests.post(f"{BASE_URL}/api/super-admin/trigger-email-checks",
                          headers={"Authorization": f"Bearer {super_admin_token}"},
                          timeout=120)
        assert r.status_code == 200, r.text[:300]
        body = r.json()
        assert body.get("status") == "success", f"Trigger returned error: {body}"
        assert body.get("message") == "Email checks completed"


# ==================== Scheduler startup ====================
class TestScheduler:
    def test_scheduler_started_log(self):
        logs = read_logs(3000)
        assert "Background email scheduler started" in logs, \
            "Scheduler startup log not found in backend logs"


# ==================== email_service module ====================
class TestEmailServiceModule:
    def test_api_key_and_sender_configured(self):
        import sys
        sys.path.insert(0, "/app/backend")
        import resend
        import email_service as es
        assert resend.api_key, "RESEND_API_KEY not configured"
        assert es.SENDER_EMAIL
        assert es.ADMIN_EMAIL

    def test_templates_render(self):
        import sys
        sys.path.insert(0, "/app/backend")
        import email_service as es
        t = es.welcome_email_template("Shop", "Owner", "sub")
        assert "Owner" in t["subject"] and "sub" in t["html"]
        t = es.password_reset_email_template("Owner", "https://x/y?token=abc")
        assert "token=abc" in t["html"]
        t = es.payment_success_email_template("Owner", "Pro", 999.0, "INV-1")
        assert "999.00" in t["html"] and "INV-1" in t["html"]
        t = es.trial_ending_email_template("Owner", 1, "https://x")
        assert "1 day" in t["subject"] and "days" not in t["subject"]
        t = es.inactive_reminder_email_template("Owner", 45, "https://x")
        assert "Remember us?" in t["html"]

    def test_send_email_returns_structured_result(self):
        import sys
        sys.path.insert(0, "/app/backend")
        import email_service as es
        res = asyncio.run(es.send_email("delivered@resend.dev", "TEST_probe", "<p>probe</p>"))
        assert isinstance(res, dict)
        assert "success" in res
        if not res["success"]:
            assert "error" in res
