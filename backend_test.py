#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class AfterSalesAPITester:
    def __init__(self, base_url="https://fixflow-67.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tenant_id = None
        self.user_id = None
        self.branch_id = None
        self.job_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return success, response.status_code, response_data
            
        except Exception as e:
            return False, 0, {"error": str(e)}

    def test_health_check(self):
        """Test basic health endpoint"""
        success, status, data = self.make_request('GET', 'health')
        self.log_test("Health Check", success and data.get('status') == 'healthy', 
                     f"Status: {status}, Data: {data}")
        return success

    def test_signup(self):
        """Test tenant signup"""
        signup_data = {
            "company_name": "Test Repair Shop",
            "subdomain": "testshop123",
            "admin_name": "Test Admin",
            "admin_email": "admin@testshop123.com",
            "admin_password": "testpass123"
        }
        
        success, status, data = self.make_request('POST', 'tenants/signup', signup_data)
        
        if success and 'token' in data:
            self.token = data['token']
            self.tenant_id = data['tenant']['id']
            self.user_id = data['user']['id']
            
        self.log_test("Tenant Signup", success and 'token' in data, 
                     f"Status: {status}, Has token: {'token' in data}")
        return success

    def test_login(self):
        """Test user login"""
        login_data = {
            "email": "demo@demoshop.com",
            "password": "demo123456",
            "subdomain": "demoshop"
        }
        
        success, status, data = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'token' in data:
            self.token = data['token']
            self.tenant_id = data['tenant']['id']
            self.user_id = data['user']['id']
            
        self.log_test("User Login", success and 'token' in data, 
                     f"Status: {status}, Has token: {'token' in data}")
        return success

    def test_get_me(self):
        """Test get current user"""
        success, status, data = self.make_request('GET', 'auth/me')
        self.log_test("Get Current User", success and 'id' in data, 
                     f"Status: {status}, Has user data: {'id' in data}")
        return success

    def test_get_tenant(self):
        """Test get current tenant"""
        success, status, data = self.make_request('GET', 'tenants/me')
        self.log_test("Get Current Tenant", success and 'id' in data, 
                     f"Status: {status}, Has tenant data: {'id' in data}")
        return success

    def test_list_branches(self):
        """Test list branches"""
        success, status, data = self.make_request('GET', 'branches')
        
        if success and isinstance(data, list) and len(data) > 0:
            self.branch_id = data[0]['id']
            
        self.log_test("List Branches", success and isinstance(data, list), 
                     f"Status: {status}, Branch count: {len(data) if isinstance(data, list) else 0}")
        return success

    def test_create_branch(self):
        """Test create branch"""
        branch_data = {
            "name": "Test Branch",
            "address": "123 Test Street",
            "phone": "+91 9876543210"
        }
        
        success, status, data = self.make_request('POST', 'branches', branch_data)
        has_id = success and 'id' in data
        self.log_test("Create Branch", has_id, 
                     f"Status: {status}, Has branch ID: {has_id}")
        return has_id

    def test_create_job(self):
        """Test create job"""
        job_data = {
            "customer": {
                "name": "John Doe",
                "mobile": "+91 9876543210",
                "email": "john@example.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Samsung",
                "model": "Galaxy S21",
                "serial_imei": "123456789012345",
                "condition": "Active",
                "condition_notes": "Minor scratches"
            },
            "accessories": [
                {"name": "Charger", "checked": True},
                {"name": "Earphones", "checked": False}
            ],
            "problem_description": "Screen not working properly",
            "technician_observation": "Display appears cracked",
            "branch_id": self.branch_id
        }
        
        success, status, data = self.make_request('POST', 'jobs', job_data)
        
        if success and 'id' in data:
            self.job_id = data['id']
        
        has_job_number = success and 'job_number' in data
        self.log_test("Create Job", has_job_number, 
                     f"Status: {status}, Has job number: {has_job_number}")
        return has_job_number

    def test_list_jobs(self):
        """Test list jobs"""
        success, status, data = self.make_request('GET', 'jobs')
        self.log_test("List Jobs", success and isinstance(data, list), 
                     f"Status: {status}, Job count: {len(data) if isinstance(data, list) else 0}")
        return success

    def test_get_job_stats(self):
        """Test get job statistics"""
        success, status, data = self.make_request('GET', 'jobs/stats')
        expected_keys = ['total', 'received', 'diagnosed', 'waiting_for_approval', 'repaired', 'closed']
        has_stats = success and all(key in data for key in expected_keys)
        
        self.log_test("Get Job Stats", has_stats, 
                     f"Status: {status}, Has all stats: {has_stats}")
        return success

    def test_get_job_detail(self):
        """Test get job detail"""
        if not self.job_id:
            self.log_test("Get Job Detail", False, "No job ID available")
            return False
            
        success, status, data = self.make_request('GET', f'jobs/{self.job_id}')
        self.log_test("Get Job Detail", success and 'job_number' in data, 
                     f"Status: {status}, Has job data: {'job_number' in data}")
        return success

    def test_add_diagnosis(self):
        """Test add diagnosis to job"""
        if not self.job_id:
            self.log_test("Add Diagnosis", False, "No job ID available")
            return False
            
        diagnosis_data = {
            "diagnosis": "Screen replacement required",
            "estimated_cost": 2500.0,
            "estimated_timeline": "2-3 working days",
            "parts_required": "LCD Screen, Touch Panel"
        }
        
        success, status, data = self.make_request('PUT', f'jobs/{self.job_id}/diagnosis', diagnosis_data)
        self.log_test("Add Diagnosis", success and data.get('status') == 'waiting_for_approval', 
                     f"Status: {status}, Job status updated: {data.get('status') if success else 'N/A'}")
        return success

    def test_mark_repaired(self):
        """Test mark job as repaired"""
        if not self.job_id:
            self.log_test("Mark Repaired", False, "No job ID available")
            return False
            
        repair_data = {
            "work_done": "Replaced LCD screen and touch panel",
            "parts_replaced": "LCD Screen, Touch Panel",
            "final_amount": 2500.0,
            "warranty_info": "30 days warranty"
        }
        
        success, status, data = self.make_request('PUT', f'jobs/{self.job_id}/repair', repair_data)
        self.log_test("Mark Repaired", success and data.get('status') == 'repaired', 
                     f"Status: {status}, Job status updated: {data.get('status') if success else 'N/A'}")
        return success

    def test_close_job(self):
        """Test close job"""
        if not self.job_id:
            self.log_test("Close Job", False, "No job ID available")
            return False
            
        close_data = {
            "device_delivered": True,
            "accessories_returned": ["Charger"],
            "payment_mode": "Cash",
            "invoice_reference": "INV-001"
        }
        
        success, status, data = self.make_request('PUT', f'jobs/{self.job_id}/close', close_data)
        self.log_test("Close Job", success and data.get('status') == 'closed', 
                     f"Status: {status}, Job status updated: {data.get('status') if success else 'N/A'}")
        return success

    def test_whatsapp_message(self):
        """Test WhatsApp message generation"""
        if not self.job_id:
            self.log_test("WhatsApp Message", False, "No job ID available")
            return False
            
        success, status, data = self.make_request('GET', f'jobs/{self.job_id}/whatsapp-message?message_type=received')
        has_message = success and 'message' in data and 'whatsapp_url' in data
        
        self.log_test("WhatsApp Message", has_message, 
                     f"Status: {status}, Has message data: {has_message}")
        return success

    def test_pdf_generation(self):
        """Test PDF generation"""
        if not self.job_id:
            self.log_test("PDF Generation", False, "No job ID available")
            return False
            
        # For PDF, we expect different content type, so we'll check if endpoint responds
        url = f"{self.base_url}/jobs/{self.job_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            success = response.status_code == 200
            self.log_test("PDF Generation", success, 
                         f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'N/A')}")
            return success
        except Exception as e:
            self.log_test("PDF Generation", False, f"Error: {str(e)}")
            return False

    def test_list_users(self):
        """Test list users"""
        success, status, data = self.make_request('GET', 'users')
        self.log_test("List Users", success and isinstance(data, list), 
                     f"Status: {status}, User count: {len(data) if isinstance(data, list) else 0}")
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AfterSales.pro API Tests")
        print("=" * 50)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Try login with test credentials first
        if not self.test_login():
            print("⚠️  Login with test credentials failed, trying signup...")
            if not self.test_signup():
                print("❌ Both login and signup failed - stopping tests")
                return False
        
        # Authentication tests
        self.test_get_me()
        self.test_get_tenant()
        
        # Branch management
        self.test_list_branches()
        self.test_create_branch()
        
        # User management
        self.test_list_users()
        
        # Job management workflow
        self.test_get_job_stats()
        self.test_list_jobs()
        self.test_create_job()
        self.test_get_job_detail()
        
        # Job lifecycle
        self.test_add_diagnosis()
        self.test_mark_repaired()
        self.test_close_job()
        
        # Additional features
        self.test_whatsapp_message()
        self.test_pdf_generation()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AfterSalesAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())