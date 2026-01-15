import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Shield,
  Building2,
  Users,
  ClipboardList,
  TrendingUp,
  Search,
  LogOut,
  Eye,
  Power,
  Calendar,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantDetails, setTenantDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem("superAdminToken");

  useEffect(() => {
    if (!token) {
      navigate("/super-admin");
      return;
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    fetchData();
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        axios.get(`${API}/super-admin/stats`),
        axios.get(`${API}/super-admin/tenants`),
      ]);
      setStats(statsRes.data);
      setTenants(tenantsRes.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantDetails = async (tenantId) => {
    setDetailsLoading(true);
    try {
      const response = await axios.get(`${API}/super-admin/tenants/${tenantId}`);
      setTenantDetails(response.data);
    } catch (error) {
      console.error("Failed to fetch tenant details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewTenant = (tenant) => {
    setSelectedTenant(tenant);
    fetchTenantDetails(tenant.id);
  };

  const handleToggleActive = async (tenantId, currentStatus) => {
    setActionLoading(true);
    try {
      await axios.put(`${API}/super-admin/tenants/${tenantId}`, {
        is_active: !currentStatus,
      });
      fetchData();
      if (tenantDetails && tenantDetails.tenant.id === tenantId) {
        fetchTenantDetails(tenantId);
      }
    } catch (error) {
      console.error("Failed to update tenant:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSubscription = async (tenantId, status) => {
    setActionLoading(true);
    try {
      await axios.put(`${API}/super-admin/tenants/${tenantId}`, {
        subscription_status: status,
      });
      fetchData();
      if (tenantDetails && tenantDetails.tenant.id === tenantId) {
        fetchTenantDetails(tenantId);
      }
    } catch (error) {
      console.error("Failed to update subscription:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("superAdminToken");
    localStorage.removeItem("superAdmin");
    delete axios.defaults.headers.common["Authorization"];
    navigate("/super-admin");
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.company_name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(search.toLowerCase()) ||
      tenant.admin_email?.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "active") return matchesSearch && tenant.is_active;
    if (statusFilter === "inactive") return matchesSearch && !tenant.is_active;
    if (statusFilter === "trial")
      return matchesSearch && tenant.subscription_status === "trial";
    if (statusFilter === "paid")
      return matchesSearch && tenant.subscription_status === "paid";
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="spinner w-8 h-8 border-red-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">Super Admin</span>
                <p className="text-xs text-slate-400">aftersales.pro</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={handleLogout}
              data-testid="super-admin-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.total_tenants || 0}</p>
                  <p className="text-sm text-slate-400">Total Shops</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.active_tenants || 0}</p>
                  <p className="text-sm text-slate-400">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
                  <p className="text-sm text-slate-400">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600/20 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats?.total_jobs || 0}</p>
                  <p className="text-sm text-slate-400">Total Jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-yellow-400">{stats?.trial_tenants || 0}</p>
              <p className="text-sm text-slate-400">On Trial</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-green-400">{stats?.paid_tenants || 0}</p>
              <p className="text-sm text-slate-400">Paid</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-red-400">{stats?.inactive_tenants || 0}</p>
              <p className="text-sm text-slate-400">Inactive</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-blue-400">{stats?.recent_signups || 0}</p>
              <p className="text-sm text-slate-400">This Week</p>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-white">All Shops</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search shops..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 w-full sm:w-64"
                    data-testid="search-tenants-input"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Shop</th>
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Admin</th>
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Status</th>
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Plan</th>
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Jobs</th>
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Trial Ends</th>
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{tenant.company_name}</p>
                          <p className="text-sm text-slate-400">{tenant.subdomain}.aftersales.pro</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-300">{tenant.admin_email || "N/A"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {tenant.is_active ? (
                          <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            tenant.subscription_status === "paid"
                              ? "bg-blue-600/20 text-blue-400 border-blue-600/30"
                              : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                          }
                        >
                          {tenant.subscription_status === "paid" ? "Paid" : "Trial"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300">{tenant.total_jobs}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-400">{formatDate(tenant.trial_ends_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={() => handleViewTenant(tenant)}
                            data-testid={`view-tenant-${tenant.subdomain}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={
                              tenant.is_active
                                ? "text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                : "text-green-400 hover:text-green-300 hover:bg-green-900/30"
                            }
                            onClick={() => handleToggleActive(tenant.id, tenant.is_active)}
                            data-testid={`toggle-tenant-${tenant.subdomain}`}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTenants.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400">No shops found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Tenant Details Modal */}
      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedTenant?.company_name}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tenantDetails ? (
            <div className="space-y-6">
              {/* Shop Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Subdomain</p>
                  <p className="font-medium">{tenantDetails.tenant.subdomain}.aftersales.pro</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <div className="flex gap-2 mt-1">
                    {tenantDetails.tenant.is_active ? (
                      <Badge className="bg-green-600/20 text-green-400">Active</Badge>
                    ) : (
                      <Badge className="bg-red-600/20 text-red-400">Inactive</Badge>
                    )}
                    <Badge
                      className={
                        tenantDetails.tenant.subscription_status === "paid"
                          ? "bg-blue-600/20 text-blue-400"
                          : "bg-yellow-600/20 text-yellow-400"
                      }
                    >
                      {tenantDetails.tenant.subscription_status === "paid" ? "Paid" : "Trial"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Created</p>
                  <p className="font-medium">{formatDate(tenantDetails.tenant.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Trial Ends</p>
                  <p className="font-medium">{formatDate(tenantDetails.tenant.trial_ends_at)}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{tenantDetails.stats.total_jobs}</p>
                  <p className="text-sm text-slate-400">Total Jobs</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{tenantDetails.users.length}</p>
                  <p className="text-sm text-slate-400">Users</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{tenantDetails.branches.length}</p>
                  <p className="text-sm text-slate-400">Branches</p>
                </div>
              </div>

              {/* Users */}
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">Team Members</p>
                <div className="space-y-2">
                  {tenantDetails.users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <Button
                  variant={tenantDetails.tenant.is_active ? "destructive" : "default"}
                  onClick={() =>
                    handleToggleActive(tenantDetails.tenant.id, tenantDetails.tenant.is_active)
                  }
                  disabled={actionLoading}
                  className={!tenantDetails.tenant.is_active ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Power className="w-4 h-4 mr-2" />
                  )}
                  {tenantDetails.tenant.is_active ? "Deactivate" : "Activate"}
                </Button>
                {tenantDetails.tenant.subscription_status !== "paid" && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateSubscription(tenantDetails.tenant.id, "paid")}
                    disabled={actionLoading}
                    className="border-blue-600 text-blue-400 hover:bg-blue-600/20"
                  >
                    Mark as Paid
                  </Button>
                )}
                {tenantDetails.tenant.subscription_status === "paid" && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateSubscription(tenantDetails.tenant.id, "trial")}
                    disabled={actionLoading}
                    className="border-yellow-600 text-yellow-400 hover:bg-yellow-600/20"
                  >
                    Revert to Trial
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
