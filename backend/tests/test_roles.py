"""
Test suite for Role-Based Access Control (RBAC) feature
Tests: GET /api/roles, POST /api/roles, PUT /api/roles/{role_id}, DELETE /api/roles/{role_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iterations
TEST_SUBDOMAIN = "demo"
TEST_EMAIL = "admin@demo.com"
TEST_PASSWORD = "demo123"

class TestRoleManagement:
    """Test suite for Role Management endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "subdomain": TEST_SUBDOMAIN
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with authorization token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_role_id(self, auth_headers):
        """Create a test role and return its ID, cleanup after tests"""
        # Create a test role
        test_role = {
            "name": "TEST_CustomRole",
            "description": "Test custom role for automated testing",
            "permissions": {
                "modules": {
                    "jobs": {"view": True, "create": True, "edit": False, "delete": False},
                    "customers": {"view": True, "create": False, "edit": False, "delete": False},
                    "inventory": {"view": False, "create": False, "edit": False, "delete": False},
                    "team": {"view": False, "create": False, "edit": False, "delete": False},
                    "reports": {"view": False, "create": False, "edit": False, "delete": False},
                    "settings": {"view": False, "create": False, "edit": False, "delete": False},
                    "billing": {"view": False, "create": False, "edit": False, "delete": False},
                    "branches": {"view": False, "create": False, "edit": False, "delete": False},
                },
                "actions": {
                    "approve_jobs": False,
                    "record_payment": True,
                    "view_profit_reports": False,
                    "send_whatsapp": True,
                    "download_pdf": True,
                    "assign_technician": False,
                    "manage_inventory": False,
                    "view_analytics": False,
                    "manage_roles": False,
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/roles", json=test_role, headers=auth_headers)
        if response.status_code != 200:
            pytest.skip(f"Failed to create test role: {response.text}")
        
        role_id = response.json()["id"]
        yield role_id
        
        # Cleanup: Delete the test role after all tests
        requests.delete(f"{BASE_URL}/api/roles/{role_id}", headers=auth_headers)
    
    # ============ GET /api/roles Tests ============
    
    def test_get_roles_returns_default_roles(self, auth_headers):
        """GET /api/roles should return 4 default system roles"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        roles = response.json()
        assert isinstance(roles, list), "Response should be a list"
        
        # Check for the 4 system roles
        role_names = [r["name"] for r in roles]
        expected_roles = ["Admin", "Manager", "Technician", "Receptionist"]
        
        for expected in expected_roles:
            assert expected in role_names, f"Missing system role: {expected}"
        
        print(f"✅ Found {len(roles)} roles including all 4 system roles")
    
    def test_system_roles_have_correct_structure(self, auth_headers):
        """Verify system roles have correct permission structure"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        assert response.status_code == 200
        
        roles = response.json()
        
        for role in roles:
            # Check required fields
            assert "id" in role, "Role should have 'id'"
            assert "name" in role, "Role should have 'name'"
            assert "permissions" in role, "Role should have 'permissions'"
            assert "is_system" in role, "Role should have 'is_system'"
            
            # Check permissions structure
            permissions = role["permissions"]
            assert "modules" in permissions, "Permissions should have 'modules'"
            assert "actions" in permissions, "Permissions should have 'actions'"
            
            # Check module permissions structure
            modules = permissions["modules"]
            for module_name, module_perms in modules.items():
                assert "view" in module_perms, f"Module {module_name} should have 'view'"
                assert "create" in module_perms, f"Module {module_name} should have 'create'"
                assert "edit" in module_perms, f"Module {module_name} should have 'edit'"
                assert "delete" in module_perms, f"Module {module_name} should have 'delete'"
        
        print("✅ All roles have correct permission structure")
    
    def test_admin_role_has_full_access(self, auth_headers):
        """Admin role should have full access to all modules"""
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        assert response.status_code == 200
        
        roles = response.json()
        admin_role = next((r for r in roles if r["name"] == "Admin"), None)
        
        assert admin_role is not None, "Admin role should exist"
        assert admin_role["is_system"] == True, "Admin should be a system role"
        
        # Check admin has full module access
        for module, perms in admin_role["permissions"]["modules"].items():
            assert perms["view"] == True, f"Admin should have view access to {module}"
            assert perms["create"] == True, f"Admin should have create access to {module}"
            assert perms["edit"] == True, f"Admin should have edit access to {module}"
            assert perms["delete"] == True, f"Admin should have delete access to {module}"
        
        # Check admin has full action access
        for action, enabled in admin_role["permissions"]["actions"].items():
            assert enabled == True, f"Admin should have access to action: {action}"
        
        print("✅ Admin role has full access to all modules and actions")
    
    def test_get_roles_unauthorized(self):
        """GET /api/roles without auth should return 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/roles")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Unauthorized access correctly rejected")
    
    # ============ POST /api/roles Tests ============
    
    def test_create_custom_role(self, auth_headers):
        """POST /api/roles should create a custom role"""
        custom_role = {
            "name": "TEST_SalesRepresentative",
            "description": "Custom role for sales team",
            "permissions": {
                "modules": {
                    "jobs": {"view": True, "create": True, "edit": False, "delete": False},
                    "customers": {"view": True, "create": True, "edit": True, "delete": False},
                    "inventory": {"view": True, "create": False, "edit": False, "delete": False},
                    "team": {"view": False, "create": False, "edit": False, "delete": False},
                    "reports": {"view": True, "create": False, "edit": False, "delete": False},
                    "settings": {"view": False, "create": False, "edit": False, "delete": False},
                    "billing": {"view": False, "create": False, "edit": False, "delete": False},
                    "branches": {"view": True, "create": False, "edit": False, "delete": False},
                },
                "actions": {
                    "approve_jobs": False,
                    "record_payment": True,
                    "view_profit_reports": False,
                    "send_whatsapp": True,
                    "download_pdf": True,
                    "assign_technician": False,
                    "manage_inventory": False,
                    "view_analytics": True,
                    "manage_roles": False,
                }
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/roles", json=custom_role, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_role = response.json()
        assert created_role["name"] == "TEST_SalesRepresentative"
        assert created_role["description"] == "Custom role for sales team"
        assert created_role["is_system"] == False, "Custom role should not be system role"
        assert "id" in created_role, "Created role should have an ID"
        
        # Verify permissions were saved
        assert created_role["permissions"]["modules"]["customers"]["edit"] == True
        assert created_role["permissions"]["actions"]["record_payment"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/roles/{created_role['id']}", headers=auth_headers)
        
        print("✅ Custom role created successfully")
    
    def test_create_role_duplicate_name_fails(self, auth_headers):
        """POST /api/roles with existing name should fail"""
        duplicate_role = {
            "name": "Admin",  # System role name
            "description": "Trying to create duplicate",
            "permissions": {
                "modules": {
                    "jobs": {"view": True, "create": False, "edit": False, "delete": False}
                },
                "actions": {}
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/roles", json=duplicate_role, headers=auth_headers)
        
        assert response.status_code == 400, f"Expected 400 for duplicate name, got {response.status_code}"
        assert "already exists" in response.json().get("detail", "").lower()
        
        print("✅ Duplicate role name correctly rejected")
    
    def test_create_role_requires_admin(self):
        """POST /api/roles without auth should fail"""
        new_role = {
            "name": "TEST_UnauthorizedRole",
            "description": "Should not be created",
            "permissions": {"modules": {}, "actions": {}}
        }
        
        response = requests.post(f"{BASE_URL}/api/roles", json=new_role)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("✅ Create role requires authentication")
    
    # ============ PUT /api/roles/{role_id} Tests ============
    
    def test_update_custom_role(self, auth_headers, test_role_id):
        """PUT /api/roles/{role_id} should update a custom role"""
        update_data = {
            "name": "TEST_CustomRoleUpdated",
            "description": "Updated description",
            "permissions": {
                "modules": {
                    "jobs": {"view": True, "create": True, "edit": True, "delete": False},
                    "customers": {"view": True, "create": True, "edit": False, "delete": False},
                    "inventory": {"view": True, "create": False, "edit": False, "delete": False},
                    "team": {"view": False, "create": False, "edit": False, "delete": False},
                    "reports": {"view": True, "create": False, "edit": False, "delete": False},
                    "settings": {"view": False, "create": False, "edit": False, "delete": False},
                    "billing": {"view": False, "create": False, "edit": False, "delete": False},
                    "branches": {"view": False, "create": False, "edit": False, "delete": False},
                },
                "actions": {
                    "approve_jobs": True,  # Changed to True
                    "record_payment": True,
                    "view_profit_reports": False,
                    "send_whatsapp": True,
                    "download_pdf": True,
                    "assign_technician": False,
                    "manage_inventory": False,
                    "view_analytics": True,  # Changed to True
                    "manage_roles": False,
                }
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/roles/{test_role_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated_role = response.json()
        assert updated_role["name"] == "TEST_CustomRoleUpdated"
        assert updated_role["description"] == "Updated description"
        assert updated_role["permissions"]["actions"]["approve_jobs"] == True
        assert updated_role["permissions"]["actions"]["view_analytics"] == True
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/roles/{test_role_id}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == "TEST_CustomRoleUpdated"
        
        print("✅ Custom role updated successfully and changes persisted")
    
    def test_update_system_role_permissions(self, auth_headers):
        """PUT /api/roles/{role_id} should allow updating system role permissions"""
        # Get the Technician role
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = response.json()
        technician_role = next((r for r in roles if r["name"] == "Technician"), None)
        
        assert technician_role is not None, "Technician role should exist"
        
        # Try to update permissions (should succeed for system roles)
        update_data = {
            "permissions": {
                "modules": {
                    "jobs": {"view": True, "create": True, "edit": True, "delete": False},
                    "customers": {"view": True, "create": False, "edit": False, "delete": False},
                    "inventory": {"view": True, "create": False, "edit": False, "delete": False},
                    "team": {"view": False, "create": False, "edit": False, "delete": False},
                    "reports": {"view": False, "create": False, "edit": False, "delete": False},
                    "settings": {"view": False, "create": False, "edit": False, "delete": False},
                    "billing": {"view": False, "create": False, "edit": False, "delete": False},
                    "branches": {"view": False, "create": False, "edit": False, "delete": False},
                },
                "actions": {
                    "approve_jobs": False,
                    "record_payment": False,
                    "view_profit_reports": False,
                    "send_whatsapp": True,
                    "download_pdf": True,
                    "assign_technician": False,
                    "manage_inventory": False,
                    "view_analytics": False,
                    "manage_roles": False,
                }
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/roles/{technician_role['id']}", json=update_data, headers=auth_headers)
        # Should succeed in updating permissions
        assert response.status_code == 200, f"Should allow updating system role permissions, got {response.status_code}"
        
        print("✅ System role permissions can be updated")
    
    def test_cannot_rename_admin_role(self, auth_headers):
        """PUT /api/roles/{role_id} should not allow renaming Admin role"""
        # Get the Admin role
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = response.json()
        admin_role = next((r for r in roles if r["name"] == "Admin"), None)
        
        assert admin_role is not None, "Admin role should exist"
        
        # Try to rename Admin
        update_data = {"name": "Super Admin"}
        
        response = requests.put(f"{BASE_URL}/api/roles/{admin_role['id']}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 400, f"Should not allow renaming Admin, got {response.status_code}"
        
        print("✅ Admin role cannot be renamed")
    
    def test_update_nonexistent_role(self, auth_headers):
        """PUT /api/roles/{role_id} with invalid ID should return 404"""
        update_data = {"name": "Doesn't Matter"}
        
        response = requests.put(f"{BASE_URL}/api/roles/nonexistent-id-12345", json=update_data, headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Update nonexistent role returns 404")
    
    # ============ DELETE /api/roles/{role_id} Tests ============
    
    def test_delete_custom_role(self, auth_headers):
        """DELETE /api/roles/{role_id} should delete a custom role"""
        # Create a role to delete
        new_role = {
            "name": "TEST_RoleToDelete",
            "description": "Will be deleted",
            "permissions": {
                "modules": {"jobs": {"view": True, "create": False, "edit": False, "delete": False}},
                "actions": {}
            }
        }
        
        create_response = requests.post(f"{BASE_URL}/api/roles", json=new_role, headers=auth_headers)
        assert create_response.status_code == 200
        role_id = create_response.json()["id"]
        
        # Delete the role
        delete_response = requests.delete(f"{BASE_URL}/api/roles/{role_id}", headers=auth_headers)
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/roles/{role_id}", headers=auth_headers)
        assert get_response.status_code == 404, "Deleted role should not be found"
        
        print("✅ Custom role deleted successfully")
    
    def test_cannot_delete_system_roles(self, auth_headers):
        """DELETE /api/roles/{role_id} should not delete system roles"""
        # Get system roles
        response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = response.json()
        
        system_roles = ["Admin", "Manager", "Technician", "Receptionist"]
        
        for role_name in system_roles:
            system_role = next((r for r in roles if r["name"] == role_name), None)
            if system_role:
                delete_response = requests.delete(f"{BASE_URL}/api/roles/{system_role['id']}", headers=auth_headers)
                assert delete_response.status_code == 400, f"Should not delete {role_name} role"
        
        print("✅ System roles cannot be deleted")
    
    def test_delete_nonexistent_role(self, auth_headers):
        """DELETE /api/roles/{role_id} with invalid ID should return 404"""
        response = requests.delete(f"{BASE_URL}/api/roles/nonexistent-id-12345", headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Delete nonexistent role returns 404")
    
    # ============ GET /api/roles/{role_id} Tests ============
    
    def test_get_single_role(self, auth_headers, test_role_id):
        """GET /api/roles/{role_id} should return a specific role"""
        response = requests.get(f"{BASE_URL}/api/roles/{test_role_id}", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        role = response.json()
        assert role["id"] == test_role_id
        assert "name" in role
        assert "permissions" in role
        
        print("✅ Single role retrieved successfully")
    
    def test_get_nonexistent_role(self, auth_headers):
        """GET /api/roles/{role_id} with invalid ID should return 404"""
        response = requests.get(f"{BASE_URL}/api/roles/nonexistent-id-12345", headers=auth_headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Get nonexistent role returns 404")


class TestUserRoleAssignment:
    """Test role assignment to users"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "subdomain": TEST_SUBDOMAIN
        })
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with authorization token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_user_with_role_id(self, auth_headers):
        """POST /api/users should accept role_id parameter"""
        # Get roles first
        roles_response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = roles_response.json()
        technician_role = next((r for r in roles if r["name"] == "Technician"), None)
        
        assert technician_role is not None, "Technician role should exist"
        
        # Create user with role_id
        new_user = {
            "name": "TEST_RoleAssignUser",
            "email": "test_roleassign@example.com",
            "password": "Test@123",
            "phone": "9876543210",
            "role": "technician",
            "role_id": technician_role["id"],
            "branch_ids": []
        }
        
        response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_user = response.json()
        assert created_user["role_id"] == technician_role["id"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{created_user['id']}", headers=auth_headers)
        
        print("✅ User created with role_id successfully")
    
    def test_create_user_with_multiple_branches(self, auth_headers):
        """POST /api/users should accept branch_ids array"""
        # Get branches first
        branches_response = requests.get(f"{BASE_URL}/api/branches", headers=auth_headers)
        branches = branches_response.json()
        
        if len(branches) == 0:
            pytest.skip("No branches available for testing")
        
        branch_ids = [b["id"] for b in branches[:2]] if len(branches) > 1 else [branches[0]["id"]]
        
        # Create user with multiple branches
        new_user = {
            "name": "TEST_MultiBranchUser",
            "email": "test_multibranch@example.com",
            "password": "Test@123",
            "phone": "9876543211",
            "role": "technician",
            "branch_ids": branch_ids
        }
        
        response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_user = response.json()
        assert created_user["branch_ids"] == branch_ids
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{created_user['id']}", headers=auth_headers)
        
        print("✅ User created with multiple branch assignments")
    
    def test_update_user_role_and_branches(self, auth_headers):
        """PUT /api/users/{user_id} should update role_id and branch_ids"""
        # Get roles and branches
        roles_response = requests.get(f"{BASE_URL}/api/roles", headers=auth_headers)
        roles = roles_response.json()
        manager_role = next((r for r in roles if r["name"] == "Manager"), None)
        
        branches_response = requests.get(f"{BASE_URL}/api/branches", headers=auth_headers)
        branches = branches_response.json()
        
        # Create a test user first
        new_user = {
            "name": "TEST_UpdateRoleUser",
            "email": "test_updaterole@example.com",
            "password": "Test@123",
            "role": "technician",
            "branch_ids": []
        }
        
        create_response = requests.post(f"{BASE_URL}/api/users", json=new_user, headers=auth_headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Update user with new role and branches
        update_data = {
            "role": "manager",
            "role_id": manager_role["id"] if manager_role else None,
            "branch_ids": [branches[0]["id"]] if branches else []
        }
        
        update_response = requests.put(f"{BASE_URL}/api/users/{user_id}", json=update_data, headers=auth_headers)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_user = update_response.json()
        assert updated_user["role"] == "manager"
        if manager_role:
            assert updated_user["role_id"] == manager_role["id"]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/users/{user_id}", headers=auth_headers)
        
        print("✅ User role and branches updated successfully")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
