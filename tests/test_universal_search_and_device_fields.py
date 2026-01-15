"""
Test suite for Universal Search and Device Notes/Password fields
Features tested:
1. Universal Search API - GET /api/search
2. DeviceInfo model with notes and password fields
3. Job creation with device notes and password
4. Job detail showing device notes and password
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_SUBDOMAIN = "shop1768470232"
TEST_EMAIL = "admin1768470232@test.com"
TEST_PASSWORD = "Test@123"


class TestAuthentication:
    """Authentication helper tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "subdomain": TEST_SUBDOMAIN
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestUniversalSearchAPI(TestAuthentication):
    """Tests for Universal Search API - GET /api/search"""
    
    def test_search_requires_authentication(self):
        """Search endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/search?q=test")
        assert response.status_code == 403 or response.status_code == 401
    
    def test_search_with_short_query_returns_empty(self, auth_headers):
        """Search with query < 2 chars returns empty results"""
        response = requests.get(f"{BASE_URL}/api/search?q=a", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        assert data["total"] == 0
    
    def test_search_returns_correct_structure(self, auth_headers):
        """Search returns correct response structure"""
        response = requests.get(f"{BASE_URL}/api/search?q=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "total" in data
        assert "query" in data
        assert data["query"] == "test"
        assert isinstance(data["results"], list)
        assert isinstance(data["total"], int)
    
    def test_search_by_job_number(self, auth_headers):
        """Search by job number returns job results"""
        response = requests.get(f"{BASE_URL}/api/search?q=JOB", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check if any job results are returned
        job_results = [r for r in data["results"] if r.get("type") == "job"]
        if job_results:
            # Verify job result structure
            job = job_results[0]
            assert "id" in job
            assert "job_number" in job
            assert "customer_name" in job
            assert "device" in job
            assert "status" in job
            assert job["type"] == "job"
    
    def test_search_by_customer_name(self, auth_headers):
        """Search by customer name returns results"""
        response = requests.get(f"{BASE_URL}/api/search?q=Customer", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Results can include jobs or customers
        assert isinstance(data["results"], list)
    
    def test_search_by_device_brand(self, auth_headers):
        """Search by device brand returns results"""
        response = requests.get(f"{BASE_URL}/api/search?q=Samsung", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["results"], list)
    
    def test_search_limit_parameter(self, auth_headers):
        """Search respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/search?q=test&limit=5", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Results should not exceed limit
        assert len(data["results"]) <= 5
    
    def test_search_result_types(self, auth_headers):
        """Search results have valid type field"""
        response = requests.get(f"{BASE_URL}/api/search?q=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        valid_types = ["job", "customer", "inventory"]
        for result in data["results"]:
            assert "type" in result
            assert result["type"] in valid_types
    
    def test_search_job_result_fields(self, auth_headers):
        """Job search results have required fields"""
        # First create a job to ensure we have data
        job_data = {
            "customer": {
                "name": "TEST_SearchTest Customer",
                "mobile": "9999888877",
                "email": "searchtest@test.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "SearchTestBrand",
                "model": "SearchTestModel",
                "serial_imei": f"SEARCH{uuid.uuid4().hex[:8].upper()}",
                "condition": "Fresh"
            },
            "accessories": [],
            "problem_description": "Search test problem"
        }
        create_response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_job = create_response.json()
        
        # Now search for it
        response = requests.get(f"{BASE_URL}/api/search?q=SearchTestBrand", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        job_results = [r for r in data["results"] if r.get("type") == "job"]
        assert len(job_results) > 0, "Should find the created job"
        
        job = job_results[0]
        assert "id" in job
        assert "job_number" in job
        assert "customer_name" in job
        assert "customer_mobile" in job
        assert "device" in job
        assert "device_serial" in job
        assert "status" in job
        assert "problem" in job
        assert "created_at" in job
    
    def test_search_customer_result_fields(self, auth_headers):
        """Customer search results have required fields"""
        response = requests.get(f"{BASE_URL}/api/search?q=Customer", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        customer_results = [r for r in data["results"] if r.get("type") == "customer"]
        if customer_results:
            customer = customer_results[0]
            assert "id" in customer
            assert "customer_name" in customer
            assert "customer_mobile" in customer
            assert "job_count" in customer
            assert customer["type"] == "customer"
    
    def test_search_inventory_result_fields(self, auth_headers):
        """Inventory search results have required fields"""
        # First create an inventory item
        inventory_data = {
            "name": "TEST_SearchInventoryItem",
            "sku": f"SEARCH-{uuid.uuid4().hex[:6].upper()}",
            "category": "Test Parts",
            "quantity": 10,
            "cost_price": 100,
            "selling_price": 150
        }
        create_response = requests.post(f"{BASE_URL}/api/inventory", json=inventory_data, headers=auth_headers)
        # May fail if not admin, that's ok
        
        response = requests.get(f"{BASE_URL}/api/search?q=SearchInventory", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        inventory_results = [r for r in data["results"] if r.get("type") == "inventory"]
        if inventory_results:
            item = inventory_results[0]
            assert "id" in item
            assert "name" in item
            assert "sku" in item
            assert "quantity" in item
            assert item["type"] == "inventory"


class TestDeviceNotesAndPassword(TestAuthentication):
    """Tests for Device Notes and Password fields in Job creation"""
    
    def test_create_job_with_device_password(self, auth_headers):
        """Create job with device password field"""
        job_data = {
            "customer": {
                "name": "TEST_PasswordTest Customer",
                "mobile": "9876543211",
                "email": "passwordtest@test.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Apple",
                "model": "iPhone 14",
                "serial_imei": f"PWD{uuid.uuid4().hex[:10].upper()}",
                "condition": "Fresh",
                "password": "1234"
            },
            "accessories": [],
            "problem_description": "Screen not working"
        }
        
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify password is stored
        assert "device" in data
        assert data["device"]["password"] == "1234"
    
    def test_create_job_with_device_notes(self, auth_headers):
        """Create job with device notes field"""
        job_data = {
            "customer": {
                "name": "TEST_NotesTest Customer",
                "mobile": "9876543212",
                "email": "notestest@test.com"
            },
            "device": {
                "device_type": "Laptop",
                "brand": "Dell",
                "model": "Inspiron 15",
                "serial_imei": f"NOTES{uuid.uuid4().hex[:8].upper()}",
                "condition": "Physical Damage",
                "notes": "Customer mentioned device was dropped last week"
            },
            "accessories": [],
            "problem_description": "Not turning on"
        }
        
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify notes is stored
        assert "device" in data
        assert data["device"]["notes"] == "Customer mentioned device was dropped last week"
    
    def test_create_job_with_both_password_and_notes(self, auth_headers):
        """Create job with both device password and notes"""
        job_data = {
            "customer": {
                "name": "TEST_BothFieldsTest Customer",
                "mobile": "9876543213",
                "email": "bothtest@test.com"
            },
            "device": {
                "device_type": "Tablet",
                "brand": "Samsung",
                "model": "Galaxy Tab S8",
                "serial_imei": f"BOTH{uuid.uuid4().hex[:9].upper()}",
                "condition": "Active",
                "password": "pattern123",
                "notes": "Has screen protector, do not remove"
            },
            "accessories": [{"name": "Charger", "checked": True}],
            "problem_description": "Battery draining fast"
        }
        
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify both fields are stored
        assert data["device"]["password"] == "pattern123"
        assert data["device"]["notes"] == "Has screen protector, do not remove"
    
    def test_create_job_without_optional_fields(self, auth_headers):
        """Create job without password and notes (optional fields)"""
        job_data = {
            "customer": {
                "name": "TEST_NoOptionalFields Customer",
                "mobile": "9876543214",
                "email": "nooptional@test.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "OnePlus",
                "model": "11",
                "serial_imei": f"NOOPT{uuid.uuid4().hex[:8].upper()}",
                "condition": "Fresh"
            },
            "accessories": [],
            "problem_description": "Camera not working"
        }
        
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify job created successfully without optional fields
        assert "device" in data
        # Optional fields should be None or not present
        assert data["device"].get("password") is None or "password" not in data["device"] or data["device"]["password"] == ""
        assert data["device"].get("notes") is None or "notes" not in data["device"] or data["device"]["notes"] == ""
    
    def test_get_job_returns_password_and_notes(self, auth_headers):
        """GET job returns device password and notes"""
        # First create a job with password and notes
        job_data = {
            "customer": {
                "name": "TEST_GetJobTest Customer",
                "mobile": "9876543215",
                "email": "getjobtest@test.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Google",
                "model": "Pixel 8",
                "serial_imei": f"GET{uuid.uuid4().hex[:10].upper()}",
                "condition": "Fresh",
                "password": "5678",
                "notes": "Fingerprint sensor not working"
            },
            "accessories": [],
            "problem_description": "Display flickering"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_job = create_response.json()
        job_id = created_job["id"]
        
        # Now GET the job
        get_response = requests.get(f"{BASE_URL}/api/jobs/{job_id}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched_job = get_response.json()
        
        # Verify password and notes are returned
        assert fetched_job["device"]["password"] == "5678"
        assert fetched_job["device"]["notes"] == "Fingerprint sensor not working"
    
    def test_search_finds_job_by_device_notes(self, auth_headers):
        """Universal search can find jobs by device notes content"""
        # Create a job with unique notes
        unique_term = f"UniqueNotes{uuid.uuid4().hex[:6]}"
        job_data = {
            "customer": {
                "name": "TEST_SearchNotes Customer",
                "mobile": "9876543216",
                "email": "searchnotes@test.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Xiaomi",
                "model": "14",
                "serial_imei": f"SRCHN{uuid.uuid4().hex[:8].upper()}",
                "condition": "Fresh",
                "notes": f"Device has {unique_term} issue"
            },
            "accessories": [],
            "problem_description": "General checkup"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_job = create_response.json()
        
        # Search by the unique term in notes
        search_response = requests.get(f"{BASE_URL}/api/search?q={unique_term}", headers=auth_headers)
        assert search_response.status_code == 200
        search_data = search_response.json()
        
        # Should find the job
        job_results = [r for r in search_data["results"] if r.get("type") == "job"]
        found_job_ids = [r["id"] for r in job_results]
        assert created_job["id"] in found_job_ids, f"Should find job by notes content. Results: {search_data}"


class TestSearchIntegration(TestAuthentication):
    """Integration tests for search functionality"""
    
    def test_search_groups_results_by_type(self, auth_headers):
        """Search results are properly typed for grouping"""
        response = requests.get(f"{BASE_URL}/api/search?q=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Group results by type
        jobs = [r for r in data["results"] if r["type"] == "job"]
        customers = [r for r in data["results"] if r["type"] == "customer"]
        inventory = [r for r in data["results"] if r["type"] == "inventory"]
        
        # All results should be accounted for
        total_grouped = len(jobs) + len(customers) + len(inventory)
        assert total_grouped == len(data["results"])
    
    def test_search_by_serial_number(self, auth_headers):
        """Search by device serial/IMEI number"""
        # Create a job with unique serial
        unique_serial = f"SERIAL{uuid.uuid4().hex[:8].upper()}"
        job_data = {
            "customer": {
                "name": "TEST_SerialSearch Customer",
                "mobile": "9876543217",
                "email": "serialsearch@test.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Motorola",
                "model": "Edge 40",
                "serial_imei": unique_serial,
                "condition": "Fresh"
            },
            "accessories": [],
            "problem_description": "Charging issue"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_job = create_response.json()
        
        # Search by serial
        search_response = requests.get(f"{BASE_URL}/api/search?q={unique_serial}", headers=auth_headers)
        assert search_response.status_code == 200
        search_data = search_response.json()
        
        job_results = [r for r in search_data["results"] if r.get("type") == "job"]
        found_job_ids = [r["id"] for r in job_results]
        assert created_job["id"] in found_job_ids, "Should find job by serial number"
    
    def test_search_by_problem_description(self, auth_headers):
        """Search by problem description"""
        unique_problem = f"UniqueProblem{uuid.uuid4().hex[:6]}"
        job_data = {
            "customer": {
                "name": "TEST_ProblemSearch Customer",
                "mobile": "9876543218",
                "email": "problemsearch@test.com"
            },
            "device": {
                "device_type": "Laptop",
                "brand": "HP",
                "model": "Pavilion",
                "serial_imei": f"PROB{uuid.uuid4().hex[:9].upper()}",
                "condition": "Active"
            },
            "accessories": [],
            "problem_description": f"Device has {unique_problem} that needs fixing"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_job = create_response.json()
        
        # Search by problem
        search_response = requests.get(f"{BASE_URL}/api/search?q={unique_problem}", headers=auth_headers)
        assert search_response.status_code == 200
        search_data = search_response.json()
        
        job_results = [r for r in search_data["results"] if r.get("type") == "job"]
        found_job_ids = [r["id"] for r in job_results]
        assert created_job["id"] in found_job_ids, "Should find job by problem description"


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Note: In a real scenario, we'd delete TEST_ prefixed data here
    # For now, we leave the data as it doesn't affect other tests
