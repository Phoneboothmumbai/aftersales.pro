"""
Test suite for Customers feature - AfterSales.pro
Tests customer listing, stats, devices, and device history endpoints
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_SUBDOMAIN = "shop1768470232"
TEST_EMAIL = "admin1768470232@test.com"
TEST_PASSWORD = "Test@123"
TEST_CUSTOMER_MOBILE = "9876543210"


class TestCustomersFeature:
    """Test suite for Customers feature endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "subdomain": TEST_SUBDOMAIN
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ==================== GET /api/customers ====================
    
    def test_get_customers_returns_200(self):
        """GET /api/customers - Should return 200 with customers list"""
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "customers" in data, "Response should contain 'customers' key"
        assert isinstance(data["customers"], list), "Customers should be a list"
    
    def test_get_customers_returns_correct_fields(self):
        """GET /api/customers - Each customer should have required fields"""
        response = self.session.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["customers"]) > 0:
            customer = data["customers"][0]
            required_fields = ["name", "mobile", "total_jobs", "device_count", "last_visit"]
            for field in required_fields:
                assert field in customer, f"Customer should have '{field}' field"
    
    def test_get_customers_search_by_name(self):
        """GET /api/customers?search=X - Should filter by name"""
        response = self.session.get(f"{BASE_URL}/api/customers?search=TEST")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        # If there are results, they should match the search term
        for customer in data["customers"]:
            assert "TEST" in customer["name"].upper() or "TEST" in customer.get("mobile", "") or "TEST" in customer.get("email", "").upper()
    
    def test_get_customers_search_by_mobile(self):
        """GET /api/customers?search=mobile - Should filter by mobile"""
        response = self.session.get(f"{BASE_URL}/api/customers?search={TEST_CUSTOMER_MOBILE}")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
    
    # ==================== GET /api/customers/stats ====================
    
    def test_get_customer_stats_returns_200(self):
        """GET /api/customers/stats - Should return 200 with stats"""
        response = self.session.get(f"{BASE_URL}/api/customers/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_get_customer_stats_returns_correct_fields(self):
        """GET /api/customers/stats - Should return all required stat fields"""
        response = self.session.get(f"{BASE_URL}/api/customers/stats")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["total_customers", "repeat_customers", "new_customers_this_month", "repeat_rate"]
        for field in required_fields:
            assert field in data, f"Stats should have '{field}' field"
    
    def test_get_customer_stats_values_are_numeric(self):
        """GET /api/customers/stats - All values should be numeric"""
        response = self.session.get(f"{BASE_URL}/api/customers/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["total_customers"], int), "total_customers should be int"
        assert isinstance(data["repeat_customers"], int), "repeat_customers should be int"
        assert isinstance(data["new_customers_this_month"], int), "new_customers_this_month should be int"
        assert isinstance(data["repeat_rate"], (int, float)), "repeat_rate should be numeric"
    
    def test_get_customer_stats_repeat_rate_is_percentage(self):
        """GET /api/customers/stats - repeat_rate should be between 0 and 100"""
        response = self.session.get(f"{BASE_URL}/api/customers/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert 0 <= data["repeat_rate"] <= 100, "repeat_rate should be between 0 and 100"
    
    # ==================== GET /api/customers/{mobile}/devices ====================
    
    def test_get_customer_devices_returns_200(self):
        """GET /api/customers/{mobile}/devices - Should return 200"""
        response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_get_customer_devices_returns_correct_structure(self):
        """GET /api/customers/{mobile}/devices - Should return customer and devices"""
        response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        assert response.status_code == 200
        
        data = response.json()
        assert "customer" in data, "Response should have 'customer' key"
        assert "devices" in data, "Response should have 'devices' key"
        assert isinstance(data["devices"], list), "Devices should be a list"
    
    def test_get_customer_devices_device_fields(self):
        """GET /api/customers/{mobile}/devices - Each device should have required fields"""
        response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["devices"]) > 0:
            device = data["devices"][0]
            required_fields = ["brand", "model", "serial_imei", "total_repairs", "latest_status"]
            for field in required_fields:
                assert field in device, f"Device should have '{field}' field"
    
    def test_get_customer_devices_nonexistent_customer(self):
        """GET /api/customers/{mobile}/devices - Should return empty for nonexistent customer"""
        response = self.session.get(f"{BASE_URL}/api/customers/0000000000/devices")
        assert response.status_code == 200
        
        data = response.json()
        assert data["devices"] == [], "Should return empty devices list for nonexistent customer"
    
    # ==================== GET /api/customers/{mobile}/devices/{serial}/history ====================
    
    def test_get_device_history_returns_200(self):
        """GET /api/customers/{mobile}/devices/{serial}/history - Should return 200"""
        # First get devices to find a valid serial
        devices_response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        if devices_response.status_code != 200:
            pytest.skip("Could not get devices")
        
        devices = devices_response.json().get("devices", [])
        if len(devices) == 0:
            pytest.skip("No devices found for test customer")
        
        serial = devices[0]["serial_imei"]
        response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices/{serial}/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_get_device_history_returns_correct_structure(self):
        """GET /api/customers/{mobile}/devices/{serial}/history - Should return correct structure"""
        # First get devices to find a valid serial
        devices_response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        if devices_response.status_code != 200:
            pytest.skip("Could not get devices")
        
        devices = devices_response.json().get("devices", [])
        if len(devices) == 0:
            pytest.skip("No devices found for test customer")
        
        serial = devices[0]["serial_imei"]
        response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices/{serial}/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "customer" in data, "Response should have 'customer' key"
        assert "device" in data, "Response should have 'device' key"
        assert "history" in data, "Response should have 'history' key"
        assert "total_repairs" in data, "Response should have 'total_repairs' key"
    
    def test_get_device_history_job_fields(self):
        """GET /api/customers/{mobile}/devices/{serial}/history - Each job should have required fields"""
        # First get devices to find a valid serial
        devices_response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        if devices_response.status_code != 200:
            pytest.skip("Could not get devices")
        
        devices = devices_response.json().get("devices", [])
        if len(devices) == 0:
            pytest.skip("No devices found for test customer")
        
        serial = devices[0]["serial_imei"]
        response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices/{serial}/history")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["history"]) > 0:
            job = data["history"][0]
            required_fields = ["id", "job_number", "problem_description", "status", "created_at"]
            for field in required_fields:
                assert field in job, f"Job history should have '{field}' field"
    
    # ==================== Authentication Tests ====================
    
    def test_customers_requires_auth(self):
        """GET /api/customers - Should require authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/customers")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_customer_stats_requires_auth(self):
        """GET /api/customers/stats - Should require authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/customers/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_customer_devices_requires_auth(self):
        """GET /api/customers/{mobile}/devices - Should require authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_device_history_requires_auth(self):
        """GET /api/customers/{mobile}/devices/{serial}/history - Should require authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices/TEST123/history")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestCustomersDataIntegrity:
    """Test data integrity and aggregation logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "subdomain": TEST_SUBDOMAIN
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_customer_device_count_matches_devices_list(self):
        """Customer device_count should match actual devices returned"""
        # Get customers
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        assert customers_response.status_code == 200
        
        customers = customers_response.json().get("customers", [])
        if len(customers) == 0:
            pytest.skip("No customers to test")
        
        # Check first customer
        customer = customers[0]
        devices_response = self.session.get(f"{BASE_URL}/api/customers/{customer['mobile']}/devices")
        assert devices_response.status_code == 200
        
        devices = devices_response.json().get("devices", [])
        assert customer["device_count"] == len(devices), \
            f"device_count ({customer['device_count']}) should match devices list length ({len(devices)})"
    
    def test_device_total_repairs_matches_history(self):
        """Device total_repairs should match history count"""
        # Get devices for test customer
        devices_response = self.session.get(f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices")
        if devices_response.status_code != 200:
            pytest.skip("Could not get devices")
        
        devices = devices_response.json().get("devices", [])
        if len(devices) == 0:
            pytest.skip("No devices found")
        
        device = devices[0]
        history_response = self.session.get(
            f"{BASE_URL}/api/customers/{TEST_CUSTOMER_MOBILE}/devices/{device['serial_imei']}/history"
        )
        assert history_response.status_code == 200
        
        history_data = history_response.json()
        assert device["total_repairs"] == history_data["total_repairs"], \
            f"Device total_repairs ({device['total_repairs']}) should match history total ({history_data['total_repairs']})"
    
    def test_stats_total_customers_matches_list(self):
        """Stats total_customers should match customers list length"""
        # Get stats
        stats_response = self.session.get(f"{BASE_URL}/api/customers/stats")
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Get customers list
        customers_response = self.session.get(f"{BASE_URL}/api/customers")
        assert customers_response.status_code == 200
        customers = customers_response.json().get("customers", [])
        
        assert stats["total_customers"] == len(customers), \
            f"Stats total ({stats['total_customers']}) should match list length ({len(customers)})"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
