import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  CreditCard,
  Check,
  AlertTriangle,
  Download,
  Clock,
  Crown,
  Sparkles,
  Receipt,
  Building2,
  Calendar,
  ArrowRight,
  RefreshCw,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Billing() {
  const { t } = useTranslation();
  const { token, tenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showGstDialog, setShowGstDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [gstForm, setGstForm] = useState({ gstin: "", billing_address: "" });

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true);
      const [billingRes, plansRes] = await Promise.all([
        axios.get(`${API}/billing/current`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/billing/plans`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setBillingData(billingRes.data);
      setPlans(plansRes.data);
      setGstForm({
        gstin: billingRes.data.tenant?.gstin || "",
        billing_address: billingRes.data.tenant?.billing_address || "",
      });
    } catch (error) {
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan) => {
    setProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      // Create subscription
      const response = await axios.post(
        `${API}/billing/create-subscription`,
        { plan_id: plan.id, billing_cycle: billingCycle },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = response.data;

      if (!data.razorpay_key_id) {
        toast.error("Payment gateway not configured. Please contact support.");
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: data.razorpay_key_id,
        subscription_id: data.razorpay_subscription_id,
        name: data.name,
        description: data.description,
        prefill: data.prefill,
        theme: { color: "#6366f1" },
        handler: async (response) => {
          try {
            await axios.post(
              `${API}/billing/verify-payment`,
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Subscription activated successfully!");
            setShowUpgradeDialog(false);
            fetchBillingData();
          } catch (error) {
            toast.error("Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            toast.info("Payment cancelled");
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create subscription");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.")) {
      return;
    }

    try {
      await axios.post(
        `${API}/billing/cancel-subscription`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Subscription cancelled. Access retained until period end.");
      fetchBillingData();
    } catch (error) {
      toast.error("Failed to cancel subscription");
    }
  };

  const handleUpdateGst = async () => {
    try {
      await axios.post(
        `${API}/billing/update-gstin`,
        gstForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Billing details updated");
      setShowGstDialog(false);
      fetchBillingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update billing details");
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/billing/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "trial":
        return <Badge className="bg-blue-500">Trial</Badge>;
      case "free":
        return <Badge variant="secondary">Free</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanPrice = (plan) => {
    if (plan.price === 0) return "Free";
    if (billingCycle === "yearly") {
      return `₹${(plan.price * 12 * 0.8).toLocaleString()}/year`;
    }
    return `₹${plan.price.toLocaleString()}/month`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const subscription = billingData?.subscription;
  const currentPlan = billingData?.plan;
  const usage = billingData?.plan_usage;

  return (
    <Layout>
      <div className="space-y-6 animate-in" data-testid="billing-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground">Manage your subscription and view invoices</p>
          </div>
          <Button variant="outline" onClick={() => setShowGstDialog(true)}>
            <Building2 className="w-4 h-4 mr-2" />
            Update GST Details
          </Button>
        </div>

        {/* Subscription Warning */}
        {subscription?.is_expired && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Subscription Expired</h3>
                <p className="text-sm text-muted-foreground">
                  Your subscription has expired. Please upgrade to continue using all features.
                </p>
              </div>
              <Button onClick={() => setShowUpgradeDialog(true)}>Upgrade Now</Button>
            </CardContent>
          </Card>
        )}

        {subscription?.status === "trial" && subscription?.days_remaining <= 7 && (
          <Card className="border-yellow-500 bg-yellow-500/10">
            <CardContent className="flex items-center gap-4 py-4">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-700">Trial Ending Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Your trial ends in {subscription.days_remaining} days. Upgrade to keep all your data.
                </p>
              </div>
              <Button onClick={() => setShowUpgradeDialog(true)}>Upgrade Now</Button>
            </CardContent>
          </Card>
        )}

        {/* Current Plan Card */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{subscription?.plan_name || "Free"}</h3>
                  <p className="text-muted-foreground">
                    {subscription?.plan_price > 0
                      ? `₹${subscription.plan_price}/month`
                      : "Free Forever"}
                  </p>
                </div>
                {getStatusBadge(subscription?.status)}
              </div>

              {subscription?.ends_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {subscription.status === "trial" ? "Trial" : "Subscription"} ends:{" "}
                    {new Date(subscription.ends_at).toLocaleDateString()}
                  </span>
                  {subscription.days_remaining !== null && (
                    <Badge variant="outline">{subscription.days_remaining} days left</Badge>
                  )}
                </div>
              )}

              {subscription?.auto_renew && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <RefreshCw className="w-4 h-4" />
                  <span>Auto-renewal enabled</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={() => setShowUpgradeDialog(true)} className="flex-1">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {subscription?.plan_price > 0 ? "Change Plan" : "Upgrade"}
                </Button>
                {subscription?.razorpay_subscription_id && subscription?.auto_renew && (
                  <Button variant="outline" onClick={handleCancelSubscription}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Usage This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {usage && (
                <>
                  <UsageBar
                    label="Jobs"
                    used={usage.jobs?.used || 0}
                    limit={usage.jobs?.limit}
                    unlimited={usage.jobs?.unlimited}
                  />
                  <UsageBar
                    label="Team Members"
                    used={usage.users?.used || 0}
                    limit={usage.users?.limit}
                    unlimited={usage.users?.unlimited}
                  />
                  <UsageBar
                    label="Branches"
                    used={usage.branches?.used || 0}
                    limit={usage.branches?.limit}
                    unlimited={usage.branches?.unlimited}
                  />
                  <UsageBar
                    label="Inventory Items"
                    used={usage.inventory?.used || 0}
                    limit={usage.inventory?.limit}
                    unlimited={usage.inventory?.unlimited}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Recent Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingData?.recent_invoices?.length > 0 ? (
              <div className="space-y-2">
                {billingData.recent_invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <Receipt className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.plan_name} - {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">₹{invoice.total_amount.toLocaleString()}</p>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadInvoice(invoice.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No invoices yet</p>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choose Your Plan</DialogTitle>
              <DialogDescription>
                Select a plan that fits your business needs
              </DialogDescription>
            </DialogHeader>

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center mb-6">
              <Tabs value={billingCycle} onValueChange={setBillingCycle} className="w-auto">
                <TabsList>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="yearly">
                    Yearly <Badge className="ml-2 bg-green-500">Save 20%</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative cursor-pointer transition-all ${
                    selectedPlan?.id === plan.id
                      ? "ring-2 ring-primary"
                      : "hover:border-primary/50"
                  } ${plan.is_current ? "border-primary" : ""}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  {plan.is_popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}
                  {plan.is_current && (
                    <div className="absolute -top-3 right-4">
                      <Badge variant="outline">Current</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-2xl font-bold">
                      {getPlanPrice(plan)}
                    </div>
                    {billingCycle === "yearly" && plan.yearly_savings > 0 && (
                      <p className="text-sm text-green-600">
                        Save ₹{plan.yearly_savings.toLocaleString()}/year
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {plan.max_users === -1 ? "Unlimited" : plan.max_users} users
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {plan.max_branches === -1 ? "Unlimited" : plan.max_branches} branches
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {plan.max_jobs_per_month === -1
                        ? "Unlimited"
                        : plan.max_jobs_per_month}{" "}
                      jobs/month
                    </div>
                    {plan.features?.slice(0, 3).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        {feature}
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={plan.is_current ? "outline" : "default"}
                      disabled={plan.is_current || processing}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (plan.price === 0) {
                          toast.info("You're already on the free plan");
                        } else {
                          handleSubscribe(plan);
                        }
                      }}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : plan.is_current ? (
                        "Current Plan"
                      ) : plan.price === 0 ? (
                        "Free"
                      ) : (
                        <>
                          Subscribe <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* GST Dialog */}
        <Dialog open={showGstDialog} onOpenChange={setShowGstDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update GST Details</DialogTitle>
              <DialogDescription>
                Add your GSTIN for GST-compliant invoices
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input
                  placeholder="22AAAAA0000A1Z5"
                  value={gstForm.gstin}
                  onChange={(e) =>
                    setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })
                  }
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground">
                  15-character GST Identification Number
                </p>
              </div>
              <div className="space-y-2">
                <Label>Billing Address</Label>
                <Input
                  placeholder="Full billing address"
                  value={gstForm.billing_address}
                  onChange={(e) =>
                    setGstForm({ ...gstForm, billing_address: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGstDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateGst}>Save Details</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Usage Bar Component
function UsageBar({ label, used, limit, unlimited }) {
  const percentage = unlimited || limit === -1 ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage > 80;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isNearLimit ? "text-destructive font-medium" : "text-muted-foreground"}>
          {used} / {unlimited || limit === -1 ? "∞" : limit}
        </span>
      </div>
      {!unlimited && limit !== -1 && (
        <Progress
          value={percentage}
          className={isNearLimit ? "[&>div]:bg-destructive" : ""}
        />
      )}
    </div>
  );
}
