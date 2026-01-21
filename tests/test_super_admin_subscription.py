"""
Test Suite for Super Admin Subscription Management Features
Tests: Login, Plans, Assign Plan, Extend Validity, Record Payment, View Payments, Action Logs
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aftersales-repair.preview.emergentagent.com').rstrip('/')

# Super Admin credentials
SUPER_ADMIN_EMAIL = "superadmin@aftersales.pro"
SUPER_ADMIN_PASSWORD = "SuperAdmin@123"


class TestSuperAdminSetup:
    """Setup super admin if not exists"""
    
    def test_setup_super_admin(self):
        """Setup super admin (may already exist)"""
        response = requests.post(f"{BASE_URL}/api/super-admin/setup")
        # Either 200 (created) or 400 (already exists) is acceptable
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        if response.status_code == 200:
            print("Super admin created successfully")
        else:
            print("Super admin already exists")


class TestSuperAdminLogin:
    """Test Super Admin Login functionality"""
    
    def test_login_success(self):
        """Test successful super admin login"""
        response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        assert data["user"]["role"] == "super_admin"
        print(f"Login successful, token received")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_login_invalid_email(self):
        """Test login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
            "email": "nonexistent@aftersales.pro",
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


@pytest.fixture(scope="class")
def super_admin_token():
    """Get super admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Super admin login failed")


@pytest.fixture(scope="class")
def auth_headers(super_admin_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {super_admin_token}"}


@pytest.fixture(scope="class")
def test_tenant_id(auth_headers):
    """Get a test tenant ID for testing"""
    response = requests.get(f"{BASE_URL}/api/super-admin/tenants", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]["id"]
    pytest.skip("No tenants available for testing")


class TestSubscriptionPlans:
    """Test subscription plans endpoint"""
    
    def test_get_plans_requires_auth(self):
        """Test that plans endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_plans_success(self, auth_headers):
        """Test getting subscription plans"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get plans: {response.text}"
        plans = response.json()
        
        # Verify all expected plans exist
        assert "free" in plans, "Free plan missing"
        assert "basic" in plans, "Basic plan missing"
        assert "pro" in plans, "Pro plan missing"
        assert "enterprise" in plans, "Enterprise plan missing"
        
        # Verify plan structure
        for plan_key, plan in plans.items():
            assert "name" in plan, f"Plan {plan_key} missing name"
            assert "price" in plan, f"Plan {plan_key} missing price"
            assert "features" in plan, f"Plan {plan_key} missing features"
            assert "max_users" in plan, f"Plan {plan_key} missing max_users"
            assert "max_jobs_per_month" in plan, f"Plan {plan_key} missing max_jobs_per_month"
        
        # Verify specific plan prices
        assert plans["free"]["price"] == 0, "Free plan should be ₹0"
        assert plans["basic"]["price"] == 499, "Basic plan should be ₹499"
        assert plans["pro"]["price"] == 999, "Pro plan should be ₹999"
        assert plans["enterprise"]["price"] == 2499, "Enterprise plan should be ₹2499"
        
        print(f"Plans retrieved: {list(plans.keys())}")


class TestAssignPlan:
    """Test plan assignment functionality"""
    
    def test_assign_plan_requires_auth(self, test_tenant_id):
        """Test that assign plan requires authentication"""
        response = requests.post(f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/assign-plan", json={
            "plan": "basic",
            "duration_months": 1
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_assign_basic_plan(self, auth_headers, test_tenant_id):
        """Test assigning basic plan to tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/assign-plan",
            headers=auth_headers,
            json={
                "plan": "basic",
                "duration_months": 1,
                "notes": "Test assignment from pytest"
            }
        )
        assert response.status_code == 200, f"Failed to assign plan: {response.text}"
        data = response.json()
        assert "message" in data, "Response missing message"
        assert "tenant" in data, "Response missing tenant"
        assert data["tenant"]["subscription_plan"] == "basic", "Plan not updated"
        assert data["tenant"]["subscription_status"] == "paid", "Status not updated to paid"
        print(f"Basic plan assigned successfully")
    
    def test_assign_pro_plan(self, auth_headers, test_tenant_id):
        """Test assigning pro plan to tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/assign-plan",
            headers=auth_headers,
            json={
                "plan": "pro",
                "duration_months": 3,
                "notes": "Upgraded to Pro for 3 months"
            }
        )
        assert response.status_code == 200, f"Failed to assign plan: {response.text}"
        data = response.json()
        assert data["tenant"]["subscription_plan"] == "pro"
        print(f"Pro plan assigned for 3 months")
    
    def test_assign_free_plan(self, auth_headers, test_tenant_id):
        """Test assigning free plan (downgrade)"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/assign-plan",
            headers=auth_headers,
            json={
                "plan": "free",
                "duration_months": 1,
                "notes": "Downgraded to free"
            }
        )
        assert response.status_code == 200, f"Failed to assign plan: {response.text}"
        data = response.json()
        assert data["tenant"]["subscription_plan"] == "free"
        assert data["tenant"]["subscription_status"] == "free"
        print(f"Free plan assigned (downgrade)")
    
    def test_assign_invalid_plan(self, auth_headers, test_tenant_id):
        """Test assigning invalid plan"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/assign-plan",
            headers=auth_headers,
            json={
                "plan": "invalid_plan",
                "duration_months": 1
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_assign_plan_nonexistent_tenant(self, auth_headers):
        """Test assigning plan to non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/nonexistent-tenant-id/assign-plan",
            headers=auth_headers,
            json={
                "plan": "basic",
                "duration_months": 1
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestExtendValidity:
    """Test extend validity functionality"""
    
    def test_extend_validity_requires_auth(self, test_tenant_id):
        """Test that extend validity requires authentication"""
        response = requests.post(f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/extend-validity", json={
            "days": 30
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_extend_validity_30_days(self, auth_headers, test_tenant_id):
        """Test extending validity by 30 days"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/extend-validity",
            headers=auth_headers,
            json={
                "days": 30,
                "reason": "Customer requested extension"
            }
        )
        assert response.status_code == 200, f"Failed to extend validity: {response.text}"
        data = response.json()
        assert "message" in data, "Response missing message"
        assert "new_end_date" in data, "Response missing new_end_date"
        assert "tenant" in data, "Response missing tenant"
        assert "30 days" in data["message"], "Message should mention 30 days"
        print(f"Validity extended by 30 days, new end: {data['new_end_date']}")
    
    def test_extend_validity_7_days(self, auth_headers, test_tenant_id):
        """Test extending validity by 7 days"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/extend-validity",
            headers=auth_headers,
            json={
                "days": 7,
                "reason": "Short extension for evaluation"
            }
        )
        assert response.status_code == 200, f"Failed to extend validity: {response.text}"
        data = response.json()
        assert "7 days" in data["message"]
        print(f"Validity extended by 7 days")
    
    def test_extend_validity_nonexistent_tenant(self, auth_headers):
        """Test extending validity for non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/nonexistent-tenant-id/extend-validity",
            headers=auth_headers,
            json={
                "days": 30
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestRecordPayment:
    """Test record payment functionality"""
    
    def test_record_payment_requires_auth(self, test_tenant_id):
        """Test that record payment requires authentication"""
        response = requests.post(f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/record-payment", json={
            "amount": 499,
            "payment_mode": "cash"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_record_cash_payment(self, auth_headers, test_tenant_id):
        """Test recording a cash payment"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/record-payment",
            headers=auth_headers,
            json={
                "amount": 499,
                "payment_mode": "cash",
                "notes": "Cash payment received at office"
            }
        )
        assert response.status_code == 200, f"Failed to record payment: {response.text}"
        data = response.json()
        assert "message" in data, "Response missing message"
        assert "payment" in data, "Response missing payment"
        assert data["payment"]["amount"] == 499
        assert data["payment"]["payment_mode"] == "cash"
        print(f"Cash payment of ₹499 recorded")
    
    def test_record_upi_payment_with_plan(self, auth_headers, test_tenant_id):
        """Test recording UPI payment with plan activation"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/record-payment",
            headers=auth_headers,
            json={
                "amount": 999,
                "payment_mode": "upi",
                "reference_number": "UPI123456789",
                "plan": "pro",
                "duration_months": 1,
                "notes": "UPI payment for Pro plan"
            }
        )
        assert response.status_code == 200, f"Failed to record payment: {response.text}"
        data = response.json()
        assert data["payment"]["amount"] == 999
        assert data["payment"]["payment_mode"] == "upi"
        assert data["payment"]["reference_number"] == "UPI123456789"
        assert data["payment"]["plan"] == "pro"
        # Verify plan was activated
        assert data["tenant"]["subscription_plan"] == "pro"
        assert data["tenant"]["subscription_status"] == "paid"
        print(f"UPI payment of ₹999 recorded with Pro plan activation")
    
    def test_record_bank_transfer_payment(self, auth_headers, test_tenant_id):
        """Test recording bank transfer payment"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/record-payment",
            headers=auth_headers,
            json={
                "amount": 2499,
                "payment_mode": "bank_transfer",
                "reference_number": "NEFT123456",
                "plan": "enterprise",
                "duration_months": 1,
                "notes": "Bank transfer for Enterprise plan"
            }
        )
        assert response.status_code == 200, f"Failed to record payment: {response.text}"
        data = response.json()
        assert data["payment"]["payment_mode"] == "bank_transfer"
        assert data["tenant"]["subscription_plan"] == "enterprise"
        print(f"Bank transfer payment recorded with Enterprise plan")
    
    def test_record_payment_nonexistent_tenant(self, auth_headers):
        """Test recording payment for non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/nonexistent-tenant-id/record-payment",
            headers=auth_headers,
            json={
                "amount": 499,
                "payment_mode": "cash"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestViewPayments:
    """Test view payments functionality"""
    
    def test_get_tenant_payments_requires_auth(self, test_tenant_id):
        """Test that get payments requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/payments")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_tenant_payments(self, auth_headers, test_tenant_id):
        """Test getting payments for a tenant"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/payments",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get payments: {response.text}"
        payments = response.json()
        assert isinstance(payments, list), "Payments should be a list"
        
        # Verify payment structure if payments exist
        if len(payments) > 0:
            payment = payments[0]
            assert "id" in payment, "Payment missing id"
            assert "amount" in payment, "Payment missing amount"
            assert "payment_mode" in payment, "Payment missing payment_mode"
            assert "created_at" in payment, "Payment missing created_at"
            print(f"Found {len(payments)} payments for tenant")
        else:
            print("No payments found for tenant")
    
    def test_get_tenant_payments_nonexistent(self, auth_headers):
        """Test getting payments for non-existent tenant"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/nonexistent-tenant-id/payments",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestActionLogs:
    """Test action logs functionality"""
    
    def test_get_action_logs_requires_auth(self, test_tenant_id):
        """Test that get action logs requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/action-logs")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_action_logs(self, auth_headers, test_tenant_id):
        """Test getting action logs for a tenant"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/action-logs",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get action logs: {response.text}"
        logs = response.json()
        assert isinstance(logs, list), "Logs should be a list"
        
        # Verify log structure if logs exist
        if len(logs) > 0:
            log = logs[0]
            assert "id" in log, "Log missing id"
            assert "action" in log, "Log missing action"
            assert "performed_by" in log, "Log missing performed_by"
            assert "created_at" in log, "Log missing created_at"
            
            # Verify action types
            valid_actions = ["plan_assigned", "validity_extended", "payment_recorded"]
            assert log["action"] in valid_actions, f"Invalid action type: {log['action']}"
            print(f"Found {len(logs)} action logs for tenant")
        else:
            print("No action logs found for tenant")
    
    def test_get_action_logs_nonexistent(self, auth_headers):
        """Test getting action logs for non-existent tenant"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/nonexistent-tenant-id/action-logs",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestTenantDetails:
    """Test tenant details with subscription info"""
    
    def test_get_tenant_details(self, auth_headers, test_tenant_id):
        """Test getting tenant details includes subscription info"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get tenant details: {response.text}"
        data = response.json()
        
        # Verify tenant info
        assert "tenant" in data, "Response missing tenant"
        tenant = data["tenant"]
        assert "subscription_plan" in tenant, "Tenant missing subscription_plan"
        assert "subscription_status" in tenant, "Tenant missing subscription_status"
        
        # Verify payments and action_logs are included
        assert "payments" in data, "Response missing payments"
        assert "action_logs" in data, "Response missing action_logs"
        
        print(f"Tenant details: plan={tenant['subscription_plan']}, status={tenant['subscription_status']}")


class TestTenantsList:
    """Test tenants list with plan badges"""
    
    def test_get_tenants_list(self, auth_headers):
        """Test getting tenants list includes plan info"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get tenants: {response.text}"
        tenants = response.json()
        assert isinstance(tenants, list), "Tenants should be a list"
        
        if len(tenants) > 0:
            tenant = tenants[0]
            assert "subscription_plan" in tenant, "Tenant missing subscription_plan"
            assert "subscription_status" in tenant, "Tenant missing subscription_status"
            assert "subscription_ends_at" in tenant or tenant["subscription_plan"] == "free", "Paid tenant missing subscription_ends_at"
            print(f"Found {len(tenants)} tenants with plan info")


class TestSuperAdminMe:
    """Test super admin me endpoint"""
    
    def test_get_me_requires_auth(self):
        """Test that me endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_me_success(self, auth_headers):
        """Test getting current super admin info"""
        response = requests.get(f"{BASE_URL}/api/super-admin/me", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get me: {response.text}"
        data = response.json()
        assert data["email"] == SUPER_ADMIN_EMAIL
        assert data["role"] == "super_admin"
        print(f"Super admin: {data['name']} ({data['email']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
