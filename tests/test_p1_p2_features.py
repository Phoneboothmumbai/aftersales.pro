"""
Test suite for P1 and P2 features:
- P1: Photo upload (upload, delete photos for jobs)
- P2: QR code in PDF (job PDF contains QR code)
- P2: Public tracking page (/api/public/track endpoint)
- P2: Tracking link in job detail
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://aftersales-repair.preview.emergentagent.com')

# Test credentials from the review request
TEST_TENANT = {
    "subdomain": "shop1768470232",
    "email": "admin1768470232@test.com",
    "password": "Test@123"
}

EXISTING_JOB = {
    "id": "d09d75c7-cbe0-4cda-bd54-4a1a22b70cf1",
    "job_number": "JOB-2026-000001",
    "tracking_token": "DF083B83"
}


class TestPublicTracking:
    """P2: Public tracking endpoint tests - no auth required"""
    
    def test_public_track_valid_job(self):
        """Test public tracking with valid job number and token"""
        response = requests.get(
            f"{BASE_URL}/api/public/track/{EXISTING_JOB['job_number']}/{EXISTING_JOB['tracking_token']}"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "job_number" in data
        assert "status" in data
        assert "device_brand" in data
        assert "device_model" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "status_history" in data
        assert "company_name" in data
        
        # Validate values
        assert data["job_number"] == EXISTING_JOB["job_number"]
        assert isinstance(data["status_history"], list)
        assert len(data["status_history"]) > 0
        
        # Verify sanitized history (no user_id exposed)
        for entry in data["status_history"]:
            assert "user_id" not in entry, "user_id should not be exposed in public tracking"
            assert "status" in entry
            assert "timestamp" in entry
    
    def test_public_track_invalid_job_number(self):
        """Test public tracking with invalid job number"""
        response = requests.get(
            f"{BASE_URL}/api/public/track/INVALID-JOB-123/{EXISTING_JOB['tracking_token']}"
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_public_track_invalid_token(self):
        """Test public tracking with invalid tracking token"""
        response = requests.get(
            f"{BASE_URL}/api/public/track/{EXISTING_JOB['job_number']}/WRONGTOKEN"
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
    
    def test_public_track_no_auth_required(self):
        """Verify public tracking doesn't require authentication"""
        # Make request without any auth headers
        response = requests.get(
            f"{BASE_URL}/api/public/track/{EXISTING_JOB['job_number']}/{EXISTING_JOB['tracking_token']}",
            headers={}  # No auth headers
        )
        assert response.status_code == 200, "Public tracking should not require authentication"


class TestAuthentication:
    """Authentication tests for protected endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
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
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert "tenant" in data


class TestTrackingLink:
    """P2: Tracking link endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_get_tracking_link(self, auth_token):
        """Test getting tracking link for a job"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/tracking-link",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "job_number" in data
        assert "tracking_token" in data
        assert "tracking_path" in data
        
        # Validate values
        assert data["job_number"] == EXISTING_JOB["job_number"]
        assert data["tracking_token"] == EXISTING_JOB["tracking_token"]
        assert f"/track/{EXISTING_JOB['job_number']}/{EXISTING_JOB['tracking_token']}" in data["tracking_path"]
    
    def test_tracking_link_requires_auth(self):
        """Test that tracking link endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/tracking-link"
        )
        assert response.status_code in [401, 403], "Tracking link should require authentication"


class TestJobWithTrackingToken:
    """Test that jobs have tracking_token field"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_job_has_tracking_token(self, auth_token):
        """Test that job response includes tracking_token"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "tracking_token" in data, "Job should have tracking_token field"
        assert data["tracking_token"] == EXISTING_JOB["tracking_token"]
    
    def test_job_has_photos_field(self, auth_token):
        """Test that job response includes photos field"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "photos" in data, "Job should have photos field"
        assert isinstance(data["photos"], list), "photos should be a list"


class TestPhotoUpload:
    """P1: Photo upload tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_upload_photo_before_type(self, auth_token):
        """Test uploading a 'before' type photo"""
        # Create a simple test image (1x1 pixel PNG)
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_before.png', io.BytesIO(test_image), 'image/png')
        }
        data = {
            'photo_type': 'before'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "message" in result
        assert "photo" in result
        assert result["photo"]["type"] == "before"
        assert "id" in result["photo"]
        assert "url" in result["photo"]
        
        # Store photo_id for cleanup
        return result["photo"]["id"]
    
    def test_upload_photo_damage_type(self, auth_token):
        """Test uploading a 'damage' type photo"""
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_damage.png', io.BytesIO(test_image), 'image/png')
        }
        data = {
            'photo_type': 'damage'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        assert response.status_code == 200
        
        result = response.json()
        assert result["photo"]["type"] == "damage"
    
    def test_upload_photo_after_type(self, auth_token):
        """Test uploading an 'after' type photo"""
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_after.png', io.BytesIO(test_image), 'image/png')
        }
        data = {
            'photo_type': 'after'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        assert response.status_code == 200
        
        result = response.json()
        assert result["photo"]["type"] == "after"
    
    def test_upload_photo_requires_auth(self):
        """Test that photo upload requires authentication"""
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test.png', io.BytesIO(test_image), 'image/png')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos",
            files=files
        )
        assert response.status_code in [401, 403], "Photo upload should require authentication"
    
    def test_upload_invalid_file_type(self, auth_token):
        """Test uploading an invalid file type"""
        files = {
            'file': ('test.txt', io.BytesIO(b'This is not an image'), 'text/plain')
        }
        data = {
            'photo_type': 'before'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        assert response.status_code == 400, "Should reject invalid file types"


class TestPhotoDelete:
    """P1: Photo delete tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_delete_photo(self, auth_token):
        """Test deleting a photo from a job"""
        # First upload a photo
        test_image = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('test_delete.png', io.BytesIO(test_image), 'image/png')
        }
        data = {
            'photo_type': 'before'
        }
        
        upload_response = requests.post(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files,
            data=data
        )
        assert upload_response.status_code == 200
        photo_id = upload_response.json()["photo"]["id"]
        
        # Now delete the photo
        delete_response = requests.delete(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos/{photo_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        result = delete_response.json()
        assert "message" in result
        
        # Verify photo is removed from job
        job_response = requests.get(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        job_data = job_response.json()
        photo_ids = [p["id"] for p in job_data.get("photos", [])]
        assert photo_id not in photo_ids, "Deleted photo should not be in job photos"
    
    def test_delete_nonexistent_photo(self, auth_token):
        """Test deleting a photo that doesn't exist"""
        response = requests.delete(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos/nonexistent-photo-id",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
    
    def test_delete_photo_requires_auth(self):
        """Test that photo delete requires authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/photos/some-photo-id"
        )
        assert response.status_code in [401, 403], "Photo delete should require authentication"


class TestPDFWithQRCode:
    """P2: PDF generation with QR code tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_pdf_generation(self, auth_token):
        """Test that PDF is generated successfully"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/pdf",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check content type
        assert "application/pdf" in response.headers.get("Content-Type", "")
        
        # Check content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert EXISTING_JOB["job_number"] in content_disposition
        
        # Verify PDF content starts with PDF header
        assert response.content[:4] == b'%PDF', "Response should be a valid PDF"
        
        # PDF should have reasonable size (with QR code it should be larger)
        assert len(response.content) > 1000, "PDF should have substantial content"
    
    def test_pdf_requires_auth(self):
        """Test that PDF generation requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/jobs/{EXISTING_JOB['id']}/pdf"
        )
        assert response.status_code in [401, 403], "PDF generation should require authentication"


class TestJobCreationWithTrackingToken:
    """Test that new jobs are created with tracking_token"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
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
    
    def test_new_job_has_tracking_token(self, auth_token):
        """Test that newly created job has tracking_token"""
        job_data = {
            "customer": {
                "name": "TEST_TrackingTest Customer",
                "mobile": "9876543210",
                "email": "test@example.com"
            },
            "device": {
                "device_type": "Mobile",
                "brand": "Samsung",
                "model": "Galaxy S21",
                "serial_imei": "TEST123456789",
                "condition": "Active"
            },
            "accessories": [
                {"name": "Charger", "checked": True}
            ],
            "problem_description": "Test job for tracking token verification"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/jobs",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=job_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "tracking_token" in data, "New job should have tracking_token"
        assert data["tracking_token"] is not None, "tracking_token should not be None"
        assert len(data["tracking_token"]) == 8, "tracking_token should be 8 characters"
        assert data["tracking_token"].isupper(), "tracking_token should be uppercase"
        
        # Also verify photos field is initialized
        assert "photos" in data, "New job should have photos field"
        assert data["photos"] == [], "photos should be empty list for new job"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
