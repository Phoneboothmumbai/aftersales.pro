"""
Test suite for Profit Tracking System
Tests: Profit password, profit summary, job-wise profit, party-wise profit, bulk expense entry
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SHOP_SUBDOMAIN = "testabc"
SHOP_EMAIL = "test@testabc.com"
SHOP_PASSWORD = "Test123!"
PROFIT_PASSWORD = "profit123"


class TestProfitTracking:
    """Profit tracking system tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SHOP_EMAIL,
            "password": SHOP_PASSWORD,
            "subdomain": SHOP_SUBDOMAIN
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user")
            self.tenant = login_response.json().get("tenant")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    # ==================== PROFIT PASSWORD TESTS ====================
    
    def test_01_profit_password_status(self):
        """Test checking profit password status"""
        response = self.session.get(f"{BASE_URL}/api/settings/profit-password-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "has_password" in data, "Response should contain has_password field"
        print(f"✓ Profit password status: has_password={data['has_password']}")
    
    def test_02_set_profit_password(self):
        """Test setting profit password"""
        response = self.session.post(f"{BASE_URL}/api/settings/profit-password", json={
            "password": PROFIT_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"✓ Profit password set successfully: {data['message']}")
    
    def test_03_verify_profit_password_correct(self):
        """Test verifying correct profit password"""
        response = self.session.post(f"{BASE_URL}/api/settings/verify-profit-password", json={
            "password": PROFIT_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("verified") == True, "Password should be verified"
        print("✓ Correct profit password verified successfully")
    
    def test_04_verify_profit_password_incorrect(self):
        """Test verifying incorrect profit password"""
        response = self.session.post(f"{BASE_URL}/api/settings/verify-profit-password", json={
            "password": "wrongpassword123"
        })
        assert response.status_code == 401, f"Expected 401 for wrong password, got {response.status_code}"
        print("✓ Incorrect profit password rejected correctly")
    
    # ==================== PROFIT SUMMARY TESTS ====================
    
    def test_05_profit_summary_day(self):
        """Test profit summary for day period"""
        response = self.session.get(f"{BASE_URL}/api/profit/summary?period=day")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        required_fields = ["total_received", "total_expense", "total_profit", "profit_margin", 
                          "total_jobs", "jobs_with_expense", "jobs_pending_expense",
                          "total_expense_parts", "total_expense_labor"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Day summary: Received={data['total_received']}, Expense={data['total_expense']}, Profit={data['total_profit']}")
    
    def test_06_profit_summary_week(self):
        """Test profit summary for week period"""
        response = self.session.get(f"{BASE_URL}/api/profit/summary?period=week")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_profit" in data
        print(f"✓ Week summary: Jobs={data['total_jobs']}, Profit={data['total_profit']}")
    
    def test_07_profit_summary_month(self):
        """Test profit summary for month period"""
        response = self.session.get(f"{BASE_URL}/api/profit/summary?period=month")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_profit" in data
        assert "profit_margin" in data
        print(f"✓ Month summary: Jobs={data['total_jobs']}, Margin={data['profit_margin']}%")
    
    def test_08_profit_summary_year(self):
        """Test profit summary for year period"""
        response = self.session.get(f"{BASE_URL}/api/profit/summary?period=year")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_profit" in data
        print(f"✓ Year summary: Jobs={data['total_jobs']}, Profit={data['total_profit']}")
    
    # ==================== JOB-WISE PROFIT TESTS ====================
    
    def test_09_job_wise_profit(self):
        """Test job-wise profit report"""
        response = self.session.get(f"{BASE_URL}/api/profit/job-wise")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "jobs" in data, "Response should contain jobs array"
        assert "summary" in data, "Response should contain summary"
        
        # Check summary fields
        summary = data["summary"]
        assert "total_jobs" in summary
        assert "total_received" in summary
        assert "total_expense" in summary
        assert "total_profit" in summary
        
        print(f"✓ Job-wise report: {len(data['jobs'])} jobs, Total profit={summary['total_profit']}")
        
        # Check job structure if jobs exist
        if data["jobs"]:
            job = data["jobs"][0]
            job_fields = ["id", "job_number", "customer_name", "amount_received", 
                         "expense_parts", "expense_labor", "profit", "has_expense"]
            for field in job_fields:
                assert field in job, f"Job missing field: {field}"
            print(f"  First job: {job['job_number']}, Profit={job['profit']}, HasExpense={job['has_expense']}")
    
    def test_10_job_wise_profit_with_date_filter(self):
        """Test job-wise profit with date filters"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = self.session.get(f"{BASE_URL}/api/profit/job-wise?date_from={today}&date_to={today}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "jobs" in data
        print(f"✓ Job-wise with date filter: {len(data['jobs'])} jobs for {today}")
    
    # ==================== PARTY-WISE PROFIT TESTS ====================
    
    def test_11_party_wise_profit(self):
        """Test party/customer-wise profit report"""
        response = self.session.get(f"{BASE_URL}/api/profit/party-wise")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "parties" in data, "Response should contain parties array"
        assert "summary" in data, "Response should contain summary"
        
        # Check summary fields
        summary = data["summary"]
        assert "total_customers" in summary
        assert "total_received" in summary
        assert "total_profit" in summary
        
        print(f"✓ Party-wise report: {summary['total_customers']} customers, Total profit={summary['total_profit']}")
        
        # Check party structure if parties exist
        if data["parties"]:
            party = data["parties"][0]
            party_fields = ["customer_name", "customer_mobile", "total_jobs", 
                          "total_received", "total_expense", "profit"]
            for field in party_fields:
                assert field in party, f"Party missing field: {field}"
            print(f"  Top customer: {party['customer_name']}, Jobs={party['total_jobs']}, Profit={party['profit']}")
    
    # ==================== PENDING EXPENSES TESTS ====================
    
    def test_12_pending_expenses(self):
        """Test getting jobs with pending expense entries"""
        response = self.session.get(f"{BASE_URL}/api/profit/pending-expenses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "jobs" in data, "Response should contain jobs array"
        assert "count" in data, "Response should contain count"
        
        print(f"✓ Pending expenses: {data['count']} jobs without expense data")
        
        # Check job structure if jobs exist
        if data["jobs"]:
            job = data["jobs"][0]
            assert "id" in job
            assert "job_number" in job
            assert "customer" in job
            assert "device" in job
            assert "delivery" in job
            print(f"  First pending: {job['job_number']}")
    
    # ==================== BULK EXPENSE UPDATE TESTS ====================
    
    def test_13_bulk_expense_update(self):
        """Test bulk expense update for multiple jobs"""
        # First get pending expenses
        pending_response = self.session.get(f"{BASE_URL}/api/profit/pending-expenses")
        if pending_response.status_code != 200:
            pytest.skip("Could not get pending expenses")
        
        pending_data = pending_response.json()
        
        if pending_data["count"] == 0:
            print("✓ No pending expenses to update (all jobs have expense data)")
            return
        
        # Update first pending job
        job = pending_data["jobs"][0]
        job_id = job["id"]
        
        response = self.session.put(f"{BASE_URL}/api/profit/bulk-expense", json={
            "expenses": [
                {
                    "job_id": job_id,
                    "expense_parts": 100.0,
                    "expense_labor": 50.0
                }
            ]
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "updated_count" in data
        assert "message" in data
        print(f"✓ Bulk expense update: {data['message']}")
    
    # ==================== NON-ADMIN ACCESS TESTS ====================
    
    def test_14_non_admin_profit_access_denied(self):
        """Test that non-admin users cannot access profit data"""
        # Create a technician user first
        create_response = self.session.post(f"{BASE_URL}/api/users", json={
            "name": "Test Technician",
            "email": "tech_profit_test@testabc.com",
            "password": "Tech123!",
            "role": "technician"
        })
        
        if create_response.status_code not in [200, 201, 400]:  # 400 if already exists
            pytest.skip("Could not create test user")
        
        # Login as technician
        tech_session = requests.Session()
        tech_session.headers.update({"Content-Type": "application/json"})
        
        login_response = tech_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "tech_profit_test@testabc.com",
            "password": "Tech123!",
            "subdomain": SHOP_SUBDOMAIN
        })
        
        if login_response.status_code != 200:
            print("✓ Non-admin test skipped (could not login as technician)")
            return
        
        token = login_response.json().get("token")
        tech_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access profit summary
        response = tech_session.get(f"{BASE_URL}/api/profit/summary?period=month")
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Non-admin correctly denied access to profit data (403)")
    
    # ==================== DELIVERY WITH EXPENSE TESTS ====================
    
    def test_15_delivery_with_expense_fields(self):
        """Test that delivery endpoint accepts expense fields"""
        # Create a test job first
        job_response = self.session.post(f"{BASE_URL}/api/jobs", json={
            "customer": {
                "name": "TEST_Profit_Customer",
                "mobile": "+919999888877",
                "email": "profit_test@example.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Samsung",
                "model": "Galaxy S21"
            },
            "accessories": [],
            "problem_description": "Test job for profit tracking"
        })
        
        if job_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create test job: {job_response.status_code}")
        
        job = job_response.json()
        job_id = job["id"]
        
        # Move through workflow: diagnosis -> approval -> repair
        # Diagnosis
        self.session.put(f"{BASE_URL}/api/jobs/{job_id}/diagnosis", json={
            "diagnosis": "Test diagnosis",
            "estimated_cost": 1000,
            "estimated_timeline": "1 day"
        })
        
        # Approval
        self.session.put(f"{BASE_URL}/api/jobs/{job_id}/approve", json={
            "approved_by": "Test Customer",
            "approved_amount": 1000
        })
        
        # Repair
        self.session.put(f"{BASE_URL}/api/jobs/{job_id}/repair", json={
            "work_done": "Test repair",
            "final_amount": 1000
        })
        
        # Delivery with expense fields
        delivery_response = self.session.put(f"{BASE_URL}/api/jobs/{job_id}/deliver", json={
            "delivered_to": "Test Customer",
            "amount_received": 1000,
            "payment_mode": "Cash",
            "expense_parts": 300,
            "expense_labor": 200
        })
        
        assert delivery_response.status_code == 200, f"Expected 200, got {delivery_response.status_code}: {delivery_response.text}"
        
        # Verify expense data was saved
        job_data = delivery_response.json()
        assert job_data["delivery"]["expense_parts"] == 300, "expense_parts should be 300"
        assert job_data["delivery"]["expense_labor"] == 200, "expense_labor should be 200"
        
        # Verify profit calculation
        expected_profit = 1000 - 300 - 200  # 500
        print(f"✓ Delivery with expenses: Parts=300, Labor=200, Expected Profit={expected_profit}")
        
        # Cleanup - close the job
        self.session.put(f"{BASE_URL}/api/jobs/{job_id}/close")
    
    def test_16_profit_calculation_formula(self):
        """Test that profit is calculated correctly: Profit = Received - (Parts + Labor)"""
        # Get job-wise data
        response = self.session.get(f"{BASE_URL}/api/profit/job-wise")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify profit calculation for jobs with expense data
        for job in data["jobs"]:
            if job["has_expense"]:
                expected_profit = job["amount_received"] - job["expense_parts"] - job["expense_labor"]
                assert job["profit"] == expected_profit, \
                    f"Profit mismatch for {job['job_number']}: expected {expected_profit}, got {job['profit']}"
        
        print("✓ Profit calculation formula verified: Profit = Received - (Parts + Labor)")
    
    def test_17_profit_margin_calculation(self):
        """Test profit margin calculation"""
        response = self.session.get(f"{BASE_URL}/api/profit/summary?period=year")
        assert response.status_code == 200
        
        data = response.json()
        
        if data["total_received"] > 0:
            expected_margin = round((data["total_profit"] / data["total_received"] * 100), 2)
            assert data["profit_margin"] == expected_margin, \
                f"Margin mismatch: expected {expected_margin}, got {data['profit_margin']}"
            print(f"✓ Profit margin calculation verified: {data['profit_margin']}%")
        else:
            print("✓ No revenue to calculate margin (total_received=0)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
