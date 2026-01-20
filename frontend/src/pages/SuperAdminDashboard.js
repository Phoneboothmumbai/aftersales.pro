import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
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
  Settings,
  Edit,
  Trash2,
  Package,
  Database,
  Image,
  HardDrive,
  X,
  Check,
  Scale,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  TrendingUp,
  BarChart3,
  PieChart,
  Store,
  Ban,
  PlayCircle,
  MessageSquare,
  Send,
  Megaphone,
  Phone,
  UserCheck,
  Ticket,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Legal Pages Configuration
const LEGAL_PAGES = [
  { key: "privacy_policy", title: "Privacy Policy", icon: Shield, enabledKey: "privacy_enabled" },
  { key: "terms_of_service", title: "Terms of Service", icon: Scale, enabledKey: "terms_enabled" },
  { key: "refund_policy", title: "Refund Policy", icon: FileText, enabledKey: "refund_enabled" },
  { key: "disclaimer", title: "Disclaimer", icon: AlertTriangle, enabledKey: "disclaimer_enabled" },
];

const PLAN_ICONS = {
  free: <Star className="w-4 h-4" />,
  starter: <Zap className="w-4 h-4" />,
  basic: <Zap className="w-4 h-4" />,
  pro: <Crown className="w-4 h-4" />,
  enterprise: <Shield className="w-4 h-4" />,
};

const PLAN_COLORS = {
  free: "bg-slate-600/20 text-slate-400 border-slate-600/30",
  starter: "bg-green-600/20 text-green-400 border-green-600/30",
  basic: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  pro: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  enterprise: "bg-amber-600/20 text-amber-400 border-amber-600/30",
};

const FEATURE_LABELS = {
  job_management: "Job Management",
  basic_reports: "Basic Reports",
  pdf_job_sheet: "PDF Job Sheet",
  qr_tracking: "QR Tracking",
  whatsapp_messages: "WhatsApp Messages",
  photo_upload: "Photo Upload",
  inventory_management: "Inventory Management",
  advanced_analytics: "Advanced Analytics",
  technician_metrics: "Technician Metrics",
  customer_management: "Customer Management",
  email_notifications: "Email Notifications",
  sms_notifications: "SMS Notifications",
  custom_branding: "Custom Branding",
  api_access: "API Access",
  priority_support: "Priority Support",
  dedicated_account_manager: "Dedicated Account Manager",
  data_export: "Data Export",
  multi_branch: "Multi-Branch",
};

const DEFAULT_FEATURES = {
  job_management: true,
  basic_reports: true,
  pdf_job_sheet: true,
  qr_tracking: true,
  whatsapp_messages: true,
  photo_upload: true,
  inventory_management: false,
  advanced_analytics: false,
  technician_metrics: false,
  customer_management: false,
  email_notifications: false,
  sms_notifications: false,
  custom_branding: false,
  api_access: false,
  priority_support: false,
  dedicated_account_manager: false,
  data_export: false,
  multi_branch: false,
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
  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState("tenants");
  
  // Plan management modals
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  // Tenant action modals
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [showExtendValidity, setShowExtendValidity] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  
  // Create Shop modal
  const [showCreateShop, setShowCreateShop] = useState(false);
  const [createShopForm, setCreateShopForm] = useState({
    company_name: "",
    subdomain: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    subscription_plan: "free",
    trial_days: 14
  });
  
  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Legal pages state
  const [legalPages, setLegalPages] = useState({});
  const [editingLegalPage, setEditingLegalPage] = useState(null);
  const [legalEditContent, setLegalEditContent] = useState("");
  const [legalEditEnabled, setLegalEditEnabled] = useState(true);
  const [legalSaving, setLegalSaving] = useState(false);
  
  // Suspend/Unsuspend state
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  
  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    type: "info",
    target: "all",
    expires_at: ""
  });
  
  // Support Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReply, setTicketReply] = useState("");
  
  // Expiring subscriptions state
  const [expiringSubscriptions, setExpiringSubscriptions] = useState([]);
  const [expiringDays, setExpiringDays] = useState(7);
  
  // Form states
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    description: "",
    price: 0,
    billing_cycle: "monthly",
    duration_days: 30,
    max_users: 1,
    max_branches: 1,
    max_jobs_per_month: 100,
    max_inventory_items: 100,
    max_photos_per_job: 5,
    max_storage_mb: 500,
    features: { ...DEFAULT_FEATURES },
    sort_order: 99,
    is_active: true
  });
  
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
    fetchLegalPages();
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
      const response = await axios.get(`${API}/super-admin/plans?include_inactive=true`);
      setPlans(response.data);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await axios.get(`${API}/super-admin/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch analytics when tab is selected
  useEffect(() => {
    if (activeTab === "analytics" && !analytics) {
      fetchAnalytics();
    }
    if (activeTab === "announcements" && announcements.length === 0) {
      fetchAnnouncements();
    }
    if (activeTab === "tickets" && tickets.length === 0) {
      fetchTickets();
    }
  }, [activeTab]);

  const fetchLegalPages = async () => {
    try {
      // Fetch all default legal pages
      const pages = {};
      for (const page of LEGAL_PAGES) {
        try {
          const response = await axios.get(`${API}/legal/${page.key}`);
          pages[page.key] = response.data.content;
          pages[page.enabledKey] = true; // Default enabled
        } catch (e) {
          pages[page.key] = "";
          pages[page.enabledKey] = false;
        }
      }
      setLegalPages(pages);
    } catch (error) {
      console.error("Failed to fetch legal pages:", error);
    }
  };

  // Announcements functions
  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/announcements`);
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
      alert("Please fill in title and content");
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/announcements`, announcementForm);
      fetchAnnouncements();
      setShowCreateAnnouncement(false);
      setAnnouncementForm({ title: "", content: "", type: "info", target: "all", expires_at: "" });
      alert("Announcement created!");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to create announcement");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await axios.delete(`${API}/super-admin/announcements/${id}`);
      fetchAnnouncements();
    } catch (error) {
      alert("Failed to delete announcement");
    }
  };

  // Support Tickets functions
  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/tickets?status=${ticketFilter}`);
      setTickets(response.data);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    }
  };

  const handleReplyToTicket = async () => {
    if (!ticketReply.trim()) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/tickets/${selectedTicket.id}/reply`, { message: ticketReply });
      setTicketReply("");
      fetchTickets();
      // Refresh selected ticket
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket({ ...updated, replies: [...(updated.replies || []), { message: ticketReply, from: "admin" }] });
    } catch (error) {
      alert("Failed to send reply");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await axios.post(`${API}/super-admin/tickets/${ticketId}/close`);
      fetchTickets();
      setSelectedTicket(null);
    } catch (error) {
      alert("Failed to close ticket");
    }
  };

  // Expiring subscriptions
  const fetchExpiringSubscriptions = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/expiring-subscriptions?days=${expiringDays}`);
      setExpiringSubscriptions(response.data);
    } catch (error) {
      console.error("Failed to fetch expiring subscriptions:", error);
    }
  };

  // Login as Shop (Impersonation)
  const handleLoginAsShop = async (tenantId) => {
    setActionLoading(true);
    try {
      const response = await axios.post(`${API}/super-admin/tenants/${tenantId}/impersonate`);
      const { token, tenant } = response.data;
      // Open in new tab with the impersonation token
      const url = `${window.location.origin}/dashboard?impersonate=${token}`;
      window.open(url, '_blank');
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to login as shop");
    } finally {
      setActionLoading(false);
    }
  };

  // Suspend/Unsuspend
  const handleSuspendShop = async () => {
    if (!suspendReason.trim()) {
      alert("Please provide a reason for suspension");
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/tenants/${selectedTenant.id}/suspend`, {
        reason: suspendReason,
        notify_admin: true
      });
      fetchData();
      fetchTenantDetails(selectedTenant.id);
      setShowSuspendModal(false);
      setSuspendReason("");
      alert("Shop suspended successfully");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to suspend shop");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspendShop = async (tenantId) => {
    if (!window.confirm("Are you sure you want to unsuspend this shop?")) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/tenants/${tenantId}/unsuspend`);
      fetchData();
      if (selectedTenant?.id === tenantId) {
        fetchTenantDetails(tenantId);
      }
      alert("Shop unsuspended successfully");
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to unsuspend shop");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateShop = async () => {
    if (!createShopForm.company_name || !createShopForm.subdomain || !createShopForm.admin_email || !createShopForm.admin_password) {
      alert("Please fill in all required fields");
      return;
    }
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/tenants`, createShopForm);
      fetchData();
      setShowCreateShop(false);
      setCreateShopForm({
        company_name: "",
        subdomain: "",
        admin_name: "",
        admin_email: "",
        admin_password: "",
        subscription_plan: "free",
        trial_days: 14
      });
      alert("Shop created successfully!");
    } catch (error) {
      console.error("Failed to create shop:", error);
      alert(error.response?.data?.detail || "Failed to create shop");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditLegalPage = (page) => {
    setEditingLegalPage(page);
    setLegalEditContent(legalPages[page.key] || "");
    setLegalEditEnabled(legalPages[page.enabledKey] !== false);
  };

  const handleSaveLegalPage = async () => {
    if (!editingLegalPage) return;
    setLegalSaving(true);
    try {
      // Save to global settings (we'll need a super admin endpoint for this)
      await axios.put(
        `${API}/super-admin/legal-pages/${editingLegalPage.key}`,
        { content: legalEditContent, is_enabled: legalEditEnabled }
      );
      await fetchLegalPages();
      setEditingLegalPage(null);
    } catch (error) {
      console.error("Failed to save legal page:", error);
      alert("Failed to save. Make sure the backend supports this endpoint.");
    } finally {
      setLegalSaving(false);
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

  // Plan Management Functions
  const handleCreatePlan = async () => {
    if (!planForm.id || !planForm.name) return;
    setActionLoading(true);
    try {
      await axios.post(`${API}/super-admin/plans`, planForm);
      fetchPlans();
      setShowCreatePlan(false);
      resetPlanForm();
    } catch (error) {
      console.error("Failed to create plan:", error);
      alert(error.response?.data?.detail || "Failed to create plan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    setActionLoading(true);
    try {
      const { id, tenant_count, created_at, is_default, ...updateData } = planForm;
      await axios.put(`${API}/super-admin/plans/${editingPlan.id}`, updateData);
      fetchPlans();
      setShowEditPlan(false);
      setEditingPlan(null);
      resetPlanForm();
    } catch (error) {
      console.error("Failed to update plan:", error);
      alert(error.response?.data?.detail || "Failed to update plan");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    setActionLoading(true);
    try {
      await axios.delete(`${API}/super-admin/plans/${planId}`);
      fetchPlans();
    } catch (error) {
      console.error("Failed to delete plan:", error);
      alert(error.response?.data?.detail || "Failed to delete plan");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      id: plan.id,
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      billing_cycle: plan.billing_cycle,
      duration_days: plan.duration_days,
      max_users: plan.max_users,
      max_branches: plan.max_branches,
      max_jobs_per_month: plan.max_jobs_per_month,
      max_inventory_items: plan.max_inventory_items,
      max_photos_per_job: plan.max_photos_per_job,
      max_storage_mb: plan.max_storage_mb,
      features: { ...DEFAULT_FEATURES, ...plan.features },
      sort_order: plan.sort_order,
      is_active: plan.is_active
    });
    setShowEditPlan(true);
  };

  const resetPlanForm = () => {
    setPlanForm({
      id: "",
      name: "",
      description: "",
      price: 0,
      billing_cycle: "monthly",
      duration_days: 30,
      max_users: 1,
      max_branches: 1,
      max_jobs_per_month: 100,
      max_inventory_items: 100,
      max_photos_per_job: 5,
      max_storage_mb: 500,
      features: { ...DEFAULT_FEATURES },
      sort_order: 99,
      is_active: true
    });
  };

  // Tenant action functions
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
        amount: parseFloat(paymentForm.amount),
        plan: paymentForm.plan === "none" ? "" : paymentForm.plan
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
    if (statusFilter === "trial") return matchesSearch && tenant.subscription_status === "trial";
    if (statusFilter === "paid") return matchesSearch && tenant.subscription_status === "paid";
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

  const formatLimit = (value) => {
    return value === -1 ? "Unlimited" : value.toLocaleString();
  };

  const getPlanIcon = (planId) => PLAN_ICONS[planId] || <Package className="w-4 h-4" />;
  const getPlanColor = (planId) => PLAN_COLORS[planId] || "bg-slate-600/20 text-slate-400 border-slate-600/30";

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
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-700 rounded-lg p-1 flex-wrap">
                <Button
                  variant={activeTab === "tenants" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("tenants")}
                  className={activeTab === "tenants" ? "bg-slate-600" : "text-slate-400"}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Shops
                </Button>
                <Button
                  variant={activeTab === "plans" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("plans")}
                  className={activeTab === "plans" ? "bg-slate-600" : "text-slate-400"}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Plans
                </Button>
                <Button
                  variant={activeTab === "analytics" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("analytics")}
                  className={activeTab === "analytics" ? "bg-slate-600" : "text-slate-400"}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
                <Button
                  variant={activeTab === "announcements" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("announcements")}
                  className={activeTab === "announcements" ? "bg-slate-600" : "text-slate-400"}
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Broadcast
                </Button>
                <Button
                  variant={activeTab === "tickets" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("tickets")}
                  className={activeTab === "tickets" ? "bg-slate-600" : "text-slate-400"}
                >
                  <Ticket className="w-4 h-4 mr-2" />
                  Tickets
                </Button>
                <Button
                  variant={activeTab === "settings" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("settings")}
                  className={activeTab === "settings" ? "bg-slate-600" : "text-slate-400"}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid - Only show on tenants tab */}
        {activeTab === "tenants" && (
          <>
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
          </>
        )}

        {/* Tenants Tab */}
        {activeTab === "tenants" && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-white">All Shops</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setShowCreateShop(true)}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="create-shop-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Shop
                  </Button>
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
                      <tr key={tenant.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="px-4 py-3">
                          <div 
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => handleViewTenant(tenant)}
                          >
                            <p className="font-medium text-white hover:text-blue-400">{tenant.company_name}</p>
                            <p className="text-sm text-slate-400">{tenant.subdomain}.aftersales.pro</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-300">{tenant.admin_email || "N/A"}</p>
                        </td>
                        <td className="px-4 py-3">
                          {tenant.is_active ? (
                            tenant.suspension_reason ? (
                              <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Suspended</Badge>
                            ) : (
                              <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Active</Badge>
                            )
                          ) : (
                            <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={getPlanColor(tenant.subscription_plan || "free")}>
                            <span className="mr-1">{getPlanIcon(tenant.subscription_plan || "free")}</span>
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
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-white hover:bg-slate-700"
                              onClick={() => handleViewTenant(tenant)}
                              data-testid={`view-tenant-${tenant.subdomain}`}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                              onClick={() => handleLoginAsShop(tenant.id)}
                              title="Login as Shop"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={
                                tenant.is_active
                                  ? "text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                  : "text-green-400 hover:text-green-300 hover:bg-green-900/30"
                              }
                              onClick={() => tenant.is_active ? handleToggleActive(tenant.id, tenant.is_active) : handleUnsuspendShop(tenant.id)}
                              data-testid={`toggle-tenant-${tenant.subdomain}`}
                              title={tenant.is_active ? "Deactivate" : "Activate"}
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
        )}

        {/* Plans Tab */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Subscription Plans</h2>
                <p className="text-slate-400">Manage subscription plans and their features</p>
              </div>
              <Button
                onClick={() => { resetPlanForm(); setShowCreatePlan(true); }}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="create-plan-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Plan
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card key={plan.id} className={`bg-slate-800 border-slate-700 ${!plan.is_active ? 'opacity-50' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge className={getPlanColor(plan.id)}>
                          {getPlanIcon(plan.id)}
                          <span className="ml-1">{plan.name}</span>
                        </Badge>
                        {plan.is_default && (
                          <Badge variant="outline" className="ml-2 text-xs">Default</Badge>
                        )}
                        {!plan.is_active && (
                          <Badge className="ml-2 bg-red-600/20 text-red-400">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditPlan(plan)}
                          className="text-slate-400 hover:text-white"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!plan.is_default && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-white">
                        {plan.price === 0 ? "Free" : formatCurrency(plan.price)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-slate-400 text-sm">/{plan.billing_cycle}</span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-3">
                      {/* Limits */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span>{formatLimit(plan.max_users)} users</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>{formatLimit(plan.max_branches)} branches</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <ClipboardList className="w-4 h-4 text-slate-500" />
                          <span>{formatLimit(plan.max_jobs_per_month)} jobs/mo</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Package className="w-4 h-4 text-slate-500" />
                          <span>{formatLimit(plan.max_inventory_items)} items</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Image className="w-4 h-4 text-slate-500" />
                          <span>{formatLimit(plan.max_photos_per_job)} photos/job</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <HardDrive className="w-4 h-4 text-slate-500" />
                          <span>{plan.max_storage_mb === -1 ? "Unlimited" : `${plan.max_storage_mb} MB`}</span>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="border-t border-slate-700 pt-3">
                        <p className="text-xs text-slate-500 mb-2">Features</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(plan.features || {}).filter(([_, v]) => v).slice(0, 6).map(([key]) => (
                            <Badge key={key} variant="outline" className="text-xs text-slate-400">
                              {FEATURE_LABELS[key] || key}
                            </Badge>
                          ))}
                          {Object.values(plan.features || {}).filter(v => v).length > 6 && (
                            <Badge variant="outline" className="text-xs text-slate-400">
                              +{Object.values(plan.features || {}).filter(v => v).length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Tenant count */}
                      <div className="border-t border-slate-700 pt-3 flex items-center justify-between">
                        <span className="text-sm text-slate-400">Active tenants</span>
                        <span className="text-white font-medium">{plan.tenant_count || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Analytics & Billing</h2>
                <p className="text-slate-400">Platform-wide revenue and performance metrics</p>
              </div>
              <Button
                onClick={fetchAnalytics}
                variant="outline"
                className="border-slate-600"
                disabled={analyticsLoading}
              >
                {analyticsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
            </div>

            {analyticsLoading && !analytics ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : analytics ? (
              <>
                {/* Revenue Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-600/30">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-600/30 rounded-xl flex items-center justify-center">
                          <IndianRupee className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-white">{formatCurrency(analytics.revenue?.total || 0)}</p>
                          <p className="text-sm text-green-400">Total Revenue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-600/30">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/30 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-white">{formatCurrency(analytics.revenue?.monthly || 0)}</p>
                          <p className="text-sm text-blue-400">This Month</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-600/30">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-white">{analytics.recent_payments?.length || 0}</p>
                          <p className="text-sm text-purple-400">Recent Payments</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue by Month Chart */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Revenue by Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-end gap-2">
                      {analytics.revenue?.by_month?.length > 0 ? (
                        analytics.revenue.by_month.map((month, index) => {
                          const maxRevenue = Math.max(...analytics.revenue.by_month.map(m => m.revenue));
                          const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                              <div 
                                className="w-full bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all hover:opacity-80"
                                style={{ height: `${Math.max(height, 5)}%` }}
                                title={`${month._id}: ${formatCurrency(month.revenue)}`}
                              />
                              <span className="text-xs text-slate-400 transform -rotate-45 origin-center">
                                {month._id?.substring(5) || ''}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          No revenue data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Plan Distribution */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <PieChart className="w-5 h-5" />
                        Plan Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.tenants?.plan_distribution?.map((item, index) => {
                          const total = analytics.tenants.plan_distribution.reduce((sum, i) => sum + i.count, 0);
                          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                          return (
                            <div key={index} className="flex items-center gap-3">
                              <Badge className={getPlanColor(item._id)}>
                                {getPlanIcon(item._id)}
                                <span className="ml-1">{item._id?.charAt(0).toUpperCase() + item._id?.slice(1)}</span>
                              </Badge>
                              <div className="flex-1 bg-slate-700 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-white font-medium w-12 text-right">{item.count}</span>
                              <span className="text-slate-400 text-sm w-12 text-right">{percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Mode Distribution */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Revenue by Payment Mode
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.revenue?.by_payment_mode?.length > 0 ? (
                          analytics.revenue.by_payment_mode.map((item, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-600/50 rounded-lg flex items-center justify-center">
                                  {item._id === 'upi' ? '📱' : item._id === 'cash' ? '💵' : item._id === 'card' ? '💳' : '🏦'}
                                </div>
                                <span className="text-white capitalize">{item._id || 'Other'}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-medium">{formatCurrency(item.total)}</p>
                                <p className="text-xs text-slate-400">{item.count} payments</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-center py-4">No payment data available</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Payments & Expiring Subscriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Payments */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Recent Payments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {analytics.recent_payments?.length > 0 ? (
                          analytics.recent_payments.map((payment, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                              <div>
                                <p className="text-white font-medium">{payment.company_name}</p>
                                <p className="text-xs text-slate-400">
                                  {payment.payment_mode?.charAt(0).toUpperCase() + payment.payment_mode?.slice(1)} • {formatDate(payment.created_at)}
                                </p>
                              </div>
                              <p className="text-green-400 font-medium">{formatCurrency(payment.amount)}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-center py-4">No recent payments</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expiring Subscriptions */}
                  <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        Expiring Soon (30 days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {analytics.tenants?.expiring_soon?.length > 0 ? (
                          analytics.tenants.expiring_soon.map((tenant, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                              <div>
                                <p className="text-white font-medium">{tenant.company_name}</p>
                                <p className="text-xs text-slate-400">{tenant.subdomain}.aftersales.pro</p>
                              </div>
                              <div className="text-right">
                                <Badge className={getPlanColor(tenant.subscription_plan)}>
                                  {tenant.subscription_plan}
                                </Badge>
                                <p className="text-xs text-yellow-400 mt-1">{formatDate(tenant.subscription_ends_at)}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-center py-4">No subscriptions expiring soon</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Tenants by Jobs */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Top Shops by Jobs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {analytics.tenants?.top_by_jobs?.slice(0, 5).map((tenant, index) => (
                        <div key={index} className="bg-slate-700/50 rounded-lg p-4 text-center">
                          <div className="w-12 h-12 bg-slate-600/50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-xl font-bold text-white">#{index + 1}</span>
                          </div>
                          <p className="text-white font-medium truncate">{tenant.company_name}</p>
                          <p className="text-xs text-slate-400 truncate">{tenant.subdomain}</p>
                          <p className="text-2xl font-bold text-blue-400 mt-2">{tenant.job_count}</p>
                          <p className="text-xs text-slate-400">jobs</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Click Refresh to load analytics data</p>
              </div>
            )}
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === "announcements" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Broadcast Announcements</h2>
                <p className="text-slate-400">Send announcements to all shops or specific groups</p>
              </div>
              <Button
                onClick={() => setShowCreateAnnouncement(true)}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="create-announcement-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </div>

            {/* Announcements List */}
            <div className="grid gap-4">
              {announcements.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <Megaphone className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400">No announcements yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first announcement to broadcast to shops</p>
                  </CardContent>
                </Card>
              ) : (
                announcements.map((announcement) => (
                  <Card key={announcement.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={
                              announcement.type === "warning" ? "bg-yellow-600/20 text-yellow-400" :
                              announcement.type === "error" ? "bg-red-600/20 text-red-400" :
                              announcement.type === "success" ? "bg-green-600/20 text-green-400" :
                              "bg-blue-600/20 text-blue-400"
                            }>
                              {announcement.type?.charAt(0).toUpperCase() + announcement.type?.slice(1)}
                            </Badge>
                            <Badge variant="outline" className="text-slate-400">
                              {announcement.target === "all" ? "All Shops" : announcement.target}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-medium text-white">{announcement.title}</h3>
                          <p className="text-slate-400 mt-1">{announcement.content}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                            <span>Created: {formatDate(announcement.created_at)}</span>
                            {announcement.expires_at && (
                              <span>Expires: {formatDate(announcement.expires_at)}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Support Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Support Tickets</h2>
                <p className="text-slate-400">Manage support requests from shops</p>
              </div>
              <div className="flex gap-2">
                <Select value={ticketFilter} onValueChange={(v) => { setTicketFilter(v); fetchTickets(); }}>
                  <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={fetchTickets} variant="outline" className="border-slate-600">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tickets List */}
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="py-12 text-center">
                      <Ticket className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                      <p className="text-slate-400">No support tickets</p>
                      <p className="text-sm text-slate-500 mt-1">Tickets from shops will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  tickets.map((ticket) => (
                    <Card 
                      key={ticket.id} 
                      className={`bg-slate-800 border-slate-700 cursor-pointer transition-all hover:border-slate-500 ${selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={
                                ticket.status === "closed" ? "bg-slate-600/20 text-slate-400" :
                                ticket.status === "in_progress" ? "bg-yellow-600/20 text-yellow-400" :
                                "bg-green-600/20 text-green-400"
                              }>
                                {ticket.status?.replace("_", " ").charAt(0).toUpperCase() + ticket.status?.replace("_", " ").slice(1)}
                              </Badge>
                              <span className="text-xs text-slate-500">{ticket.company_name}</span>
                            </div>
                            <h4 className="font-medium text-white">{ticket.subject}</h4>
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{ticket.message}</p>
                            <p className="text-xs text-slate-500 mt-2">{formatDate(ticket.created_at)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Selected Ticket Detail */}
              {selectedTicket && (
                <Card className="bg-slate-800 border-slate-700 h-fit sticky top-20">
                  <CardHeader className="border-b border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">{selectedTicket.subject}</CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          From: {selectedTicket.company_name} ({selectedTicket.subdomain}.aftersales.pro)
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTicket(null)}
                        className="text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Original Message */}
                    <div className="bg-slate-900/50 rounded-lg p-4">
                      <p className="text-slate-300">{selectedTicket.message}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatDate(selectedTicket.created_at)}</p>
                    </div>

                    {/* Replies */}
                    {selectedTicket.replies?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-slate-400">Replies</h4>
                        {selectedTicket.replies.map((reply, idx) => (
                          <div 
                            key={idx} 
                            className={`rounded-lg p-3 ${reply.from === "admin" ? "bg-blue-900/20 border border-blue-600/30 ml-4" : "bg-slate-700/50 mr-4"}`}
                          >
                            <p className="text-sm text-slate-300">{reply.message}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {reply.from === "admin" ? "Super Admin" : "Shop"} • {formatDate(reply.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    {selectedTicket.status !== "closed" && (
                      <div className="space-y-2">
                        <Textarea
                          value={ticketReply}
                          onChange={(e) => setTicketReply(e.target.value)}
                          placeholder="Type your reply..."
                          className="bg-slate-700 border-slate-600 min-h-[100px]"
                        />
                        <div className="flex justify-between">
                          <Button
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-900/30"
                            onClick={() => handleCloseTicket(selectedTicket.id)}
                          >
                            Close Ticket
                          </Button>
                          <Button
                            onClick={handleReplyToTicket}
                            disabled={actionLoading || !ticketReply.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                            Send Reply
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedTicket.status === "closed" && (
                      <div className="text-center py-4 text-slate-400">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        <p>This ticket has been closed</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
              <p className="text-slate-400">Manage global platform configuration</p>
            </div>

            {/* Legal Pages Section */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Legal & Compliance Pages
                </CardTitle>
                <p className="text-sm text-slate-400">
                  Manage default legal pages for all tenants. Individual shops can customize these in their settings.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LEGAL_PAGES.map((page) => {
                    const Icon = page.icon;
                    return (
                      <div
                        key={page.key}
                        className="bg-slate-700/50 rounded-lg p-4 flex items-start justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-slate-300" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white">{page.title}</h4>
                            <p className="text-xs text-slate-400 mt-1">
                              {legalPages[page.key] ? `${legalPages[page.key].length} characters` : "Not configured"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditLegalPage(page)}
                            className="border-slate-600"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <a
                            href={`/legal/${page.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="ghost" className="text-slate-400">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Public URLs Info */}
                <div className="mt-6 bg-slate-900/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-400 mb-2">Public URLs:</p>
                  <div className="flex flex-wrap gap-2">
                    {LEGAL_PAGES.map((page) => (
                      <a
                        key={page.key}
                        href={`/legal/${page.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full"
                      >
                        /legal/{page.key}
                      </a>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Info */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Platform Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-white">{plans.length}</p>
                    <p className="text-sm text-slate-400">Active Plans</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-white">{tenants.length}</p>
                    <p className="text-sm text-slate-400">Total Tenants</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
                    <p className="text-sm text-slate-400">Total Users</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-white">{stats?.total_jobs || 0}</p>
                    <p className="text-sm text-slate-400">Total Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Legal Page Edit Modal */}
      <Dialog open={!!editingLegalPage} onOpenChange={() => setEditingLegalPage(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingLegalPage && <editingLegalPage.icon className="w-5 h-5 text-red-500" />}
              Edit {editingLegalPage?.title}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="edit" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-slate-700 mb-4">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit" className="flex-1 overflow-hidden mt-0">
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <Label>Content (Markdown supported)</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-slate-400">Page Enabled</Label>
                    <Switch
                      checked={legalEditEnabled}
                      onCheckedChange={setLegalEditEnabled}
                    />
                  </div>
                </div>
                <Textarea
                  value={legalEditContent}
                  onChange={(e) => setLegalEditContent(e.target.value)}
                  className="flex-1 min-h-[400px] bg-slate-900 border-slate-600 font-mono text-sm resize-none"
                  placeholder="Enter page content in Markdown format..."
                />
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 overflow-auto mt-0">
              <div className="bg-slate-900 rounded-lg p-6 min-h-[400px] prose prose-invert prose-slate max-w-none prose-headings:text-white prose-h1:text-xl prose-h2:text-lg prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
                <ReactMarkdown>{legalEditContent}</ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button variant="ghost" onClick={() => setEditingLegalPage(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveLegalPage}
              disabled={legalSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {legalSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Plan Modal */}
      <Dialog open={showCreatePlan || showEditPlan} onOpenChange={() => { setShowCreatePlan(false); setShowEditPlan(false); setEditingPlan(null); }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan ID (slug)</Label>
                <Input
                  value={planForm.id}
                  onChange={(e) => setPlanForm({ ...planForm, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., starter, growth"
                  className="bg-slate-700 border-slate-600"
                  disabled={!!editingPlan}
                />
              </div>
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g., Starter Plan"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Brief description of this plan..."
                className="bg-slate-700 border-slate-600"
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select
                  value={planForm.billing_cycle}
                  onValueChange={(value) => setPlanForm({ ...planForm, billing_cycle: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forever">Forever (Free)</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  value={planForm.duration_days}
                  onChange={(e) => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) || 30 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            {/* Limits */}
            <div>
              <Label className="text-lg">Limits</Label>
              <p className="text-sm text-slate-400 mb-3">Set -1 for unlimited</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> Max Users
                  </Label>
                  <Input
                    type="number"
                    value={planForm.max_users}
                    onChange={(e) => setPlanForm({ ...planForm, max_users: parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Max Branches
                  </Label>
                  <Input
                    type="number"
                    value={planForm.max_branches}
                    onChange={(e) => setPlanForm({ ...planForm, max_branches: parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Jobs/Month
                  </Label>
                  <Input
                    type="number"
                    value={planForm.max_jobs_per_month}
                    onChange={(e) => setPlanForm({ ...planForm, max_jobs_per_month: parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4" /> Inventory Items
                  </Label>
                  <Input
                    type="number"
                    value={planForm.max_inventory_items}
                    onChange={(e) => setPlanForm({ ...planForm, max_inventory_items: parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" /> Photos/Job
                  </Label>
                  <Input
                    type="number"
                    value={planForm.max_photos_per_job}
                    onChange={(e) => setPlanForm({ ...planForm, max_photos_per_job: parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" /> Storage (MB)
                  </Label>
                  <Input
                    type="number"
                    value={planForm.max_storage_mb}
                    onChange={(e) => setPlanForm({ ...planForm, max_storage_mb: parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="text-lg">Features</Label>
              <p className="text-sm text-slate-400 mb-3">Toggle features available in this plan</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                    <Label className="cursor-pointer">{label}</Label>
                    <Switch
                      checked={planForm.features[key] || false}
                      onCheckedChange={(checked) => setPlanForm({
                        ...planForm,
                        features: { ...planForm.features, [key]: checked }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={planForm.sort_order}
                  onChange={(e) => setPlanForm({ ...planForm, sort_order: parseInt(e.target.value) || 99 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                <Label>Plan Active</Label>
                <Switch
                  checked={planForm.is_active}
                  onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowCreatePlan(false); setShowEditPlan(false); setEditingPlan(null); }}>
              Cancel
            </Button>
            <Button
              onClick={editingPlan ? handleUpdatePlan : handleCreatePlan}
              disabled={!planForm.id || !planForm.name || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingPlan ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tenant Details Modal */}
      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Store className="w-5 h-5" />
              {selectedTenant?.company_name}
              <Badge className={getPlanColor(tenantDetails?.tenant?.subscription_plan || "free")}>
                {getPlanIcon(tenantDetails?.tenant?.subscription_plan || "free")}
                <span className="ml-1">
                  {(tenantDetails?.tenant?.subscription_plan || "free").charAt(0).toUpperCase() + 
                   (tenantDetails?.tenant?.subscription_plan || "free").slice(1)}
                </span>
              </Badge>
              {tenantDetails?.tenant?.is_active ? (
                <Badge className="bg-green-600/20 text-green-400">Active</Badge>
              ) : (
                <Badge className="bg-red-600/20 text-red-400">Inactive</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : tenantDetails ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-slate-700">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="subscription">Billing</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="history">Logs</TabsTrigger>
              </TabsList>

              {/* Overview Tab - Enhanced */}
              <TabsContent value="overview" className="space-y-6 mt-4">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                    <p className="text-2xl font-bold">{tenantDetails.stats.total_jobs}</p>
                    <p className="text-xs text-slate-400">Total Jobs</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <Users className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <p className="text-2xl font-bold">{tenantDetails.users.length}</p>
                    <p className="text-xs text-slate-400">Team Members</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <Building2 className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                    <p className="text-2xl font-bold">{tenantDetails.branches.length}</p>
                    <p className="text-xs text-slate-400">Branches</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <Package className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                    <p className="text-2xl font-bold">{tenantDetails.stats.total_inventory || 0}</p>
                    <p className="text-xs text-slate-400">Inventory Items</p>
                  </div>
                </div>

                {/* Shop Info */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-700/30 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-400">Shop Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Subdomain</span>
                        <span className="font-medium">{tenantDetails.tenant.subdomain}.aftersales.pro</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Created</span>
                        <span className="font-medium">{formatDate(tenantDetails.tenant.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email</span>
                        <span className="font-medium">{tenantDetails.tenant.settings?.email || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone</span>
                        <span className="font-medium">{tenantDetails.tenant.settings?.phone || "-"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-700/30 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-400">Subscription Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Plan</span>
                        <Badge className={getPlanColor(tenantDetails.tenant.subscription_plan || "free")}>
                          {(tenantDetails.tenant.subscription_plan || "free").charAt(0).toUpperCase() + 
                           (tenantDetails.tenant.subscription_plan || "free").slice(1)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status</span>
                        <Badge className={tenantDetails.tenant.subscription_status === "paid" ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"}>
                          {tenantDetails.tenant.subscription_status === "paid" ? "Paid" : "Trial"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{tenantDetails.tenant.subscription_status === "paid" ? "Expires" : "Trial Ends"}</span>
                        <span className="font-medium">
                          {tenantDetails.tenant.subscription_status === "paid"
                            ? formatDate(tenantDetails.tenant.subscription_ends_at)
                            : formatDate(tenantDetails.tenant.trial_ends_at)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Payments</span>
                        <span className="font-medium text-green-400">
                          {formatCurrency(tenantDetails.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Branches List */}
                <Card className="bg-slate-700/30 border-slate-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400 flex items-center justify-between">
                      <span>Branches</span>
                      <Badge variant="outline">{tenantDetails.branches.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                      {tenantDetails.branches.map((branch) => (
                        <div key={branch.id} className="bg-slate-600/30 rounded-lg p-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-medium text-sm">{branch.name}</p>
                            {branch.address && <p className="text-xs text-slate-400">{branch.address}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  <Button
                    variant={tenantDetails.tenant.is_active ? "destructive" : "default"}
                    onClick={() => handleToggleActive(tenantDetails.tenant.id, tenantDetails.tenant.is_active)}
                    disabled={actionLoading}
                    className={!tenantDetails.tenant.is_active ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Power className="w-4 h-4 mr-2" />}
                    {tenantDetails.tenant.is_active ? "Deactivate Shop" : "Activate Shop"}
                  </Button>
                  <Button onClick={() => setShowAssignPlan(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Crown className="w-4 h-4 mr-2" />
                    Change Plan
                  </Button>
                  <Button variant="outline" onClick={() => setShowExtendValidity(true)} className="border-slate-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Extend Validity
                  </Button>
                </div>
              </TabsContent>

              {/* Settings Tab - NEW */}
              <TabsContent value="settings" className="space-y-6 mt-4">
                <Card className="bg-slate-700/30 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Shop Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input
                          value={tenantDetails.tenant.company_name}
                          disabled
                          className="bg-slate-600/50 border-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subdomain</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            value={tenantDetails.tenant.subdomain}
                            disabled
                            className="bg-slate-600/50 border-slate-500"
                          />
                          <span className="text-slate-400 text-sm">.aftersales.pro</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Contact Email</Label>
                        <Input
                          value={tenantDetails.tenant.settings?.email || ""}
                          disabled
                          className="bg-slate-600/50 border-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Phone</Label>
                        <Input
                          value={tenantDetails.tenant.settings?.phone || ""}
                          disabled
                          className="bg-slate-600/50 border-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea
                        value={tenantDetails.tenant.settings?.address || ""}
                        disabled
                        className="bg-slate-600/50 border-slate-500"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Theme</Label>
                        <Input
                          value={tenantDetails.tenant.settings?.theme || "light"}
                          disabled
                          className="bg-slate-600/50 border-slate-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Language</Label>
                        <Input
                          value={tenantDetails.tenant.settings?.language || "en"}
                          disabled
                          className="bg-slate-600/50 border-slate-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Footer Text (for receipts)</Label>
                      <Input
                        value={tenantDetails.tenant.settings?.footer_text || ""}
                        disabled
                        className="bg-slate-600/50 border-slate-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Limits & Usage */}
                <Card className="bg-slate-700/30 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-sm text-white flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Plan Limits & Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const currentPlan = plans.find(p => p.id === (tenantDetails.tenant.subscription_plan || "free"));
                      if (!currentPlan) return <p className="text-slate-400">No plan limits configured</p>;
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-600/30 rounded-lg p-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-slate-400">Users</span>
                              <span className="text-sm">{tenantDetails.users.length} / {currentPlan.max_users}</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${Math.min((tenantDetails.users.length / currentPlan.max_users) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-slate-600/30 rounded-lg p-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-slate-400">Branches</span>
                              <span className="text-sm">{tenantDetails.branches.length} / {currentPlan.max_branches}</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className="bg-purple-500 h-2 rounded-full" 
                                style={{ width: `${Math.min((tenantDetails.branches.length / currentPlan.max_branches) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-slate-600/30 rounded-lg p-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-slate-400">Jobs/Month</span>
                              <span className="text-sm">{tenantDetails.stats.this_month_jobs || 0} / {currentPlan.max_jobs_per_month}</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(((tenantDetails.stats.this_month_jobs || 0) / currentPlan.max_jobs_per_month) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-slate-600/30 rounded-lg p-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm text-slate-400">Inventory Items</span>
                              <span className="text-sm">{tenantDetails.stats.total_inventory || 0} / {currentPlan.max_inventory_items}</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                              <div 
                                className="bg-yellow-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(((tenantDetails.stats.total_inventory || 0) / currentPlan.max_inventory_items) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Tab - NEW */}
              <TabsContent value="team" className="space-y-6 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Team Members</h3>
                    <p className="text-sm text-slate-400">{tenantDetails.users.length} member(s) in this shop</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {tenantDetails.users.map((user) => (
                    <Card key={user.id} className="bg-slate-700/30 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-600/50 rounded-full flex items-center justify-center">
                              <span className="text-lg font-medium">{user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-medium">{user.name || "No name"}</p>
                              <p className="text-sm text-slate-400">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={user.role === "admin" ? "bg-purple-600/20 text-purple-400" : "bg-blue-600/20 text-blue-400"}>
                              {user.role === "admin" ? <Crown className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-600 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-slate-400">Branch: </span>
                            <span>{tenantDetails.branches.find(b => b.id === user.branch_id)?.name || "All Branches"}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Created: </span>
                            <span>{formatDate(user.created_at)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">ID: </span>
                            <span className="font-mono text-xs">{user.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Subscription/Billing Tab */}
              <TabsContent value="subscription" className="space-y-6 mt-4">
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-slate-400">Current Plan</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getPlanColor(tenantDetails.tenant.subscription_plan || "free")} text-lg px-3 py-1`}>
                          {getPlanIcon(tenantDetails.tenant.subscription_plan || "free")}
                          <span className="ml-2">
                            {plans.find(p => p.id === (tenantDetails.tenant.subscription_plan || "free"))?.name || "Free"}
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
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  <Button onClick={() => setShowAssignPlan(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Crown className="w-4 h-4 mr-2" />
                    Assign Plan
                  </Button>
                  <Button variant="outline" onClick={() => setShowExtendValidity(true)} className="border-slate-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    Extend Validity
                  </Button>
                  <Button variant="outline" onClick={() => setShowRecordPayment(true)} className="border-slate-600">
                    <IndianRupee className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-400">Payment History</p>
                  <Button size="sm" onClick={() => setShowRecordPayment(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Record Payment
                  </Button>
                </div>
                
                {tenantDetails.payments && tenantDetails.payments.length > 0 ? (
                  <div className="space-y-2">
                    {tenantDetails.payments.map((payment) => (
                      <div key={payment.id} className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
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
                            <Badge className={getPlanColor(payment.plan)}>
                              {payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)}
                            </Badge>
                          )}
                          <p className="text-xs text-slate-400 mt-1">{formatDate(payment.created_at)}</p>
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
                      <div key={log.id} className="bg-slate-700/30 rounded-lg p-3 flex items-start gap-3">
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
                  {plans.filter(p => p.is_active).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center gap-2">
                        {getPlanIcon(plan.id)}
                        <span>{plan.name}</span>
                        <span className="text-slate-400">
                          {plan.price === 0 ? "(Free)" : `(${formatCurrency(plan.price)}/${plan.billing_cycle})`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignPlanForm.plan && plans.find(p => p.id === assignPlanForm.plan)?.price > 0 && (
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
            <Button variant="ghost" onClick={() => setShowAssignPlan(false)}>Cancel</Button>
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
            <Button variant="ghost" onClick={() => setShowExtendValidity(false)}>Cancel</Button>
            <Button onClick={handleExtendValidity} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700">
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
                    {plans.filter(p => p.is_active && p.price > 0).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} ({formatCurrency(plan.price)}/{plan.billing_cycle})
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
            <Button variant="ghost" onClick={() => setShowRecordPayment(false)}>Cancel</Button>
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

      {/* Create Shop Modal */}
      <Dialog open={showCreateShop} onOpenChange={setShowCreateShop}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-green-500" />
              Create New Shop
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={createShopForm.company_name}
                  onChange={(e) => setCreateShopForm({ ...createShopForm, company_name: e.target.value })}
                  placeholder="ABC Repairs"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label>Subdomain *</Label>
                <div className="flex items-center gap-1">
                  <Input
                    value={createShopForm.subdomain}
                    onChange={(e) => setCreateShopForm({ ...createShopForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    placeholder="abcrepairs"
                    className="bg-slate-700 border-slate-600"
                  />
                  <span className="text-slate-400 text-sm whitespace-nowrap">.aftersales.pro</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Admin Name *</Label>
                <Input
                  value={createShopForm.admin_name}
                  onChange={(e) => setCreateShopForm({ ...createShopForm, admin_name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label>Admin Email *</Label>
                <Input
                  type="email"
                  value={createShopForm.admin_email}
                  onChange={(e) => setCreateShopForm({ ...createShopForm, admin_email: e.target.value })}
                  placeholder="admin@example.com"
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Admin Password *</Label>
              <Input
                type="password"
                value={createShopForm.admin_password}
                onChange={(e) => setCreateShopForm({ ...createShopForm, admin_password: e.target.value })}
                placeholder="Secure password"
                className="bg-slate-700 border-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select
                  value={createShopForm.subscription_plan}
                  onValueChange={(value) => setCreateShopForm({ ...createShopForm, subscription_plan: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.is_active).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.price === 0 ? "Free" : formatCurrency(plan.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trial Days</Label>
                <Input
                  type="number"
                  value={createShopForm.trial_days}
                  onChange={(e) => setCreateShopForm({ ...createShopForm, trial_days: parseInt(e.target.value) || 14 })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateShop(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateShop}
              disabled={!createShopForm.company_name || !createShopForm.subdomain || !createShopForm.admin_email || !createShopForm.admin_password || actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Shop
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Announcement Modal */}
      <Dialog open={showCreateAnnouncement} onOpenChange={setShowCreateAnnouncement}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-500" />
              Create Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                placeholder="Announcement title"
                className="bg-slate-700 border-slate-600"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                placeholder="Write your announcement..."
                className="bg-slate-700 border-slate-600 min-h-[120px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={announcementForm.type}
                  onValueChange={(value) => setAnnouncementForm({ ...announcementForm, type: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target</Label>
                <Select
                  value={announcementForm.target}
                  onValueChange={(value) => setAnnouncementForm({ ...announcementForm, target: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    <SelectItem value="paid">Paid Only</SelectItem>
                    <SelectItem value="trial">Trial Only</SelectItem>
                    <SelectItem value="free">Free Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <Input
                type="date"
                value={announcementForm.expires_at}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, expires_at: e.target.value })}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateAnnouncement(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateAnnouncement}
              disabled={!announcementForm.title || !announcementForm.content || actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Broadcast
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Shop Modal */}
      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Ban className="w-5 h-5" />
              Suspend Shop
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                This will immediately suspend <strong>{selectedTenant?.company_name}</strong>. 
                The shop will lose access to all features until unsuspended.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Reason for Suspension *</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this shop..."
                className="bg-slate-700 border-slate-600 min-h-[100px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setShowSuspendModal(false); setSuspendReason(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspendShop}
              disabled={!suspendReason.trim() || actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
              Suspend Shop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
