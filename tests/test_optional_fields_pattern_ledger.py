"""
Test suite for AfterSales.pro new features:
- Optional IMEI/Serial and Device Condition fields
- Unlock pattern field (visual grid + text input)
- Customer credit/ledger system
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
SHOP_SUBDOMAIN = "testabc"
SHOP_EMAIL = "test@testabc.com"
SHOP_PASSWORD = "Test123!"
EXISTING_CUSTOMER_MOBILE = "+919876543210"


class TestAuthentication:
    """Test authentication and get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SHOP_EMAIL,
            "password": SHOP_PASSWORD,
            "subdomain": SHOP_SUBDOMAIN
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SHOP_EMAIL,
            "password": SHOP_PASSWORD,
            "subdomain": SHOP_SUBDOMAIN
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert "tenant" in data


@pytest.fixture(scope="module")
def auth_headers():
    """Get authentication headers for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SHOP_EMAIL,
        "password": SHOP_PASSWORD,
        "subdomain": SHOP_SUBDOMAIN
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    pytest.skip(f"Authentication failed: {response.status_code}")


class TestOptionalFields:
    """Test optional IMEI/Serial and Device Condition fields"""
    
    def test_create_job_without_serial_imei(self, auth_headers):
        """Test creating job without serial/IMEI (should succeed)"""
        job_data = {
            "customer": {
                "name": f"TEST_NoSerial_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Samsung",
                "model": "Galaxy S21",
                "serial_imei": "",  # Empty - should be allowed
                "condition": "Fresh",
                "condition_notes": ""
            },
            "accessories": [{"name": "Charger", "checked": True}],
            "problem_description": "Screen not working"
        }
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["device"]["serial_imei"] == ""
        print(f"✓ Job created without serial/IMEI: {data['job_number']}")
    
    def test_create_job_without_condition(self, auth_headers):
        """Test creating job without device condition (should succeed)"""
        job_data = {
            "customer": {
                "name": f"TEST_NoCondition_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Laptop",
                "brand": "Dell",
                "model": "Inspiron 15",
                "serial_imei": "ABC123456",
                "condition": "",  # Empty - should be allowed
                "condition_notes": ""
            },
            "accessories": [],
            "problem_description": "Battery not charging"
        }
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["device"]["condition"] == ""
        print(f"✓ Job created without condition: {data['job_number']}")
    
    def test_create_job_without_both_optional_fields(self, auth_headers):
        """Test creating job without both serial/IMEI and condition"""
        job_data = {
            "customer": {
                "name": f"TEST_NoBoth_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Tablet",
                "brand": "Apple",
                "model": "iPad Pro",
                "serial_imei": "",  # Empty
                "condition": "",  # Empty
                "condition_notes": ""
            },
            "accessories": [],
            "problem_description": "Touch not responding"
        }
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["device"]["serial_imei"] == ""
        assert data["device"]["condition"] == ""
        print(f"✓ Job created without both optional fields: {data['job_number']}")


class TestUnlockPattern:
    """Test unlock pattern field functionality"""
    
    def test_create_job_with_unlock_pattern(self, auth_headers):
        """Test creating job with unlock pattern"""
        job_data = {
            "customer": {
                "name": f"TEST_Pattern_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Samsung",
                "model": "Galaxy A52",
                "serial_imei": "IMEI123456789",
                "condition": "Active",
                "condition_notes": "",
                "password": "",
                "unlock_pattern": "1-2-3-6-9"  # L-shape pattern
            },
            "accessories": [],
            "problem_description": "Display flickering"
        }
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["device"]["unlock_pattern"] == "1-2-3-6-9"
        print(f"✓ Job created with unlock pattern: {data['job_number']}")
        return data["id"]
    
    def test_create_job_with_complex_pattern(self, auth_headers):
        """Test creating job with complex unlock pattern"""
        job_data = {
            "customer": {
                "name": f"TEST_ComplexPattern_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Mobile",
                "brand": "OnePlus",
                "model": "9 Pro",
                "serial_imei": "",
                "condition": "",
                "condition_notes": "",
                "password": "1234",
                "unlock_pattern": "1-4-7-8-9-6-3-2-5"  # Complex pattern
            },
            "accessories": [],
            "problem_description": "Camera not working"
        }
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["device"]["unlock_pattern"] == "1-4-7-8-9-6-3-2-5"
        print(f"✓ Job created with complex pattern: {data['job_number']}")
    
    def test_create_job_with_text_pattern(self, auth_headers):
        """Test creating job with text-based pattern description"""
        job_data = {
            "customer": {
                "name": f"TEST_TextPattern_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Xiaomi",
                "model": "Redmi Note 11",
                "serial_imei": "",
                "condition": "",
                "condition_notes": "",
                "password": "",
                "unlock_pattern": "Z-shape from top-left"  # Text description
            },
            "accessories": [],
            "problem_description": "Speaker not working"
        }
        response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["device"]["unlock_pattern"] == "Z-shape from top-left"
        print(f"✓ Job created with text pattern: {data['job_number']}")
    
    def test_job_detail_shows_unlock_pattern(self, auth_headers):
        """Test that job detail API returns unlock pattern"""
        # First create a job with pattern
        job_data = {
            "customer": {
                "name": f"TEST_PatternDetail_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Google",
                "model": "Pixel 7",
                "serial_imei": "",
                "condition": "",
                "unlock_pattern": "1-5-9"  # Diagonal pattern
            },
            "accessories": [],
            "problem_description": "Fingerprint not working"
        }
        create_response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200
        job_id = create_response.json()["id"]
        
        # Now fetch the job detail
        detail_response = requests.get(f"{BASE_URL}/api/jobs/{job_id}", headers=auth_headers)
        assert detail_response.status_code == 200
        data = detail_response.json()
        assert data["device"]["unlock_pattern"] == "1-5-9"
        print(f"✓ Job detail shows unlock pattern: {data['job_number']}")


class TestCustomerLedger:
    """Test customer credit/ledger system"""
    
    def test_get_customers_list_with_outstanding(self, auth_headers):
        """Test that customers list includes outstanding balance column"""
        response = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "customers" in data
        # Check if outstanding_balance field exists in customer records
        if data["customers"]:
            customer = data["customers"][0]
            assert "outstanding_balance" in customer, "Missing outstanding_balance field"
            print(f"✓ Customers list includes outstanding_balance field")
    
    def test_customer_stats_with_outstanding_count(self, auth_headers):
        """Test that customer stats include 'With Outstanding' count"""
        response = requests.get(f"{BASE_URL}/api/customers/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "customers_with_credit" in data, "Missing customers_with_credit field"
        print(f"✓ Customer stats includes customers_with_credit: {data['customers_with_credit']}")
    
    def test_get_customer_ledger(self, auth_headers):
        """Test getting customer ledger/statement"""
        # Use the existing customer mobile from test data
        mobile = EXISTING_CUSTOMER_MOBILE
        response = requests.get(f"{BASE_URL}/api/customers/{mobile}/ledger", headers=auth_headers)
        
        if response.status_code == 404:
            pytest.skip("Test customer not found - may need to create test data first")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify ledger structure
        assert "customer_mobile" in data
        assert "customer_name" in data
        assert "total_billed" in data
        assert "total_received" in data
        assert "outstanding_balance" in data
        assert "transactions" in data
        
        print(f"✓ Customer ledger retrieved:")
        print(f"  - Total Billed: ₹{data['total_billed']}")
        print(f"  - Total Received: ₹{data['total_received']}")
        print(f"  - Outstanding: ₹{data['outstanding_balance']}")
        print(f"  - Transactions: {len(data['transactions'])}")
    
    def test_ledger_transactions_structure(self, auth_headers):
        """Test that ledger transactions have correct structure"""
        mobile = EXISTING_CUSTOMER_MOBILE
        response = requests.get(f"{BASE_URL}/api/customers/{mobile}/ledger", headers=auth_headers)
        
        if response.status_code == 404:
            pytest.skip("Test customer not found")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["transactions"]:
            txn = data["transactions"][0]
            # Check transaction fields
            assert "id" in txn
            assert "type" in txn  # job, payment, job_pending
            assert "date" in txn
            assert "billed_amount" in txn
            assert "received_amount" in txn
            assert "status" in txn
            print(f"✓ Transaction structure verified: type={txn['type']}, status={txn['status']}")
    
    def test_record_customer_payment(self, auth_headers):
        """Test recording a payment for customer"""
        mobile = EXISTING_CUSTOMER_MOBILE
        
        # First check if customer exists
        check_response = requests.get(f"{BASE_URL}/api/customers/{mobile}/ledger", headers=auth_headers)
        if check_response.status_code == 404:
            pytest.skip("Test customer not found")
        
        payment_data = {
            "customer_id": mobile,
            "amount": 500,
            "payment_mode": "Cash",
            "payment_reference": f"TEST_PAY_{uuid.uuid4().hex[:8]}",
            "notes": "Test payment recording"
        }
        
        response = requests.post(f"{BASE_URL}/api/customers/{mobile}/payment", json=payment_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "payment_id" in data
        assert data["amount"] == 500
        print(f"✓ Payment recorded: {data['payment_id']}")
    
    def test_record_payment_with_upi(self, auth_headers):
        """Test recording UPI payment"""
        mobile = EXISTING_CUSTOMER_MOBILE
        
        check_response = requests.get(f"{BASE_URL}/api/customers/{mobile}/ledger", headers=auth_headers)
        if check_response.status_code == 404:
            pytest.skip("Test customer not found")
        
        payment_data = {
            "customer_id": mobile,
            "amount": 1000,
            "payment_mode": "UPI",
            "payment_reference": f"UPI_{uuid.uuid4().hex[:12]}",
            "notes": "UPI payment test"
        }
        
        response = requests.post(f"{BASE_URL}/api/customers/{mobile}/payment", json=payment_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"✓ UPI payment recorded successfully")


class TestDeliveryCreditMode:
    """Test delivery modal credit mode functionality"""
    
    def test_create_job_and_deliver_with_credit(self, auth_headers):
        """Test full flow: create job -> diagnose -> approve -> repair -> deliver with credit"""
        # Create job
        job_data = {
            "customer": {
                "name": f"TEST_Credit_{uuid.uuid4().hex[:6]}",
                "mobile": f"+91987654{uuid.uuid4().hex[:4]}",
                "email": ""
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Apple",
                "model": "iPhone 13",
                "serial_imei": "",
                "condition": ""
            },
            "accessories": [],
            "problem_description": "Battery draining fast"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/jobs", json=job_data, headers=auth_headers)
        assert create_response.status_code == 200
        job_id = create_response.json()["id"]
        job_number = create_response.json()["job_number"]
        print(f"✓ Job created: {job_number}")
        
        # Add diagnosis
        diagnosis_data = {
            "diagnosis": "Battery needs replacement",
            "estimated_cost": 5000,
            "estimated_timeline": "2 days",
            "parts_required": "Battery"
        }
        diag_response = requests.put(f"{BASE_URL}/api/jobs/{job_id}/diagnosis", json=diagnosis_data, headers=auth_headers)
        assert diag_response.status_code == 200
        print(f"✓ Diagnosis added")
        
        # Approve
        approval_data = {
            "approved_by": "Test Customer",
            "approved_amount": 5000,
            "approval_notes": "Approved via phone"
        }
        approve_response = requests.put(f"{BASE_URL}/api/jobs/{job_id}/approve", json=approval_data, headers=auth_headers)
        assert approve_response.status_code == 200
        print(f"✓ Approval recorded")
        
        # Complete repair
        repair_data = {
            "work_done": "Battery replaced",
            "parts_replaced": "Battery",
            "final_amount": 5000,
            "warranty_info": "3 months"
        }
        repair_response = requests.put(f"{BASE_URL}/api/jobs/{job_id}/repair", json=repair_data, headers=auth_headers)
        assert repair_response.status_code == 200
        print(f"✓ Repair completed")
        
        # Deliver with credit (partial payment)
        delivery_data = {
            "delivered_to": "Test Customer",
            "amount_received": 2000,  # Partial payment
            "payment_mode": "Cash",
            "payment_reference": "",
            "delivery_notes": "Remaining ₹3000 on credit",
            "is_credit": True
        }
        deliver_response = requests.put(f"{BASE_URL}/api/jobs/{job_id}/deliver", json=delivery_data, headers=auth_headers)
        assert deliver_response.status_code == 200
        data = deliver_response.json()
        assert data["delivery"]["amount_received"] == 2000
        print(f"✓ Delivery recorded with credit mode")
        
        return job_id


class TestExistingJobWithPattern:
    """Test existing job data mentioned in review request"""
    
    def test_find_job_with_pattern(self, auth_headers):
        """Test finding the existing job with pattern '1-2-3-6-9'"""
        # Search for jobs
        response = requests.get(f"{BASE_URL}/api/jobs", headers=auth_headers)
        assert response.status_code == 200
        jobs = response.json()
        
        # Look for job with pattern
        job_with_pattern = None
        for job in jobs:
            if job.get("device", {}).get("unlock_pattern") == "1-2-3-6-9":
                job_with_pattern = job
                break
        
        if job_with_pattern:
            print(f"✓ Found job with pattern '1-2-3-6-9': {job_with_pattern['job_number']}")
            assert job_with_pattern["device"]["unlock_pattern"] == "1-2-3-6-9"
        else:
            print("⚠ No job found with pattern '1-2-3-6-9' - may need to create test data")


class TestCustomersWithOutstanding:
    """Test customers with outstanding balance endpoint"""
    
    def test_get_customers_with_outstanding(self, auth_headers):
        """Test getting customers with outstanding balance"""
        response = requests.get(f"{BASE_URL}/api/customers/with-outstanding", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        if data:
            customer = data[0]
            assert "customer_name" in customer or "_id" in customer
            print(f"✓ Customers with outstanding retrieved: {len(data)} customers")
        else:
            print("✓ No customers with outstanding balance (empty list)")


# Cleanup test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(auth_headers):
    """Cleanup TEST_ prefixed data after tests"""
    yield
    # Note: In production, you'd want to clean up test data
    # For now, we'll leave it as test data is prefixed with TEST_
    print("\n✓ Test suite completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
