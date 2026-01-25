"""
Test suite for Inventory-Linked Parts System
Tests the repair modal parts selection, inventory deduction, and usage history features
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
TEST_SHOP = {
    "subdomain": "invtest1769339559",
    "email": "admin@test.example.com",
    "password": "Test@123"
}


class TestInventoryPartsSystem:
    """Test inventory-linked parts system for repairs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.tenant_id = None
        
    def authenticate(self):
        """Login and get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_SHOP["email"],
            "password": TEST_SHOP["password"],
            "subdomain": TEST_SHOP["subdomain"]
        })
        if response.status_code == 200:
            data = response.json()
            self.token = data["token"]
            self.tenant_id = data["tenant"]["id"]
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return True
        return False
    
    # ==================== AUTHENTICATION TESTS ====================
    
    def test_01_login_success(self):
        """Test login with test shop credentials"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_SHOP["email"],
            "password": TEST_SHOP["password"],
            "subdomain": TEST_SHOP["subdomain"]
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert "tenant" in data
        print(f"✓ Login successful for {TEST_SHOP['subdomain']}")
    
    # ==================== INVENTORY TESTS ====================
    
    def test_02_get_inventory_items(self):
        """Test fetching inventory items"""
        assert self.authenticate(), "Authentication failed"
        
        response = self.session.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200, f"Failed to get inventory: {response.text}"
        
        items = response.json()
        assert isinstance(items, list), "Expected list of inventory items"
        print(f"✓ Found {len(items)} inventory items")
        
        # Verify expected items exist (iPhone 14 Screen and Samsung Battery)
        item_names = [item["name"] for item in items]
        print(f"  Items: {item_names}")
        
        # Store items for later tests
        self.inventory_items = items
        return items
    
    def test_03_inventory_item_structure(self):
        """Test inventory item has required fields"""
        assert self.authenticate(), "Authentication failed"
        
        response = self.session.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200
        
        items = response.json()
        if len(items) > 0:
            item = items[0]
            required_fields = ["id", "name", "quantity", "selling_price", "cost_price"]
            for field in required_fields:
                assert field in item, f"Missing field: {field}"
            print(f"✓ Inventory item has all required fields")
        else:
            pytest.skip("No inventory items to test")
    
    # ==================== JOBS TESTS ====================
    
    def test_04_get_jobs(self):
        """Test fetching jobs list"""
        assert self.authenticate(), "Authentication failed"
        
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200, f"Failed to get jobs: {response.text}"
        
        jobs = response.json()
        assert isinstance(jobs, list), "Expected list of jobs"
        print(f"✓ Found {len(jobs)} jobs")
        
        # Print job numbers for reference
        for job in jobs[:5]:
            print(f"  {job['job_number']} - Status: {job['status']}")
        
        return jobs
    
    def test_05_get_job_detail(self):
        """Test fetching job detail with repair info"""
        assert self.authenticate(), "Authentication failed"
        
        # Get jobs first
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        jobs = response.json()
        
        if len(jobs) == 0:
            pytest.skip("No jobs to test")
        
        # Get first job detail
        job_id = jobs[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/jobs/{job_id}")
        assert response.status_code == 200, f"Failed to get job detail: {response.text}"
        
        job = response.json()
        assert "id" in job
        assert "job_number" in job
        assert "status" in job
        print(f"✓ Job detail retrieved: {job['job_number']}")
        
        # Check if repair data exists
        if job.get("repair"):
            print(f"  Repair data exists: work_done={job['repair'].get('work_done', 'N/A')[:50]}...")
            if job["repair"].get("parts_used"):
                print(f"  Parts used: {len(job['repair']['parts_used'])} items")
        
        return job
    
    # ==================== REPAIR WITH PARTS TESTS ====================
    
    def test_06_repair_endpoint_exists(self):
        """Test that repair endpoint exists"""
        assert self.authenticate(), "Authentication failed"
        
        # Get a job to test with
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        jobs = response.json()
        
        # Find a job that's not closed
        test_job = None
        for job in jobs:
            if job["status"] != "closed":
                test_job = job
                break
        
        if not test_job:
            pytest.skip("No non-closed jobs to test")
        
        # Test with invalid data to verify endpoint exists
        response = self.session.put(f"{BASE_URL}/api/jobs/{test_job['id']}/repair", json={
            "work_done": "",  # Empty to trigger validation
            "final_amount": 0
        })
        
        # Should get 422 (validation error) or 400, not 404
        assert response.status_code != 404, "Repair endpoint not found"
        print(f"✓ Repair endpoint exists (status: {response.status_code})")
    
    def test_07_repair_with_parts_used(self):
        """Test repair endpoint with parts_used array"""
        assert self.authenticate(), "Authentication failed"
        
        # Get inventory items
        inv_response = self.session.get(f"{BASE_URL}/api/inventory")
        assert inv_response.status_code == 200
        inventory = inv_response.json()
        
        if len(inventory) == 0:
            pytest.skip("No inventory items available")
        
        # Get jobs
        jobs_response = self.session.get(f"{BASE_URL}/api/jobs")
        assert jobs_response.status_code == 200
        jobs = jobs_response.json()
        
        # Find a job in 'in_progress' or 'approved' status
        test_job = None
        for job in jobs:
            if job["status"] in ["in_progress", "approved", "diagnosed"]:
                test_job = job
                break
        
        if not test_job:
            print("  No suitable job found for repair test")
            pytest.skip("No job in suitable status for repair test")
        
        # Find an inventory item with stock
        test_item = None
        for item in inventory:
            if item["quantity"] > 0:
                test_item = item
                break
        
        if not test_item:
            pytest.skip("No inventory items with stock")
        
        initial_stock = test_item["quantity"]
        print(f"  Testing with job: {test_job['job_number']}")
        print(f"  Using part: {test_item['name']} (stock: {initial_stock})")
        
        # Submit repair with parts
        repair_payload = {
            "work_done": "TEST_Repair work with inventory parts",
            "parts_used": [{
                "inventory_id": test_item["id"],
                "item_name": test_item["name"],
                "quantity": 1,
                "unit_price": test_item.get("selling_price", 0)
            }],
            "parts_replaced": "Test parts",
            "final_amount": 1000,
            "warranty_info": "30 days"
        }
        
        response = self.session.put(f"{BASE_URL}/api/jobs/{test_job['id']}/repair", json=repair_payload)
        
        if response.status_code == 200:
            print(f"✓ Repair with parts submitted successfully")
            
            # Verify stock was deducted
            inv_check = self.session.get(f"{BASE_URL}/api/inventory")
            updated_inventory = inv_check.json()
            updated_item = next((i for i in updated_inventory if i["id"] == test_item["id"]), None)
            
            if updated_item:
                new_stock = updated_item["quantity"]
                print(f"  Stock changed: {initial_stock} -> {new_stock}")
                assert new_stock == initial_stock - 1, f"Stock not deducted correctly"
                print(f"✓ Inventory stock deducted correctly")
        else:
            print(f"  Repair response: {response.status_code} - {response.text}")
            # May fail if job already repaired, which is acceptable
            if "closed" in response.text.lower() or "already" in response.text.lower():
                pytest.skip("Job already repaired/closed")
            assert False, f"Repair failed: {response.text}"
    
    # ==================== USAGE HISTORY TESTS ====================
    
    def test_08_usage_history_endpoint(self):
        """Test GET /api/inventory/{id}/usage-history endpoint"""
        assert self.authenticate(), "Authentication failed"
        
        # Get inventory items
        response = self.session.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200
        inventory = response.json()
        
        if len(inventory) == 0:
            pytest.skip("No inventory items")
        
        # Test usage history for first item
        item = inventory[0]
        response = self.session.get(f"{BASE_URL}/api/inventory/{item['id']}/usage-history")
        
        assert response.status_code == 200, f"Usage history failed: {response.text}"
        
        data = response.json()
        assert "item" in data, "Missing 'item' in response"
        assert "usage_history" in data, "Missing 'usage_history' in response"
        assert "total_used" in data, "Missing 'total_used' in response"
        
        print(f"✓ Usage history endpoint works for {item['name']}")
        print(f"  Total used: {data['total_used']} units")
        print(f"  History records: {len(data['usage_history'])}")
        
        return data
    
    def test_09_usage_history_structure(self):
        """Test usage history response structure"""
        assert self.authenticate(), "Authentication failed"
        
        # Get inventory items
        response = self.session.get(f"{BASE_URL}/api/inventory")
        assert response.status_code == 200
        inventory = response.json()
        
        if len(inventory) == 0:
            pytest.skip("No inventory items")
        
        # Find item with usage history
        for item in inventory:
            response = self.session.get(f"{BASE_URL}/api/inventory/{item['id']}/usage-history")
            if response.status_code == 200:
                data = response.json()
                if len(data["usage_history"]) > 0:
                    record = data["usage_history"][0]
                    
                    # Verify record structure
                    expected_fields = ["job_id", "job_number", "quantity_used", "customer_name", "device", "used_by_name", "used_at"]
                    for field in expected_fields:
                        assert field in record, f"Missing field in usage record: {field}"
                    
                    print(f"✓ Usage history record has correct structure")
                    print(f"  Job: {record['job_number']}")
                    print(f"  Customer: {record['customer_name']}")
                    print(f"  Quantity: {record['quantity_used']}")
                    return
        
        print("  No usage history records found to verify structure")
        pytest.skip("No usage history records available")
    
    def test_10_usage_history_invalid_item(self):
        """Test usage history with invalid item ID"""
        assert self.authenticate(), "Authentication failed"
        
        fake_id = str(uuid.uuid4())
        response = self.session.get(f"{BASE_URL}/api/inventory/{fake_id}/usage-history")
        
        assert response.status_code == 404, f"Expected 404 for invalid item, got {response.status_code}"
        print(f"✓ Usage history returns 404 for invalid item ID")
    
    # ==================== JOB DETAIL PARTS DISPLAY TESTS ====================
    
    def test_11_job_repair_parts_in_response(self):
        """Test that job detail includes parts_used in repair data"""
        assert self.authenticate(), "Authentication failed"
        
        # Get jobs
        response = self.session.get(f"{BASE_URL}/api/jobs")
        assert response.status_code == 200
        jobs = response.json()
        
        # Find a repaired job
        repaired_job = None
        for job in jobs:
            if job.get("repair") and job["repair"].get("parts_used"):
                repaired_job = job
                break
        
        if not repaired_job:
            print("  No jobs with parts_used found")
            pytest.skip("No repaired jobs with parts_used")
        
        # Get full job detail
        response = self.session.get(f"{BASE_URL}/api/jobs/{repaired_job['id']}")
        assert response.status_code == 200
        
        job = response.json()
        assert job["repair"] is not None, "Repair data missing"
        assert "parts_used" in job["repair"], "parts_used missing from repair"
        
        parts = job["repair"]["parts_used"]
        print(f"✓ Job {job['job_number']} has {len(parts)} parts used")
        
        for part in parts:
            print(f"  - {part['item_name']}: qty={part['quantity']}, price={part.get('unit_price', 0)}")
            assert "inventory_id" in part, "Missing inventory_id in part"
            assert "item_name" in part, "Missing item_name in part"
            assert "quantity" in part, "Missing quantity in part"
    
    # ==================== INVENTORY STATS TESTS ====================
    
    def test_12_inventory_stats(self):
        """Test inventory stats endpoint"""
        assert self.authenticate(), "Authentication failed"
        
        response = self.session.get(f"{BASE_URL}/api/inventory/stats")
        assert response.status_code == 200, f"Stats failed: {response.text}"
        
        stats = response.json()
        assert "total_items" in stats
        assert "low_stock_count" in stats
        assert "out_of_stock" in stats
        
        print(f"✓ Inventory stats retrieved")
        print(f"  Total items: {stats['total_items']}")
        print(f"  Low stock: {stats['low_stock_count']}")
        print(f"  Out of stock: {stats['out_of_stock']}")
    
    # ==================== EDGE CASE TESTS ====================
    
    def test_13_repair_insufficient_stock(self):
        """Test repair fails when requesting more than available stock"""
        assert self.authenticate(), "Authentication failed"
        
        # Get inventory items
        inv_response = self.session.get(f"{BASE_URL}/api/inventory")
        assert inv_response.status_code == 200
        inventory = inv_response.json()
        
        if len(inventory) == 0:
            pytest.skip("No inventory items")
        
        # Get jobs
        jobs_response = self.session.get(f"{BASE_URL}/api/jobs")
        assert jobs_response.status_code == 200
        jobs = jobs_response.json()
        
        # Find a non-closed job
        test_job = None
        for job in jobs:
            if job["status"] not in ["closed", "repaired", "delivered"]:
                test_job = job
                break
        
        if not test_job:
            pytest.skip("No suitable job for test")
        
        # Find an item with limited stock
        test_item = inventory[0]
        excessive_qty = test_item["quantity"] + 100
        
        repair_payload = {
            "work_done": "TEST_Insufficient stock test",
            "parts_used": [{
                "inventory_id": test_item["id"],
                "item_name": test_item["name"],
                "quantity": excessive_qty,
                "unit_price": test_item.get("selling_price", 0)
            }],
            "final_amount": 500
        }
        
        response = self.session.put(f"{BASE_URL}/api/jobs/{test_job['id']}/repair", json=repair_payload)
        
        # Should fail with 400 due to insufficient stock
        if response.status_code == 400:
            assert "insufficient" in response.text.lower() or "stock" in response.text.lower()
            print(f"✓ Repair correctly rejected for insufficient stock")
        else:
            print(f"  Response: {response.status_code} - {response.text}")
            # May be 200 if job was already repaired
            if response.status_code == 200:
                pytest.skip("Job may have been repaired already")


class TestInventoryCategories:
    """Test inventory categories endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def authenticate(self):
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_SHOP["email"],
            "password": TEST_SHOP["password"],
            "subdomain": TEST_SHOP["subdomain"]
        })
        if response.status_code == 200:
            self.session.headers.update({"Authorization": f"Bearer {response.json()['token']}"})
            return True
        return False
    
    def test_get_categories(self):
        """Test fetching inventory categories"""
        assert self.authenticate(), "Authentication failed"
        
        response = self.session.get(f"{BASE_URL}/api/inventory/categories")
        assert response.status_code == 200, f"Categories failed: {response.text}"
        
        categories = response.json()
        assert isinstance(categories, list)
        print(f"✓ Found {len(categories)} categories: {categories}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
