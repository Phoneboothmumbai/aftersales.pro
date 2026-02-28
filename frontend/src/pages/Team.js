import React, { useState, useEffect } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { 
  Plus, Trash2, Loader2, User, Shield, Phone, Pencil, 
  Settings, Lock, Eye, FileEdit, X, Check, Users, Building2,
  ShieldCheck, ClipboardList, Package, BarChart3, CreditCard
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Module icons mapping
const MODULE_ICONS = {
  jobs: ClipboardList,
  customers: Users,
  inventory: Package,
  team: Users,
  reports: BarChart3,
  settings: Settings,
  billing: CreditCard,
  branches: Building2,
};

// Action descriptions
const ACTION_LABELS = {
  approve_jobs: "Approve Jobs",
  record_payment: "Record Payments",
  view_profit_reports: "View Profit Reports",
  send_whatsapp: "Send WhatsApp Messages",
  download_pdf: "Download PDF Job Sheets",
  assign_technician: "Assign Technicians",
  manage_inventory: "Manage Inventory",
  view_analytics: "View Analytics Dashboard",
  manage_roles: "Manage Roles & Permissions",
};

export default function Team() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("members");
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Role management state
  const [roleModal, setRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteRoleId, setDeleteRoleId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "technician",
    role_id: "",
    branch_ids: [],
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    role_id: "",
    branch_ids: [],
  });

  const [roleFormData, setRoleFormData] = useState({
    name: "",
    description: "",
    permissions: {
      modules: {
        jobs: { view: true, create: false, edit: false, delete: false },
        customers: { view: true, create: false, edit: false, delete: false },
        inventory: { view: false, create: false, edit: false, delete: false },
        team: { view: false, create: false, edit: false, delete: false },
        reports: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, create: false, edit: false, delete: false },
        billing: { view: false, create: false, edit: false, delete: false },
        branches: { view: false, create: false, edit: false, delete: false },
      },
      actions: {
        approve_jobs: false,
        record_payment: false,
        view_profit_reports: false,
        send_whatsapp: true,
        download_pdf: true,
        assign_technician: false,
        manage_inventory: false,
        view_analytics: false,
        manage_roles: false,
      },
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, branchesRes, rolesRes] = await Promise.all([
        axios.get(`${API}/users`),
        axios.get(`${API}/branches`),
        axios.get(`${API}/roles`),
      ]);
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        branch_ids: formData.branch_ids,
        branch_id: formData.branch_ids.length === 1 ? formData.branch_ids[0] : null,
      };
      const response = await axios.post(`${API}/users`, payload);
      setUsers([...users, response.data]);
      setCreateModal(false);
      setFormData({ name: "", email: "", password: "", phone: "", role: "technician", role_id: "", branch_ids: [] });
      toast.success("Team member added successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
      setDeleteId(null);
      toast.success("Team member removed");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete user");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (member) => {
    setEditingUser(member);
    setEditFormData({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      role: member.role || "technician",
      role_id: member.role_id || "",
      branch_ids: member.branch_ids || (member.branch_id ? [member.branch_id] : []),
    });
    setEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editFormData.name || !editFormData.email) {
      toast.error("Name and email are required");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...editFormData,
        branch_ids: editFormData.branch_ids,
        branch_id: editFormData.branch_ids.length === 1 ? editFormData.branch_ids[0] : null,
      };
      await axios.put(`${API}/users/${editingUser.id}`, payload);
      
      setUsers(users.map(u => 
        u.id === editingUser.id ? { ...u, ...payload } : u
      ));
      
      setEditModal(false);
      setEditingUser(null);
      toast.success("Team member updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  };

  // Role management functions
  const openRoleModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        name: role.name,
        description: role.description || "",
        permissions: role.permissions || {
          modules: {},
          actions: {},
        },
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        name: "",
        description: "",
        permissions: {
          modules: {
            jobs: { view: true, create: false, edit: false, delete: false },
            customers: { view: true, create: false, edit: false, delete: false },
            inventory: { view: false, create: false, edit: false, delete: false },
            team: { view: false, create: false, edit: false, delete: false },
            reports: { view: false, create: false, edit: false, delete: false },
            settings: { view: false, create: false, edit: false, delete: false },
            billing: { view: false, create: false, edit: false, delete: false },
            branches: { view: false, create: false, edit: false, delete: false },
          },
          actions: {
            approve_jobs: false,
            record_payment: false,
            view_profit_reports: false,
            send_whatsapp: true,
            download_pdf: true,
            assign_technician: false,
            manage_inventory: false,
            view_analytics: false,
            manage_roles: false,
          },
        },
      });
    }
    setRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleFormData.name) {
      toast.error("Role name is required");
      return;
    }

    setActionLoading(true);
    try {
      if (editingRole) {
        await axios.put(`${API}/roles/${editingRole.id}`, roleFormData);
        setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...roleFormData } : r));
        toast.success("Role updated successfully");
      } else {
        const response = await axios.post(`${API}/roles`, roleFormData);
        setRoles([...roles, response.data]);
        toast.success("Role created successfully");
      }
      setRoleModal(false);
      setEditingRole(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/roles/${roleId}`);
      setRoles(roles.filter(r => r.id !== roleId));
      setDeleteRoleId(null);
      toast.success("Role deleted");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete role");
    } finally {
      setActionLoading(false);
    }
  };

  const updateModulePermission = (module, permission, value) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        modules: {
          ...prev.permissions.modules,
          [module]: {
            ...prev.permissions.modules[module],
            [permission]: value,
          },
        },
      },
    }));
  };

  const updateActionPermission = (action, value) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        actions: {
          ...prev.permissions.actions,
          [action]: value,
        },
      },
    }));
  };

  const toggleAllModulePermissions = (module, enabled) => {
    setRoleFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        modules: {
          ...prev.permissions.modules,
          [module]: {
            view: enabled,
            create: enabled,
            edit: enabled,
            delete: enabled,
          },
        },
      },
    }));
  };

  const getBranchNames = (branchIds) => {
    if (!branchIds || branchIds.length === 0) return "All Branches";
    const names = branchIds.map(id => {
      const branch = branches.find(b => b.id === id);
      return branch?.name || id;
    });
    return names.join(", ");
  };

  const getRoleName = (roleId, legacyRole) => {
    if (roleId) {
      const role = roles.find(r => r.id === roleId);
      return role?.name || legacyRole || "Unknown";
    }
    return legacyRole?.charAt(0).toUpperCase() + legacyRole?.slice(1) || "Unknown";
  };

  const toggleBranch = (branchId, formSetter, currentIds) => {
    const newIds = currentIds.includes(branchId)
      ? currentIds.filter(id => id !== branchId)
      : [...currentIds, branchId];
    formSetter(prev => ({ ...prev, branch_ids: newIds }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-8 h-8 border-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="team-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage team members and role permissions</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="members" data-testid="members-tab">
              <Users className="w-4 h-4 mr-2" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="roles-tab">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Roles & Permissions
            </TabsTrigger>
          </TabsList>

          {/* Team Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setCreateModal(true)} data-testid="add-member-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((member) => (
                <Card key={member.id} className="card-shadow" data-testid={`team-member-${member.email}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          {member.role === "admin" ? (
                            <Shield className="w-6 h-6 text-primary" />
                          ) : (
                            <User className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          {member.phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {member.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(member)}
                          data-testid={`edit-member-${member.email}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {member.id !== currentUser.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(member.id)}
                            data-testid={`delete-member-${member.email}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {getRoleName(member.role_id, member.role)}
                        </Badge>
                        {!member.phone && (
                          <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
                            No WhatsApp
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {getBranchNames(member.branch_ids || (member.branch_id ? [member.branch_id] : []))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => openRoleModal()} data-testid="add-role-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Role
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <Card key={role.id} className={`card-shadow ${role.is_system ? 'border-primary/30' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-primary" />
                          {role.name}
                          {role.is_system && (
                            <Badge variant="outline" className="text-xs">System</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{role.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openRoleModal(role)}
                          data-testid={`edit-role-${role.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!role.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteRoleId(role.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Module Access:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(role.permissions?.modules || {}).map(([module, perms]) => (
                          perms.view && (
                            <Badge key={module} variant="secondary" className="text-xs capitalize">
                              {module}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Member Modal */}
        <Dialog open={createModal} onOpenChange={setCreateModal}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    data-testid="member-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone (WhatsApp)</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    data-testid="member-phone-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  data-testid="member-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  data-testid="member-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role_id || formData.role}
                  onValueChange={(v) => {
                    const selectedRole = roles.find(r => r.id === v);
                    if (selectedRole) {
                      setFormData({ ...formData, role_id: v, role: selectedRole.name.toLowerCase() });
                    } else {
                      setFormData({ ...formData, role: v, role_id: "" });
                    }
                  }}
                >
                  <SelectTrigger data-testid="member-role-select">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branches.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Branches</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which branches this user can access. Leave empty for all branches.
                  </p>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {branches.map((branch) => (
                      <div key={branch.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`branch-${branch.id}`}
                          checked={formData.branch_ids.includes(branch.id)}
                          onCheckedChange={() => toggleBranch(branch.id, setFormData, formData.branch_ids)}
                        />
                        <label
                          htmlFor={`branch-${branch.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {branch.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={actionLoading} data-testid="create-member-btn">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Member Modal */}
        <Dialog open={editModal} onOpenChange={setEditModal}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone (WhatsApp)</Label>
                  <Input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editFormData.role_id || editFormData.role}
                  onValueChange={(v) => {
                    const selectedRole = roles.find(r => r.id === v);
                    if (selectedRole) {
                      setEditFormData({ ...editFormData, role_id: v, role: selectedRole.name.toLowerCase() });
                    } else {
                      setEditFormData({ ...editFormData, role: v, role_id: "" });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branches.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Branches</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select which branches this user can access. Leave empty for all branches.
                  </p>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                    {branches.map((branch) => (
                      <div key={branch.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-branch-${branch.id}`}
                          checked={editFormData.branch_ids.includes(branch.id)}
                          onCheckedChange={() => toggleBranch(branch.id, setEditFormData, editFormData.branch_ids)}
                        />
                        <label
                          htmlFor={`edit-branch-${branch.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {branch.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Modal */}
        <Dialog open={roleModal} onOpenChange={setRoleModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Edit Role" : "Create Custom Role"}</DialogTitle>
              <DialogDescription>
                Define permissions for this role. Users assigned this role will have the selected access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role Name *</Label>
                  <Input
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    placeholder="e.g., Branch Manager"
                    disabled={editingRole?.is_system && editingRole?.name === "Admin"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
              </div>

              {/* Module Permissions */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Module Permissions</Label>
                <div className="border rounded-lg divide-y">
                  {Object.entries(roleFormData.permissions.modules).map(([module, perms]) => {
                    const Icon = MODULE_ICONS[module] || Settings;
                    return (
                      <div key={module} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium capitalize">{module}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Full Access</span>
                            <Switch
                              checked={perms.view && perms.create && perms.edit && perms.delete}
                              onCheckedChange={(checked) => toggleAllModulePermissions(module, checked)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 pl-6">
                          {["view", "create", "edit", "delete"].map((perm) => (
                            <div key={perm} className="flex items-center space-x-1">
                              <Checkbox
                                id={`${module}-${perm}`}
                                checked={perms[perm]}
                                onCheckedChange={(checked) => updateModulePermission(module, perm, checked)}
                              />
                              <label htmlFor={`${module}-${perm}`} className="text-xs capitalize cursor-pointer">
                                {perm}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Permissions */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Action Permissions</Label>
                <div className="border rounded-lg p-3 grid grid-cols-2 gap-3">
                  {Object.entries(roleFormData.permissions.actions).map(([action, enabled]) => (
                    <div key={action} className="flex items-center space-x-2">
                      <Checkbox
                        id={`action-${action}`}
                        checked={enabled}
                        onCheckedChange={(checked) => updateActionPermission(action, checked)}
                      />
                      <label htmlFor={`action-${action}`} className="text-sm cursor-pointer">
                        {ACTION_LABELS[action] || action}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRole} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingRole ? "Update Role" : "Create Role")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Member Confirmation */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Team Member</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to remove this team member? This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteId)}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Role Confirmation */}
        <Dialog open={!!deleteRoleId} onOpenChange={() => setDeleteRoleId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this role? Users with this role will need to be reassigned.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteRoleId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteRole(deleteRoleId)}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
