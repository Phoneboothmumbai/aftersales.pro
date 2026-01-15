import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
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
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Shield,
  Building2,
  Users,
  ClipboardList,
  Search,
  LogOut,
  Eye,
  Power,
  Calendar,
  Mail,
  CheckCircle,
  Loader2,
  CreditCard,
  Clock,
  IndianRupee,
  Plus,
  FileText,
  History,
  Crown,
  Zap,
  Star,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = {
  free: <Star className="w-4 h-4" />,
  basic: <Zap className="w-4 h-4" />,
  pro: <Crown className="w-4 h-4" />,
  enterprise: <Shield className="w-4 h-4" />,
};

const PLAN_COLORS = {
  free: "bg-slate-600/20 text-slate-400 border-slate-600/30",
  basic: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  pro: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  enterprise: "bg-amber-600/20 text-amber-400 border-amber-600/30",
};

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
  const [plans, setPlans] = useState({});
  
  // Modal states
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [showExtendValidity, setShowExtendValidity] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  
  // Form states
  const [assignPlanForm, setAssignPlanForm] = useState({ plan: "", duration_months: 1, notes: "" });
  const [extendForm, setExtendForm] = useState({ days: 30, reason: "" });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_mode: "cash",
    reference_number: "",
    plan: "",
    duration_months: 1,
    notes: ""
  });

  const token = localStorage.getItem("superAdminToken");

  useEffect(() => {
    if (!token) {
      navigate("/super-admin");
      return;
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    fetchData();
    fetchPlans();
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

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/plans`);
      setPlans(response.data);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
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

  const handleAssignPlan = async () => {
    if (!assignPlanForm.plan) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/tenants/${selectedTenant.id}/assign-plan`, assignPlanForm);
      fetchData();
      fetchTenantDetails(selectedTenant.id);
      setShowAssignPlan(false);
      setAssignPlanForm({ plan: "", duration_months: 1, notes: "" });
    } catch (error) {
      console.error("Failed to assign plan:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendValidity = async () => {
    if (!extendForm.days) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/tenants/${selectedTenant.id}/extend-validity`, extendForm);
      fetchData();
      fetchTenantDetails(selectedTenant.id);
      setShowExtendValidity(false);
      setExtendForm({ days: 30, reason: "" });
    } catch (error) {
      console.error("Failed to extend validity:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/tenants/${selectedTenant.id}/record-payment`, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });
      fetchData();
      fetchTenantDetails(selectedTenant.id);
      setShowRecordPayment(false);
      setPaymentForm({
        amount: "",
        payment_mode: "cash",
        reference_number: "",
        plan: "",
        duration_months: 1,
        notes: ""
      });
    } catch (error) {
      console.error("Failed to record payment:", error);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
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
                    <th className="text-left text-sm font-medium text-slate-400 px-4 py-3">Validity</th>
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
                        <Badge className={PLAN_COLORS[tenant.subscription_plan || "free"]}>
                          <span className="mr-1">{PLAN_ICONS[tenant.subscription_plan || "free"]}</span>
                          {(tenant.subscription_plan || "free").charAt(0).toUpperCase() + (tenant.subscription_plan || "free").slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-300">{tenant.total_jobs}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-400">
                          {tenant.subscription_status === "paid" 
                            ? formatDate(tenant.subscription_ends_at) 
                            : formatDate(tenant.trial_ends_at)}
                        </p>
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
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {selectedTenant?.company_name}
              <Badge className={PLAN_COLORS[tenantDetails?.tenant?.subscription_plan || "free"]}>
                {PLAN_ICONS[tenantDetails?.tenant?.subscription_plan || "free"]}
                <span className="ml-1">
                  {(tenantDetails?.tenant?.subscription_plan || "free").charAt(0).toUpperCase() + 
                   (tenantDetails?.tenant?.subscription_plan || "free").slice(1)}
                </span>
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tenantDetails ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
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
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Created</p>
                    <p className="font-medium">{formatDate(tenantDetails.tenant.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">
                      {tenantDetails.tenant.subscription_status === "paid" ? "Subscription Ends" : "Trial Ends"}
                    </p>
                    <p className="font-medium">
                      {tenantDetails.tenant.subscription_status === "paid"
                        ? formatDate(tenantDetails.tenant.subscription_ends_at)
                        : formatDate(tenantDetails.tenant.trial_ends_at)}
                    </p>
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

                {/* Quick Actions */}
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
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-6 mt-4">
                {/* Current Plan */}
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-400">Current Plan</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${PLAN_COLORS[tenantDetails.tenant.subscription_plan || "free"]} text-lg px-3 py-1`}>
                          {PLAN_ICONS[tenantDetails.tenant.subscription_plan || "free"]}
                          <span className="ml-2">
                            {plans[tenantDetails.tenant.subscription_plan || "free"]?.name || "Free"}
                          </span>
                        </Badge>
                        {tenantDetails.tenant.subscription_status === "trial" && (
                          <Badge className="bg-yellow-600/20 text-yellow-400">On Trial</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">
                        {tenantDetails.tenant.subscription_status === "paid" ? "Expires" : "Trial Ends"}
                      </p>
                      <p className="text-lg font-medium">
                        {tenantDetails.tenant.subscription_status === "paid"
                          ? formatDate(tenantDetails.tenant.subscription_ends_at)
                          : formatDate(tenantDetails.tenant.trial_ends_at)}
                      </p>
                    </div>
                  </div>
                  
                  {plans[tenantDetails.tenant.subscription_plan || "free"] && (
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Plan Features:</p>
                      <ul className="grid grid-cols-2 gap-1">
                        {plans[tenantDetails.tenant.subscription_plan || "free"].features.map((feature, idx) => (
                          <li key={idx} className="text-sm flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Available Plans */}
                <div>
                  <p className="text-sm font-medium text-slate-400 mb-3">Available Plans</p>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(plans).map(([key, plan]) => (
                      <div
                        key={key}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          key === (tenantDetails.tenant.subscription_plan || "free")
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-slate-600 hover:border-slate-500"
                        }`}
                        onClick={() => {
                          setAssignPlanForm({ ...assignPlanForm, plan: key });
                          setShowAssignPlan(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={PLAN_COLORS[key]}>
                            {PLAN_ICONS[key]}
                            <span className="ml-1">{plan.name}</span>
                          </Badge>
                          <span className="text-lg font-bold">
                            {plan.price === 0 ? "Free" : formatCurrency(plan.price)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {plan.price > 0 ? `/month` : "Forever"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  <Button
                    onClick={() => setShowAssignPlan(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Assign Plan
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowExtendValidity(true)}
                    className="border-slate-600"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Extend Validity
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRecordPayment(true)}
                    className="border-slate-600"
                  >
                    <IndianRupee className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-400">Payment History</p>
                  <Button
                    size="sm"
                    onClick={() => setShowRecordPayment(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Record Payment
                  </Button>
                </div>
                
                {tenantDetails.payments && tenantDetails.payments.length > 0 ? (
                  <div className="space-y-2">
                    {tenantDetails.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                            <p className="text-sm text-slate-400">
                              {payment.payment_mode.charAt(0).toUpperCase() + payment.payment_mode.slice(1)}
                              {payment.reference_number && ` • ${payment.reference_number}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {payment.plan && (
                            <Badge className={PLAN_COLORS[payment.plan]}>
                              {payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)}
                            </Badge>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDate(payment.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No payments recorded yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <p className="text-sm font-medium text-slate-400">Admin Action Logs</p>
                
                {tenantDetails.action_logs && tenantDetails.action_logs.length > 0 ? (
                  <div className="space-y-2">
                    {tenantDetails.action_logs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-slate-700/30 rounded-lg p-3 flex items-start gap-3"
                      >
                        <div className="w-8 h-8 bg-slate-600/50 rounded-lg flex items-center justify-center flex-shrink-0">
                          {log.action === "plan_assigned" && <Crown className="w-4 h-4 text-purple-400" />}
                          {log.action === "validity_extended" && <Clock className="w-4 h-4 text-blue-400" />}
                          {log.action === "payment_recorded" && <IndianRupee className="w-4 h-4 text-green-400" />}
                          {!["plan_assigned", "validity_extended", "payment_recorded"].includes(log.action) && (
                            <FileText className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {log.action === "plan_assigned" && `Plan changed to ${log.plan}`}
                            {log.action === "validity_extended" && `Validity extended by ${log.days} days`}
                            {log.action === "payment_recorded" && `Payment of ${formatCurrency(log.amount)} recorded`}
                          </p>
                          {log.notes && <p className="text-sm text-slate-400">{log.notes}</p>}
                          {log.reason && <p className="text-sm text-slate-400">Reason: {log.reason}</p>}
                          <p className="text-xs text-slate-500 mt-1">
                            By {log.performed_by_name} • {formatDate(log.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No action logs yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Assign Plan Modal */}
      <Dialog open={showAssignPlan} onOpenChange={setShowAssignPlan}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Assign Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Plan</Label>
              <Select
                value={assignPlanForm.plan}
                onValueChange={(value) => setAssignPlanForm({ ...assignPlanForm, plan: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(plans).map(([key, plan]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {PLAN_ICONS[key]}
                        <span>{plan.name}</span>
                        <span className="text-slate-400">
                          {plan.price === 0 ? "(Free)" : `(${formatCurrency(plan.price)}/mo)`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignPlanForm.plan && assignPlanForm.plan !== "free" && (
              <div className="space-y-2">
                <Label>Duration (Months)</Label>
                <Select
                  value={assignPlanForm.duration_months.toString()}
                  onValueChange={(value) => setAssignPlanForm({ ...assignPlanForm, duration_months: parseInt(value) })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={assignPlanForm.notes}
                onChange={(e) => setAssignPlanForm({ ...assignPlanForm, notes: e.target.value })}
                placeholder="Add any notes about this plan change..."
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAssignPlan(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPlan}
              disabled={!assignPlanForm.plan || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Validity Modal */}
      <Dialog open={showExtendValidity} onOpenChange={setShowExtendValidity}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Extend Validity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Extend by (Days)</Label>
              <Select
                value={extendForm.days.toString()}
                onValueChange={(value) => setExtendForm({ ...extendForm, days: parseInt(value) })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="180">180 Days</SelectItem>
                  <SelectItem value="365">365 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                value={extendForm.reason}
                onChange={(e) => setExtendForm({ ...extendForm, reason: e.target.value })}
                placeholder="Why is validity being extended?"
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowExtendValidity(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExtendValidity}
              disabled={actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Extend Validity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Record Offline Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select
                  value={paymentForm.payment_mode}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_mode: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference Number (Optional)</Label>
              <Input
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                placeholder="Transaction ID, Cheque No., etc."
                className="bg-slate-700 border-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Activate Plan (Optional)</Label>
                <Select
                  value={paymentForm.plan || "none"}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, plan: value === "none" ? "" : value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="No plan change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No plan change</SelectItem>
                    {Object.entries(plans).filter(([key]) => key !== "free").map(([key, plan]) => (
                      <SelectItem key={key} value={key}>
                        {plan.name} ({formatCurrency(plan.price)}/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {paymentForm.plan && paymentForm.plan !== "none" && (
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={paymentForm.duration_months.toString()}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, duration_months: parseInt(value) })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Any additional notes..."
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowRecordPayment(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={!paymentForm.amount || actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Record Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
