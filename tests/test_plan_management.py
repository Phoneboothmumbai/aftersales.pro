"""
Test Suite for Super Admin Plan Management Features
Tests: GET plans, POST create plan, PUT update plan, DELETE plan, GET feature-options
All plan parameters: max_users, max_branches, max_jobs_per_month, max_inventory_items, max_photos_per_job, max_storage_mb
18 toggleable features
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://repairsaas.preview.emergentagent.com').rstrip('/')

# Super Admin credentials
SUPER_ADMIN_EMAIL = "superadmin@aftersales.pro"
SUPER_ADMIN_PASSWORD = "SuperAdmin@123"

# Test plan data
TEST_PLAN_ID = f"test_plan_{int(time.time())}"


class TestSuperAdminSetup:
    """Setup super admin if not exists"""
    
    def test_setup_super_admin(self):
        """Setup super admin (may already exist)"""
        response = requests.post(f"{BASE_URL}/api/super-admin/setup")
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"


@pytest.fixture(scope="module")
def super_admin_token():
    """Get super admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/super-admin/login", json={
        "email": SUPER_ADMIN_EMAIL,
        "password": SUPER_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Super admin login failed")


@pytest.fixture(scope="module")
def auth_headers(super_admin_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {super_admin_token}"}


class TestGetPlans:
    """Test GET /api/super-admin/plans endpoint"""
    
    def test_get_plans_requires_auth(self):
        """Test that plans endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_plans_returns_list(self, auth_headers):
        """Test that plans endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get plans: {response.text}"
        plans = response.json()
        assert isinstance(plans, list), "Plans should be a list"
        print(f"Found {len(plans)} plans")
    
    def test_get_plans_has_default_plans(self, auth_headers):
        """Test that default plans exist (Free, Basic, Pro, Enterprise)"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200
        plans = response.json()
        plan_ids = [p["id"] for p in plans]
        
        assert "free" in plan_ids, "Free plan missing"
        assert "basic" in plan_ids, "Basic plan missing"
        assert "pro" in plan_ids, "Pro plan missing"
        assert "enterprise" in plan_ids, "Enterprise plan missing"
        print(f"Default plans found: {plan_ids}")
    
    def test_plan_has_all_required_fields(self, auth_headers):
        """Test that each plan has all required fields"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200
        plans = response.json()
        
        required_fields = [
            "id", "name", "price", "billing_cycle", "duration_days",
            "max_users", "max_branches", "max_jobs_per_month",
            "max_inventory_items", "max_photos_per_job", "max_storage_mb",
            "features", "is_active", "sort_order", "tenant_count"
        ]
        
        for plan in plans:
            for field in required_fields:
                assert field in plan, f"Plan {plan.get('id', 'unknown')} missing field: {field}"
        print("All plans have required fields")
    
    def test_plan_features_structure(self, auth_headers):
        """Test that plan features have correct structure"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200
        plans = response.json()
        
        expected_features = [
            "job_management", "basic_reports", "pdf_job_sheet", "qr_tracking",
            "whatsapp_messages", "photo_upload", "inventory_management",
            "advanced_analytics", "technician_metrics", "customer_management",
            "email_notifications", "sms_notifications", "custom_branding",
            "api_access", "priority_support", "dedicated_account_manager",
            "data_export", "multi_branch"
        ]
        
        for plan in plans:
            features = plan.get("features", {})
            for feature in expected_features:
                assert feature in features, f"Plan {plan['id']} missing feature: {feature}"
                assert isinstance(features[feature], bool), f"Feature {feature} should be boolean"
        print(f"All plans have {len(expected_features)} features")
    
    def test_plan_limits_are_integers(self, auth_headers):
        """Test that plan limits are integers"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200
        plans = response.json()
        
        limit_fields = [
            "max_users", "max_branches", "max_jobs_per_month",
            "max_inventory_items", "max_photos_per_job", "max_storage_mb"
        ]
        
        for plan in plans:
            for field in limit_fields:
                assert isinstance(plan[field], int), f"Plan {plan['id']} {field} should be int"
        print("All plan limits are integers")
    
    def test_get_plans_with_include_inactive(self, auth_headers):
        """Test getting plans with include_inactive parameter"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/plans?include_inactive=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        plans = response.json()
        assert isinstance(plans, list)
        print(f"Found {len(plans)} plans (including inactive)")


class TestCreatePlan:
    """Test POST /api/super-admin/plans endpoint"""
    
    def test_create_plan_requires_auth(self):
        """Test that create plan requires authentication"""
        response = requests.post(f"{BASE_URL}/api/super-admin/plans", json={
            "id": "test",
            "name": "Test Plan"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_create_plan_with_all_parameters(self, auth_headers):
        """Test creating a plan with all parameters"""
        plan_data = {
            "id": TEST_PLAN_ID,
            "name": "Test Custom Plan",
            "description": "A test plan with all parameters",
            "price": 299,
            "billing_cycle": "monthly",
            "duration_days": 30,
            "max_users": 5,
            "max_branches": 2,
            "max_jobs_per_month": 150,
            "max_inventory_items": 300,
            "max_photos_per_job": 8,
            "max_storage_mb": 1000,
            "features": {
                "job_management": True,
                "basic_reports": True,
                "pdf_job_sheet": True,
                "qr_tracking": True,
                "whatsapp_messages": True,
                "photo_upload": True,
                "inventory_management": True,
                "advanced_analytics": False,
                "technician_metrics": True,
                "customer_management": True,
                "email_notifications": True,
                "sms_notifications": False,
                "custom_branding": False,
                "api_access": False,
                "priority_support": False,
                "dedicated_account_manager": False,
                "data_export": True,
                "multi_branch": True
            },
            "sort_order": 50,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/super-admin/plans",
            headers=auth_headers,
            json=plan_data
        )
        assert response.status_code == 200, f"Failed to create plan: {response.text}"
        data = response.json()
        
        assert "message" in data, "Response missing message"
        assert "plan" in data, "Response missing plan"
        assert data["plan"]["id"] == TEST_PLAN_ID
        assert data["plan"]["name"] == "Test Custom Plan"
        assert data["plan"]["price"] == 299
        assert data["plan"]["max_users"] == 5
        assert data["plan"]["max_branches"] == 2
        assert data["plan"]["max_jobs_per_month"] == 150
        assert data["plan"]["max_inventory_items"] == 300
        assert data["plan"]["max_photos_per_job"] == 8
        assert data["plan"]["max_storage_mb"] == 1000
        assert data["plan"]["is_default"] == False
        print(f"Created plan: {TEST_PLAN_ID}")
    
    def test_create_plan_duplicate_id_fails(self, auth_headers):
        """Test that creating a plan with duplicate ID fails"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/plans",
            headers=auth_headers,
            json={
                "id": "free",  # Already exists
                "name": "Duplicate Free"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "already exists" in response.json().get("detail", "").lower()
    
    def test_create_plan_with_unlimited_values(self, auth_headers):
        """Test creating a plan with unlimited values (-1)"""
        unlimited_plan_id = f"unlimited_test_{int(time.time())}"
        plan_data = {
            "id": unlimited_plan_id,
            "name": "Unlimited Test Plan",
            "price": 9999,
            "billing_cycle": "yearly",
            "duration_days": 365,
            "max_users": -1,
            "max_branches": -1,
            "max_jobs_per_month": -1,
            "max_inventory_items": -1,
            "max_photos_per_job": -1,
            "max_storage_mb": -1,
            "features": {
                "job_management": True,
                "basic_reports": True,
                "pdf_job_sheet": True,
                "qr_tracking": True,
                "whatsapp_messages": True,
                "photo_upload": True,
                "inventory_management": True,
                "advanced_analytics": True,
                "technician_metrics": True,
                "customer_management": True,
                "email_notifications": True,
                "sms_notifications": True,
                "custom_branding": True,
                "api_access": True,
                "priority_support": True,
                "dedicated_account_manager": True,
                "data_export": True,
                "multi_branch": True
            },
            "sort_order": 100,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/super-admin/plans",
            headers=auth_headers,
            json=plan_data
        )
        assert response.status_code == 200, f"Failed to create unlimited plan: {response.text}"
        data = response.json()
        
        assert data["plan"]["max_users"] == -1
        assert data["plan"]["max_branches"] == -1
        assert data["plan"]["max_jobs_per_month"] == -1
        print(f"Created unlimited plan: {unlimited_plan_id}")
        
        # Cleanup - delete the plan
        requests.delete(f"{BASE_URL}/api/super-admin/plans/{unlimited_plan_id}", headers=auth_headers)


class TestUpdatePlan:
    """Test PUT /api/super-admin/plans/{id} endpoint"""
    
    def test_update_plan_requires_auth(self):
        """Test that update plan requires authentication"""
        response = requests.put(f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}", json={
            "name": "Updated Name"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_update_plan_name(self, auth_headers):
        """Test updating plan name"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers,
            json={"name": "Updated Test Plan"}
        )
        assert response.status_code == 200, f"Failed to update plan: {response.text}"
        data = response.json()
        assert data["plan"]["name"] == "Updated Test Plan"
        print("Updated plan name")
    
    def test_update_plan_price(self, auth_headers):
        """Test updating plan price"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers,
            json={"price": 399}
        )
        assert response.status_code == 200
        assert response.json()["plan"]["price"] == 399
        print("Updated plan price to 399")
    
    def test_update_plan_limits(self, auth_headers):
        """Test updating plan limits"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers,
            json={
                "max_users": 10,
                "max_branches": 5,
                "max_jobs_per_month": 500,
                "max_inventory_items": 1000,
                "max_photos_per_job": 15,
                "max_storage_mb": 5000
            }
        )
        assert response.status_code == 200
        plan = response.json()["plan"]
        assert plan["max_users"] == 10
        assert plan["max_branches"] == 5
        assert plan["max_jobs_per_month"] == 500
        assert plan["max_inventory_items"] == 1000
        assert plan["max_photos_per_job"] == 15
        assert plan["max_storage_mb"] == 5000
        print("Updated plan limits")
    
    def test_update_plan_features(self, auth_headers):
        """Test updating plan features"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers,
            json={
                "features": {
                    "job_management": True,
                    "basic_reports": True,
                    "pdf_job_sheet": True,
                    "qr_tracking": True,
                    "whatsapp_messages": True,
                    "photo_upload": True,
                    "inventory_management": True,
                    "advanced_analytics": True,  # Changed to True
                    "technician_metrics": True,
                    "customer_management": True,
                    "email_notifications": True,
                    "sms_notifications": True,  # Changed to True
                    "custom_branding": True,  # Changed to True
                    "api_access": False,
                    "priority_support": True,  # Changed to True
                    "dedicated_account_manager": False,
                    "data_export": True,
                    "multi_branch": True
                }
            }
        )
        assert response.status_code == 200
        features = response.json()["plan"]["features"]
        assert features["advanced_analytics"] == True
        assert features["sms_notifications"] == True
        assert features["custom_branding"] == True
        assert features["priority_support"] == True
        print("Updated plan features")
    
    def test_update_plan_billing_cycle(self, auth_headers):
        """Test updating plan billing cycle"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers,
            json={
                "billing_cycle": "yearly",
                "duration_days": 365
            }
        )
        assert response.status_code == 200
        plan = response.json()["plan"]
        assert plan["billing_cycle"] == "yearly"
        assert plan["duration_days"] == 365
        print("Updated billing cycle to yearly")
    
    def test_update_plan_is_active(self, auth_headers):
        """Test updating plan is_active status"""
        # Deactivate
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers,
            json={"is_active": False}
        )
        assert response.status_code == 200
        assert response.json()["plan"]["is_active"] == False
        
        # Reactivate
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers,
            json={"is_active": True}
        )
        assert response.status_code == 200
        assert response.json()["plan"]["is_active"] == True
        print("Toggled plan is_active status")
    
    def test_update_nonexistent_plan(self, auth_headers):
        """Test updating non-existent plan"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/plans/nonexistent_plan_id",
            headers=auth_headers,
            json={"name": "Test"}
        )
        assert response.status_code == 404


class TestDeletePlan:
    """Test DELETE /api/super-admin/plans/{id} endpoint"""
    
    def test_delete_plan_requires_auth(self):
        """Test that delete plan requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_cannot_delete_default_plan(self, auth_headers):
        """Test that default plans cannot be deleted"""
        response = requests.delete(
            f"{BASE_URL}/api/super-admin/plans/free",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "default" in response.json().get("detail", "").lower()
        print("Cannot delete default plan - correct behavior")
    
    def test_delete_custom_plan(self, auth_headers):
        """Test deleting a custom plan"""
        response = requests.delete(
            f"{BASE_URL}/api/super-admin/plans/{TEST_PLAN_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete plan: {response.text}"
        assert "deleted" in response.json().get("message", "").lower()
        print(f"Deleted plan: {TEST_PLAN_ID}")
    
    def test_delete_nonexistent_plan(self, auth_headers):
        """Test deleting non-existent plan"""
        response = requests.delete(
            f"{BASE_URL}/api/super-admin/plans/nonexistent_plan_id",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestGetFeatureOptions:
    """Test GET /api/super-admin/feature-options endpoint"""
    
    def test_feature_options_requires_auth(self):
        """Test that feature options requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/feature-options")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_feature_options(self, auth_headers):
        """Test getting feature options"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/feature-options",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get feature options: {response.text}"
        features = response.json()
        
        expected_features = [
            "job_management", "basic_reports", "pdf_job_sheet", "qr_tracking",
            "whatsapp_messages", "photo_upload", "inventory_management",
            "advanced_analytics", "technician_metrics", "customer_management",
            "email_notifications", "sms_notifications", "custom_branding",
            "api_access", "priority_support", "dedicated_account_manager",
            "data_export", "multi_branch"
        ]
        
        for feature in expected_features:
            assert feature in features, f"Missing feature: {feature}"
            assert isinstance(features[feature], str), f"Feature {feature} description should be string"
        
        print(f"Found {len(features)} feature descriptions")


class TestGetSinglePlan:
    """Test GET /api/super-admin/plans/{id} endpoint"""
    
    def test_get_single_plan_requires_auth(self):
        """Test that get single plan requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans/free")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_single_plan(self, auth_headers):
        """Test getting a single plan by ID"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/plans/free",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get plan: {response.text}"
        plan = response.json()
        
        assert plan["id"] == "free"
        assert plan["name"] == "Free"
        assert plan["price"] == 0
        assert "tenant_count" in plan
        print(f"Free plan has {plan['tenant_count']} tenants")
    
    def test_get_nonexistent_plan(self, auth_headers):
        """Test getting non-existent plan"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/plans/nonexistent_plan_id",
            headers=auth_headers
        )
        assert response.status_code == 404


class TestPlanValidation:
    """Test plan validation and edge cases"""
    
    def test_verify_default_plan_prices(self, auth_headers):
        """Verify default plan prices are correct"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200
        plans = {p["id"]: p for p in response.json()}
        
        assert plans["free"]["price"] == 0, "Free plan should be ₹0"
        assert plans["basic"]["price"] == 499, "Basic plan should be ₹499"
        assert plans["pro"]["price"] == 999, "Pro plan should be ₹999"
        assert plans["enterprise"]["price"] == 2499, "Enterprise plan should be ₹2499"
        print("Default plan prices verified")
    
    def test_verify_default_plan_limits(self, auth_headers):
        """Verify default plan limits are correct"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200
        plans = {p["id"]: p for p in response.json()}
        
        # Free plan limits
        assert plans["free"]["max_users"] == 1
        assert plans["free"]["max_branches"] == 1
        assert plans["free"]["max_jobs_per_month"] == 50
        
        # Enterprise plan should have unlimited (-1)
        assert plans["enterprise"]["max_users"] == -1
        assert plans["enterprise"]["max_branches"] == -1
        assert plans["enterprise"]["max_jobs_per_month"] == -1
        
        print("Default plan limits verified")
    
    def test_verify_is_default_flag(self, auth_headers):
        """Verify is_default flag on default plans"""
        response = requests.get(f"{BASE_URL}/api/super-admin/plans", headers=auth_headers)
        assert response.status_code == 200
        plans = response.json()
        
        default_plan_ids = ["free", "basic", "pro", "enterprise"]
        for plan in plans:
            if plan["id"] in default_plan_ids:
                assert plan.get("is_default") == True, f"Plan {plan['id']} should have is_default=True"
        print("is_default flags verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
