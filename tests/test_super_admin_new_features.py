"""
Test Super Admin New Features:
1. Super Admin Login - /api/super-admin/login
2. Create Shop from Super Admin - /api/super-admin/tenants POST
3. Analytics API - /api/super-admin/analytics GET
4. Assign Plan to tenant - /api/super-admin/tenants/{id}/assign-plan POST
5. Extend Validity - /api/super-admin/tenants/{id}/extend-validity POST
6. Record Payment - /api/super-admin/tenants/{id}/record-payment POST
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@aftersales.pro"
SUPER_ADMIN_PASSWORD = "SuperAdmin@123"


class TestSuperAdminLogin:
    """Test Super Admin Login endpoint"""
    
    def test_login_success(self):
        """Test successful super admin login"""
        response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
            "email": SUPER_ADMIN_EMAIL,
            "password": SUPER_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        # Response contains 'user' instead of 'admin'
        assert "user" in data, "Response should contain user info"
        assert data["user"]["email"] == SUPER_ADMIN_EMAIL
        print(f"✓ Super Admin login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid credentials rejected correctly")
    
    def test_login_missing_fields(self):
        """Test login with missing fields"""
        response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
            "email": SUPER_ADMIN_EMAIL
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"✓ Missing fields validation works")


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Could not login as super admin: {response.text}")
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(super_admin_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {super_admin_token}"}


class TestCreateShop:
    """Test Create Shop from Super Admin - POST /api/super-admin/tenants"""
    
    def test_create_shop_requires_auth(self):
        """Test that create shop requires authentication"""
        response = requests.post(f"{BASE_URL}/api/super-admin/tenants", json={
            "company_name": "Test Shop",
            "subdomain": "testshop",
            "admin_name": "Test Admin",
            "admin_email": "test@test.com",
            "admin_password": "Test@123"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Create shop requires authentication")
    
    def test_create_shop_success(self, auth_headers):
        """Test successful shop creation"""
        unique_id = str(uuid.uuid4())[:8]
        shop_data = {
            "company_name": f"TEST_Shop_{unique_id}",
            "subdomain": f"testshop{unique_id}",
            "admin_name": f"Test Admin {unique_id}",
            "admin_email": f"testadmin{unique_id}@test.com",
            "admin_password": "TestAdmin@123",
            "subscription_plan": "free",
            "trial_days": 14
        }
        
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tenant" in data, "Response should contain tenant info"
        assert data["tenant"]["company_name"] == shop_data["company_name"]
        assert data["tenant"]["subdomain"] == shop_data["subdomain"].lower()
        assert data["tenant"]["admin_email"] == shop_data["admin_email"]
        print(f"✓ Shop created successfully: {data['tenant']['subdomain']}")
        return data["tenant"]["id"]
    
    def test_create_shop_duplicate_subdomain(self, auth_headers):
        """Test that duplicate subdomain is rejected"""
        unique_id = str(uuid.uuid4())[:8]
        shop_data = {
            "company_name": f"TEST_Shop_{unique_id}",
            "subdomain": f"duptest{unique_id}",
            "admin_name": "Test Admin",
            "admin_email": f"dup1{unique_id}@test.com",
            "admin_password": "TestAdmin@123"
        }
        
        # Create first shop
        response1 = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        assert response1.status_code == 200, f"First shop creation failed: {response1.text}"
        
        # Try to create with same subdomain
        shop_data["admin_email"] = f"dup2{unique_id}@test.com"
        response2 = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        assert "subdomain" in response2.json().get("detail", "").lower()
        print(f"✓ Duplicate subdomain rejected correctly")
    
    def test_create_shop_duplicate_email(self, auth_headers):
        """Test that duplicate admin email is rejected"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"dupemail{unique_id}@test.com"
        
        # Create first shop
        shop_data1 = {
            "company_name": f"TEST_Shop1_{unique_id}",
            "subdomain": f"shop1{unique_id}",
            "admin_name": "Test Admin",
            "admin_email": email,
            "admin_password": "TestAdmin@123"
        }
        response1 = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data1,
            headers=auth_headers
        )
        assert response1.status_code == 200, f"First shop creation failed: {response1.text}"
        
        # Try to create with same email
        shop_data2 = {
            "company_name": f"TEST_Shop2_{unique_id}",
            "subdomain": f"shop2{unique_id}",
            "admin_name": "Test Admin 2",
            "admin_email": email,
            "admin_password": "TestAdmin@123"
        }
        response2 = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data2,
            headers=auth_headers
        )
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        assert "email" in response2.json().get("detail", "").lower()
        print(f"✓ Duplicate email rejected correctly")
    
    def test_create_shop_with_plan(self, auth_headers):
        """Test shop creation with specific plan"""
        unique_id = str(uuid.uuid4())[:8]
        shop_data = {
            "company_name": f"TEST_ProShop_{unique_id}",
            "subdomain": f"proshop{unique_id}",
            "admin_name": "Pro Admin",
            "admin_email": f"proadmin{unique_id}@test.com",
            "admin_password": "ProAdmin@123",
            "subscription_plan": "pro",
            "trial_days": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Shop created with pro plan")


class TestAnalyticsAPI:
    """Test Analytics API - GET /api/super-admin/analytics"""
    
    def test_analytics_requires_auth(self):
        """Test that analytics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/analytics")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Analytics requires authentication")
    
    def test_analytics_success(self, auth_headers):
        """Test successful analytics retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/analytics",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify revenue section
        assert "revenue" in data, "Response should contain revenue"
        assert "total" in data["revenue"], "Revenue should have total"
        assert "monthly" in data["revenue"], "Revenue should have monthly"
        assert "by_month" in data["revenue"], "Revenue should have by_month"
        assert "by_payment_mode" in data["revenue"], "Revenue should have by_payment_mode"
        
        # Verify tenants section
        assert "tenants" in data, "Response should contain tenants"
        assert "plan_distribution" in data["tenants"], "Tenants should have plan_distribution"
        assert "status_distribution" in data["tenants"], "Tenants should have status_distribution"
        assert "top_by_jobs" in data["tenants"], "Tenants should have top_by_jobs"
        assert "expiring_soon" in data["tenants"], "Tenants should have expiring_soon"
        
        # Verify jobs section
        assert "jobs" in data, "Response should contain jobs"
        assert "trend" in data["jobs"], "Jobs should have trend"
        
        # Verify recent_payments
        assert "recent_payments" in data, "Response should contain recent_payments"
        
        print(f"✓ Analytics API returns all expected fields")
        print(f"  - Total Revenue: {data['revenue']['total']}")
        print(f"  - Monthly Revenue: {data['revenue']['monthly']}")
        print(f"  - Plan Distribution: {len(data['tenants']['plan_distribution'])} plans")
    
    def test_analytics_data_types(self, auth_headers):
        """Test analytics data types are correct"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/analytics",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Revenue should be numeric
        assert isinstance(data["revenue"]["total"], (int, float)), "Total revenue should be numeric"
        assert isinstance(data["revenue"]["monthly"], (int, float)), "Monthly revenue should be numeric"
        
        # Lists should be lists
        assert isinstance(data["revenue"]["by_month"], list), "by_month should be a list"
        assert isinstance(data["tenants"]["plan_distribution"], list), "plan_distribution should be a list"
        assert isinstance(data["recent_payments"], list), "recent_payments should be a list"
        
        print(f"✓ Analytics data types are correct")


class TestAssignPlan:
    """Test Assign Plan - POST /api/super-admin/tenants/{id}/assign-plan"""
    
    @pytest.fixture
    def test_tenant_id(self, auth_headers):
        """Create a test tenant and return its ID"""
        unique_id = str(uuid.uuid4())[:8]
        shop_data = {
            "company_name": f"TEST_AssignPlan_{unique_id}",
            "subdomain": f"assignplan{unique_id}",
            "admin_name": "Test Admin",
            "admin_email": f"assignplan{unique_id}@test.com",
            "admin_password": "TestAdmin@123"
        }
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        if response.status_code != 200:
            pytest.skip(f"Could not create test tenant: {response.text}")
        return response.json()["tenant"]["id"]
    
    def test_assign_plan_requires_auth(self, test_tenant_id):
        """Test that assign plan requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/assign-plan",
            json={"plan": "pro", "duration_months": 1}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Assign plan requires authentication")
    
    def test_assign_plan_success(self, auth_headers, test_tenant_id):
        """Test successful plan assignment"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/assign-plan",
            json={
                "plan": "pro",
                "duration_months": 3,
                "notes": "Test plan assignment"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"✓ Plan assigned successfully")
    
    def test_assign_plan_invalid_tenant(self, auth_headers):
        """Test assign plan to non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/invalid-tenant-id/assign-plan",
            json={"plan": "pro", "duration_months": 1},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid tenant ID handled correctly")


class TestExtendValidity:
    """Test Extend Validity - POST /api/super-admin/tenants/{id}/extend-validity"""
    
    @pytest.fixture
    def test_tenant_id(self, auth_headers):
        """Create a test tenant and return its ID"""
        unique_id = str(uuid.uuid4())[:8]
        shop_data = {
            "company_name": f"TEST_ExtendValidity_{unique_id}",
            "subdomain": f"extendval{unique_id}",
            "admin_name": "Test Admin",
            "admin_email": f"extendval{unique_id}@test.com",
            "admin_password": "TestAdmin@123"
        }
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        if response.status_code != 200:
            pytest.skip(f"Could not create test tenant: {response.text}")
        return response.json()["tenant"]["id"]
    
    def test_extend_validity_requires_auth(self, test_tenant_id):
        """Test that extend validity requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/extend-validity",
            json={"days": 30}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Extend validity requires authentication")
    
    def test_extend_validity_success(self, auth_headers, test_tenant_id):
        """Test successful validity extension"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/extend-validity",
            json={
                "days": 30,
                "reason": "Test extension"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "new_end_date" in data, "Response should contain new_end_date"
        print(f"✓ Validity extended successfully to {data.get('new_end_date')}")
    
    def test_extend_validity_invalid_tenant(self, auth_headers):
        """Test extend validity for non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/invalid-tenant-id/extend-validity",
            json={"days": 30},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid tenant ID handled correctly")


class TestRecordPayment:
    """Test Record Payment - POST /api/super-admin/tenants/{id}/record-payment"""
    
    @pytest.fixture
    def test_tenant_id(self, auth_headers):
        """Create a test tenant and return its ID"""
        unique_id = str(uuid.uuid4())[:8]
        shop_data = {
            "company_name": f"TEST_RecordPayment_{unique_id}",
            "subdomain": f"recordpay{unique_id}",
            "admin_name": "Test Admin",
            "admin_email": f"recordpay{unique_id}@test.com",
            "admin_password": "TestAdmin@123"
        }
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        if response.status_code != 200:
            pytest.skip(f"Could not create test tenant: {response.text}")
        return response.json()["tenant"]["id"]
    
    def test_record_payment_requires_auth(self, test_tenant_id):
        """Test that record payment requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/record-payment",
            json={"amount": 999, "payment_mode": "cash"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Record payment requires authentication")
    
    def test_record_payment_success(self, auth_headers, test_tenant_id):
        """Test successful payment recording"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/record-payment",
            json={
                "amount": 999,
                "payment_mode": "upi",
                "reference_number": f"TEST_REF_{uuid.uuid4().hex[:8]}",
                "plan": "pro",
                "duration_months": 1,
                "notes": "Test payment"
            },
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        # Response contains 'payment' object with 'id' instead of 'payment_id'
        assert "payment" in data, "Response should contain payment info"
        assert "id" in data["payment"], "Payment should have id"
        print(f"✓ Payment recorded successfully: {data['payment']['id']}")
    
    def test_record_payment_different_modes(self, auth_headers, test_tenant_id):
        """Test payment recording with different payment modes"""
        payment_modes = ["cash", "upi", "card", "bank_transfer"]
        
        for mode in payment_modes:
            response = requests.post(
                f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/record-payment",
                json={
                    "amount": 500,
                    "payment_mode": mode,
                    "notes": f"Test {mode} payment"
                },
                headers=auth_headers
            )
            assert response.status_code == 200, f"Payment with {mode} failed: {response.text}"
            print(f"✓ Payment recorded with mode: {mode}")
    
    def test_record_payment_invalid_tenant(self, auth_headers):
        """Test record payment for non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/invalid-tenant-id/record-payment",
            json={"amount": 999, "payment_mode": "cash"},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid tenant ID handled correctly")


class TestGetTenants:
    """Test Get Tenants list - GET /api/super-admin/tenants"""
    
    def test_get_tenants_requires_auth(self):
        """Test that get tenants requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/tenants")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Get tenants requires authentication")
    
    def test_get_tenants_success(self, auth_headers):
        """Test successful tenants retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            tenant = data[0]
            assert "id" in tenant, "Tenant should have id"
            assert "company_name" in tenant, "Tenant should have company_name"
            assert "subdomain" in tenant, "Tenant should have subdomain"
            assert "is_active" in tenant, "Tenant should have is_active"
        
        print(f"✓ Retrieved {len(data)} tenants")


class TestGetTenantDetails:
    """Test Get Tenant Details - GET /api/super-admin/tenants/{id}"""
    
    @pytest.fixture
    def test_tenant_id(self, auth_headers):
        """Create a test tenant and return its ID"""
        unique_id = str(uuid.uuid4())[:8]
        shop_data = {
            "company_name": f"TEST_Details_{unique_id}",
            "subdomain": f"details{unique_id}",
            "admin_name": "Test Admin",
            "admin_email": f"details{unique_id}@test.com",
            "admin_password": "TestAdmin@123"
        }
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants",
            json=shop_data,
            headers=auth_headers
        )
        if response.status_code != 200:
            pytest.skip(f"Could not create test tenant: {response.text}")
        return response.json()["tenant"]["id"]
    
    def test_get_tenant_details_success(self, auth_headers, test_tenant_id):
        """Test successful tenant details retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "tenant" in data, "Response should contain tenant"
        assert "users" in data, "Response should contain users"
        assert "branches" in data, "Response should contain branches"
        assert "stats" in data, "Response should contain stats"
        
        print(f"✓ Tenant details retrieved successfully")
        print(f"  - Users: {len(data['users'])}")
        print(f"  - Branches: {len(data['branches'])}")
    
    def test_get_tenant_details_invalid_id(self, auth_headers):
        """Test get details for non-existent tenant"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/invalid-tenant-id",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid tenant ID handled correctly")


class TestSuperAdminStats:
    """Test Super Admin Stats - GET /api/super-admin/stats"""
    
    def test_stats_requires_auth(self):
        """Test that stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Stats requires authentication")
    
    def test_stats_success(self, auth_headers):
        """Test successful stats retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify expected fields
        expected_fields = [
            "total_tenants", "active_tenants", "inactive_tenants",
            "total_users", "total_jobs", "trial_tenants", "paid_tenants"
        ]
        for field in expected_fields:
            assert field in data, f"Stats should contain {field}"
            assert isinstance(data[field], int), f"{field} should be an integer"
        
        print(f"✓ Stats retrieved successfully")
        print(f"  - Total Tenants: {data['total_tenants']}")
        print(f"  - Active: {data['active_tenants']}")
        print(f"  - Total Users: {data['total_users']}")
        print(f"  - Total Jobs: {data['total_jobs']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
