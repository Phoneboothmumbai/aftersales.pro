"""
Test suite for new features:
- Inventory Management: CRUD operations, stock adjustment, stats, filters
- Date Range Filter: Jobs page date filtering
- Technician Metrics: Performance metrics and overview
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://techfix-36.preview.emergentagent.com')

# Test credentials from the review request
TEST_TENANT = {
    "subdomain": "shop1768470232",
    "email": "admin1768470232@test.com",
    "password": "Test@123"
}


class TestAuthentication:
    """Authentication helper tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_TENANT["email"],
                "password": TEST_TENANT["password"],
                "subdomain": TEST_TENANT["subdomain"]
            }
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert "tenant" in data


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": TEST_TENANT["email"],
            "password": TEST_TENANT["password"],
            "subdomain": TEST_TENANT["subdomain"]
        }
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["token"]


# ==================== INVENTORY TESTS ====================

class TestInventoryStats:
    """Inventory stats endpoint tests"""
    
    def test_get_inventory_stats(self, auth_token):
        """Test getting inventory statistics"""
        response = requests.get(
            f"{BASE_URL}/api/inventory/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "total_items" in data
        assert "low_stock_count" in data
        assert "out_of_stock" in data
        assert "total_cost_value" in data
        assert "total_selling_value" in data
        
        # Validate types
        assert isinstance(data["total_items"], int)
        assert isinstance(data["low_stock_count"], int)
        assert isinstance(data["out_of_stock"], int)
        assert isinstance(data["total_cost_value"], (int, float))
        assert isinstance(data["total_selling_value"], (int, float))
    
    def test_inventory_stats_requires_auth(self):
        """Test that inventory stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/inventory/stats")
        assert response.status_code in [401, 403], "Inventory stats should require authentication"


class TestInventoryCategories:
    """Inventory categories endpoint tests"""
    
    def test_get_inventory_categories(self, auth_token):
        """Test getting inventory categories"""
        response = requests.get(
            f"{BASE_URL}/api/inventory/categories",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_inventory_categories_requires_auth(self):
        """Test that inventory categories requires authentication"""
        response = requests.get(f"{BASE_URL}/api/inventory/categories")
        assert response.status_code in [401, 403], "Inventory categories should require authentication"


class TestInventoryCRUD:
    """Inventory CRUD operations tests"""
    
    def test_create_inventory_item(self, auth_token):
        """Test creating a new inventory item"""
        item_data = {
            "name": "TEST_iPhone 14 Screen",
            "sku": "TEST-IP14-SCR-001",
            "category": "Screens",
            "quantity": 10,
            "min_stock_level": 5,
            "cost_price": 5000.00,
            "selling_price": 8000.00,
            "supplier": "Test Supplier",
            "description": "Test inventory item for automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "id" in data
        assert "tenant_id" in data
        assert "name" in data
        assert "sku" in data
        assert "category" in data
        assert "quantity" in data
        assert "min_stock_level" in data
        assert "cost_price" in data
        assert "selling_price" in data
        assert "is_low_stock" in data
        assert "created_at" in data
        assert "updated_at" in data
        
        # Validate values
        assert data["name"] == item_data["name"]
        assert data["sku"] == item_data["sku"]
        assert data["category"] == item_data["category"]
        assert data["quantity"] == item_data["quantity"]
        assert data["min_stock_level"] == item_data["min_stock_level"]
        assert data["cost_price"] == item_data["cost_price"]
        assert data["selling_price"] == item_data["selling_price"]
        assert data["is_low_stock"] == False  # 10 > 5
        
        return data["id"]
    
    def test_create_inventory_item_auto_sku(self, auth_token):
        """Test creating inventory item without SKU (auto-generated)"""
        item_data = {
            "name": "TEST_Auto SKU Item",
            "category": "Batteries",
            "quantity": 3,
            "min_stock_level": 5,
            "cost_price": 1000.00,
            "selling_price": 1500.00
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["sku"] is not None
        assert data["sku"].startswith("PART-")
        assert data["is_low_stock"] == True  # 3 <= 5
    
    def test_list_inventory(self, auth_token):
        """Test listing inventory items"""
        response = requests.get(
            f"{BASE_URL}/api/inventory",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify each item has required fields
        for item in data:
            assert "id" in item
            assert "name" in item
            assert "quantity" in item
            assert "is_low_stock" in item
    
    def test_list_inventory_filter_by_category(self, auth_token):
        """Test filtering inventory by category"""
        response = requests.get(
            f"{BASE_URL}/api/inventory?category=Screens",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for item in data:
            assert item["category"] == "Screens"
    
    def test_list_inventory_filter_low_stock(self, auth_token):
        """Test filtering inventory by low stock"""
        response = requests.get(
            f"{BASE_URL}/api/inventory?low_stock_only=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for item in data:
            assert item["is_low_stock"] == True
    
    def test_list_inventory_search(self, auth_token):
        """Test searching inventory by name/SKU"""
        response = requests.get(
            f"{BASE_URL}/api/inventory?search=TEST_",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # All results should contain TEST_ in name or SKU
        for item in data:
            assert "TEST_" in item["name"] or "TEST" in (item.get("sku") or "")
    
    def test_get_inventory_item(self, auth_token):
        """Test getting a single inventory item"""
        # First create an item
        item_data = {
            "name": "TEST_Get Single Item",
            "category": "Cables",
            "quantity": 20,
            "min_stock_level": 10,
            "cost_price": 100.00,
            "selling_price": 200.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Get the item
        response = requests.get(
            f"{BASE_URL}/api/inventory/{item_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == item_id
        assert data["name"] == item_data["name"]
    
    def test_update_inventory_item(self, auth_token):
        """Test updating an inventory item"""
        # First create an item
        item_data = {
            "name": "TEST_Update Item",
            "category": "Storage",
            "quantity": 5,
            "min_stock_level": 3,
            "cost_price": 2000.00,
            "selling_price": 3000.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Update the item
        update_data = {
            "name": "TEST_Updated Item Name",
            "selling_price": 3500.00
        }
        
        response = requests.put(
            f"{BASE_URL}/api/inventory/{item_id}",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["selling_price"] == update_data["selling_price"]
        # Original values should be preserved
        assert data["category"] == item_data["category"]
        assert data["quantity"] == item_data["quantity"]
    
    def test_delete_inventory_item(self, auth_token):
        """Test deleting an inventory item"""
        # First create an item
        item_data = {
            "name": "TEST_Delete Item",
            "category": "Other",
            "quantity": 1,
            "min_stock_level": 1,
            "cost_price": 500.00,
            "selling_price": 800.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Delete the item
        response = requests.delete(
            f"{BASE_URL}/api/inventory/{item_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        # Verify item is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/inventory/{item_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404
    
    def test_inventory_crud_requires_admin(self):
        """Test that inventory create/update/delete requires admin"""
        # Test without auth
        response = requests.post(
            f"{BASE_URL}/api/inventory",
            json={"name": "Test"}
        )
        assert response.status_code in [401, 403]


class TestStockAdjustment:
    """Stock adjustment tests"""
    
    def test_adjust_stock_add(self, auth_token):
        """Test adding stock to an item"""
        # First create an item
        item_data = {
            "name": "TEST_Stock Adjust Add",
            "category": "Batteries",
            "quantity": 10,
            "min_stock_level": 5,
            "cost_price": 1000.00,
            "selling_price": 1500.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Adjust stock (add 5)
        adjust_data = {
            "quantity_change": 5,
            "reason": "Restocked from supplier"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/{item_id}/adjust",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=adjust_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["quantity"] == 15  # 10 + 5
    
    def test_adjust_stock_remove(self, auth_token):
        """Test removing stock from an item"""
        # First create an item
        item_data = {
            "name": "TEST_Stock Adjust Remove",
            "category": "Screens",
            "quantity": 10,
            "min_stock_level": 5,
            "cost_price": 5000.00,
            "selling_price": 8000.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Adjust stock (remove 3)
        adjust_data = {
            "quantity_change": -3,
            "reason": "Used in repair job"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/{item_id}/adjust",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=adjust_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["quantity"] == 7  # 10 - 3
    
    def test_adjust_stock_cannot_go_negative(self, auth_token):
        """Test that stock cannot go below 0"""
        # First create an item with low stock
        item_data = {
            "name": "TEST_Stock Negative Test",
            "category": "IC/Chips",
            "quantity": 2,
            "min_stock_level": 1,
            "cost_price": 500.00,
            "selling_price": 800.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Try to remove more than available
        adjust_data = {
            "quantity_change": -5,
            "reason": "Test negative"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/{item_id}/adjust",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=adjust_data
        )
        assert response.status_code == 400, "Should not allow stock to go negative"
    
    def test_adjust_stock_with_job_id(self, auth_token):
        """Test stock adjustment with job reference"""
        # First create an item
        item_data = {
            "name": "TEST_Stock With Job",
            "category": "Chargers",
            "quantity": 5,
            "min_stock_level": 2,
            "cost_price": 300.00,
            "selling_price": 500.00
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/inventory",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=item_data
        )
        assert create_response.status_code == 200
        item_id = create_response.json()["id"]
        
        # Adjust stock with job reference
        adjust_data = {
            "quantity_change": -1,
            "reason": "Used in repair",
            "job_id": "test-job-id-123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/inventory/{item_id}/adjust",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=adjust_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["quantity"] == 4


# ==================== DATE RANGE FILTER TESTS ====================

class TestJobsDateRangeFilter:
    """Jobs date range filter tests"""
    
    def test_jobs_list_with_date_from(self, auth_token):
        """Test filtering jobs with date_from parameter"""
        # Use a date from the past
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/jobs?date_from={date_from}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # All jobs should be created on or after date_from
        for job in data:
            job_date = job["created_at"][:10]
            assert job_date >= date_from, f"Job {job['job_number']} created at {job_date} is before {date_from}"
    
    def test_jobs_list_with_date_to(self, auth_token):
        """Test filtering jobs with date_to parameter"""
        # Use today's date
        date_to = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/jobs?date_to={date_to}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All jobs should be created on or before date_to
        for job in data:
            job_date = job["created_at"][:10]
            assert job_date <= date_to, f"Job {job['job_number']} created at {job_date} is after {date_to}"
    
    def test_jobs_list_with_date_range(self, auth_token):
        """Test filtering jobs with both date_from and date_to"""
        date_from = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        date_to = datetime.now().strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/jobs?date_from={date_from}&date_to={date_to}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All jobs should be within the date range
        for job in data:
            job_date = job["created_at"][:10]
            assert date_from <= job_date <= date_to
    
    def test_jobs_list_with_date_and_status_filter(self, auth_token):
        """Test combining date filter with status filter"""
        date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/jobs?date_from={date_from}&status_filter=received",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        for job in data:
            assert job["status"] == "received"
            job_date = job["created_at"][:10]
            assert job_date >= date_from


# ==================== TECHNICIAN METRICS TESTS ====================

class TestTechnicianMetrics:
    """Technician metrics endpoint tests"""
    
    def test_get_technician_metrics(self, auth_token):
        """Test getting technician performance metrics"""
        response = requests.get(
            f"{BASE_URL}/api/metrics/technicians",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "technicians" in data
        assert isinstance(data["technicians"], list)
        
        # Validate each technician entry
        for tech in data["technicians"]:
            assert "id" in tech
            assert "name" in tech
            assert "role" in tech
            assert "jobs_created" in tech
            assert "jobs_closed" in tech
            assert "jobs_by_status" in tech
            assert "avg_repair_time_hours" in tech
            assert "avg_repair_time_display" in tech
            
            # Validate types
            assert isinstance(tech["jobs_created"], int)
            assert isinstance(tech["jobs_closed"], int)
            assert isinstance(tech["jobs_by_status"], dict)
            assert isinstance(tech["avg_repair_time_hours"], (int, float))
    
    def test_technician_metrics_requires_auth(self):
        """Test that technician metrics requires authentication"""
        response = requests.get(f"{BASE_URL}/api/metrics/technicians")
        assert response.status_code in [401, 403], "Technician metrics should require authentication"


class TestMetricsOverview:
    """Metrics overview endpoint tests"""
    
    def test_get_metrics_overview(self, auth_token):
        """Test getting overall shop performance metrics"""
        response = requests.get(
            f"{BASE_URL}/api/metrics/overview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "jobs_this_week" in data
        assert "jobs_this_month" in data
        assert "completed_this_week" in data
        assert "avg_jobs_per_day" in data
        assert "monthly_revenue" in data
        assert "jobs_by_status" in data
        assert "trend" in data
        
        # Validate types
        assert isinstance(data["jobs_this_week"], int)
        assert isinstance(data["jobs_this_month"], int)
        assert isinstance(data["completed_this_week"], int)
        assert isinstance(data["avg_jobs_per_day"], (int, float))
        assert isinstance(data["monthly_revenue"], (int, float))
        assert isinstance(data["jobs_by_status"], dict)
        assert isinstance(data["trend"], list)
        
        # Validate trend structure (last 7 days)
        assert len(data["trend"]) == 7
        for day in data["trend"]:
            assert "date" in day
            assert "day" in day
            assert "jobs" in day
    
    def test_metrics_overview_requires_auth(self):
        """Test that metrics overview requires authentication"""
        response = requests.get(f"{BASE_URL}/api/metrics/overview")
        assert response.status_code in [401, 403], "Metrics overview should require authentication"


# ==================== CLEANUP ====================

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_inventory_items(self, auth_token):
        """Clean up TEST_ prefixed inventory items"""
        # Get all inventory items
        response = requests.get(
            f"{BASE_URL}/api/inventory?search=TEST_",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if response.status_code == 200:
            items = response.json()
            for item in items:
                if item["name"].startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/inventory/{item['id']}",
                        headers={"Authorization": f"Bearer {auth_token}"}
                    )
        
        # Verify cleanup
        response = requests.get(
            f"{BASE_URL}/api/inventory?search=TEST_",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            remaining = [i for i in response.json() if i["name"].startswith("TEST_")]
            assert len(remaining) == 0, f"Failed to clean up {len(remaining)} test items"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
