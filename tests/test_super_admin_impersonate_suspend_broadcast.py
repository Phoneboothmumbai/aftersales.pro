"""
Test Super Admin New Features - Iteration 9:
1. Login as Shop (Impersonation) - /api/super-admin/tenants/{id}/impersonate
2. Suspend Shop - /api/super-admin/tenants/{id}/suspend
3. Unsuspend Shop - /api/super-admin/tenants/{id}/unsuspend
4. Broadcast Announcements - /api/super-admin/announcements
5. Support Tickets - /api/super-admin/tickets
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


@pytest.fixture(scope="module")
def test_tenant_id(auth_headers):
    """Create a test tenant and return its ID"""
    unique_id = str(uuid.uuid4())[:8]
    shop_data = {
        "company_name": f"TEST_ImpersonateSuspend_{unique_id}",
        "subdomain": f"testis{unique_id}",
        "admin_name": "Test Admin",
        "admin_email": f"testis{unique_id}@test.com",
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


class TestImpersonation:
    """Test Login as Shop (Impersonation) - POST /api/super-admin/tenants/{id}/impersonate"""
    
    def test_impersonate_requires_auth(self, test_tenant_id):
        """Test that impersonate requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/impersonate"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Impersonate requires authentication")
    
    def test_impersonate_success(self, auth_headers, test_tenant_id):
        """Test successful impersonation"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/impersonate",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user info"
        assert "tenant" in data, "Response should contain tenant info"
        
        # Verify user info
        assert data["user"]["tenant_id"] == test_tenant_id
        assert data["user"]["role"] == "admin"
        
        # Verify tenant info
        assert data["tenant"]["id"] == test_tenant_id
        
        print(f"✓ Impersonation successful for tenant: {data['tenant']['company_name']}")
    
    def test_impersonate_invalid_tenant(self, auth_headers):
        """Test impersonate for non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/invalid-tenant-id/impersonate",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid tenant ID handled correctly")
    
    def test_impersonate_token_is_valid(self, auth_headers, test_tenant_id):
        """Test that impersonation token can be used to access tenant data"""
        # Get impersonation token
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/impersonate",
            headers=auth_headers
        )
        assert response.status_code == 200
        impersonate_token = response.json()["token"]
        
        # Use token to access tenant data
        tenant_response = requests.get(
            f"{BASE_URL}/api/tenants/me",
            headers={"Authorization": f"Bearer {impersonate_token}"}
        )
        assert tenant_response.status_code == 200, f"Token should be valid: {tenant_response.text}"
        tenant_data = tenant_response.json()
        assert tenant_data["id"] == test_tenant_id
        print(f"✓ Impersonation token is valid and can access tenant data")


class TestSuspendUnsuspend:
    """Test Suspend/Unsuspend Shop endpoints"""
    
    def test_suspend_requires_auth(self, test_tenant_id):
        """Test that suspend requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/suspend",
            json={"reason": "Test", "notify_admin": True}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Suspend requires authentication")
    
    def test_suspend_requires_reason(self, auth_headers, test_tenant_id):
        """Test that suspend requires a reason"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/suspend",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print(f"✓ Suspend requires reason field")
    
    def test_suspend_success(self, auth_headers, test_tenant_id):
        """Test successful shop suspension"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/suspend",
            json={"reason": "Test suspension for testing", "notify_admin": True},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "suspended" in data["message"].lower()
        print(f"✓ Shop suspended successfully")
        
        # Verify tenant is now suspended
        tenant_response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}",
            headers=auth_headers
        )
        assert tenant_response.status_code == 200
        tenant_data = tenant_response.json()
        assert tenant_data["tenant"]["is_active"] == False, "Tenant should be inactive after suspension"
        assert "suspension_reason" in tenant_data["tenant"], "Tenant should have suspension_reason"
        print(f"✓ Tenant is_active is False after suspension")
    
    def test_unsuspend_requires_auth(self, test_tenant_id):
        """Test that unsuspend requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/unsuspend"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Unsuspend requires authentication")
    
    def test_unsuspend_success(self, auth_headers, test_tenant_id):
        """Test successful shop unsuspension"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}/unsuspend",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "unsuspended" in data["message"].lower()
        print(f"✓ Shop unsuspended successfully")
        
        # Verify tenant is now active
        tenant_response = requests.get(
            f"{BASE_URL}/api/super-admin/tenants/{test_tenant_id}",
            headers=auth_headers
        )
        assert tenant_response.status_code == 200
        tenant_data = tenant_response.json()
        assert tenant_data["tenant"]["is_active"] == True, "Tenant should be active after unsuspension"
        print(f"✓ Tenant is_active is True after unsuspension")
    
    def test_suspend_invalid_tenant(self, auth_headers):
        """Test suspend for non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/invalid-tenant-id/suspend",
            json={"reason": "Test", "notify_admin": True},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid tenant ID handled correctly for suspend")
    
    def test_unsuspend_invalid_tenant(self, auth_headers):
        """Test unsuspend for non-existent tenant"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tenants/invalid-tenant-id/unsuspend",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid tenant ID handled correctly for unsuspend")


class TestAnnouncements:
    """Test Broadcast Announcements - /api/super-admin/announcements"""
    
    def test_get_announcements_requires_auth(self):
        """Test that get announcements requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/announcements")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Get announcements requires authentication")
    
    def test_get_announcements_success(self, auth_headers):
        """Test successful announcements retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/announcements",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Retrieved {len(data)} announcements")
    
    def test_create_announcement_requires_auth(self):
        """Test that create announcement requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/announcements",
            json={"title": "Test", "content": "Test content"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Create announcement requires authentication")
    
    def test_create_announcement_success(self, auth_headers):
        """Test successful announcement creation"""
        unique_id = str(uuid.uuid4())[:8]
        announcement_data = {
            "title": f"TEST_Announcement_{unique_id}",
            "content": "This is a test announcement content",
            "type": "info",
            "target": "all"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/super-admin/announcements",
            json=announcement_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "announcement" in data
        assert data["announcement"]["title"] == announcement_data["title"]
        print(f"✓ Announcement created: {data['announcement']['id']}")
        return data["announcement"]["id"]
    
    def test_create_announcement_with_type_warning(self, auth_headers):
        """Test announcement creation with warning type"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/super-admin/announcements",
            json={
                "title": f"TEST_Warning_{unique_id}",
                "content": "This is a warning announcement",
                "type": "warning",
                "target": "all"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ Warning announcement created")
    
    def test_create_announcement_with_target_trial(self, auth_headers):
        """Test announcement creation targeting trial users"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/super-admin/announcements",
            json={
                "title": f"TEST_Trial_{unique_id}",
                "content": "This is for trial users only",
                "type": "info",
                "target": "trial"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ Trial-targeted announcement created")
    
    def test_delete_announcement_requires_auth(self):
        """Test that delete announcement requires authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/super-admin/announcements/some-id"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Delete announcement requires authentication")
    
    def test_delete_announcement_success(self, auth_headers):
        """Test successful announcement deletion"""
        # First create an announcement
        unique_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/super-admin/announcements",
            json={
                "title": f"TEST_ToDelete_{unique_id}",
                "content": "This will be deleted",
                "type": "info",
                "target": "all"
            },
            headers=auth_headers
        )
        assert create_response.status_code == 200
        announcement_id = create_response.json()["announcement"]["id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/super-admin/announcements/{announcement_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"✓ Announcement deleted successfully")
    
    def test_delete_announcement_invalid_id(self, auth_headers):
        """Test delete announcement with invalid ID"""
        response = requests.delete(
            f"{BASE_URL}/api/super-admin/announcements/invalid-id",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid announcement ID handled correctly")


class TestSupportTickets:
    """Test Support Tickets - /api/super-admin/tickets"""
    
    def test_get_tickets_requires_auth(self):
        """Test that get tickets requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/tickets")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Get tickets requires authentication")
    
    def test_get_tickets_success(self, auth_headers):
        """Test successful tickets retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/tickets",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Retrieved {len(data)} tickets")
    
    def test_get_tickets_with_status_filter(self, auth_headers):
        """Test tickets retrieval with status filter"""
        for status in ["all", "open", "replied", "closed"]:
            response = requests.get(
                f"{BASE_URL}/api/super-admin/tickets?status={status}",
                headers=auth_headers
            )
            assert response.status_code == 200, f"Expected 200 for status={status}, got {response.status_code}"
        print(f"✓ Tickets filter by status works")
    
    def test_reply_to_ticket_requires_auth(self):
        """Test that reply to ticket requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tickets/some-id/reply",
            json={"message": "Test reply"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Reply to ticket requires authentication")
    
    def test_reply_to_invalid_ticket(self, auth_headers):
        """Test reply to non-existent ticket"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tickets/invalid-id/reply",
            json={"message": "Test reply"},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid ticket ID handled correctly for reply")
    
    def test_close_ticket_requires_auth(self):
        """Test that close ticket requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tickets/some-id/close"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Close ticket requires authentication")
    
    def test_close_invalid_ticket(self, auth_headers):
        """Test close non-existent ticket"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/tickets/invalid-id/close",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid ticket ID handled correctly for close")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
